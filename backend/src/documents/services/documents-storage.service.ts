import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import COS from 'cos-nodejs-sdk-v5';
import {
  detectDocumentType,
  DocumentFileType,
} from '../utils/file-signature.util';
import { SUPPORTED_DOCUMENT_MIME_SET } from '../documents.constants';
import { UploadedDocumentFile } from '../interfaces/uploaded-document-file.interface';

@Injectable()
export class DocumentsStorageService {
  private readonly logger = new Logger(DocumentsStorageService.name);
  private readonly cosClient?: COS;
  private readonly bucket?: string;
  private readonly region?: string;

  constructor(private readonly configService: ConfigService) {
    const secretId = this.configService.get<string>('COS_SECRET_ID');
    const secretKey = this.configService.get<string>('COS_SECRET_KEY');
    this.bucket = this.configService.get<string>('COS_BUCKET');
    this.region = this.configService.get<string>('COS_REGION');

    if (secretId && secretKey && this.bucket && this.region) {
      this.cosClient = new COS({ SecretId: secretId, SecretKey: secretKey });
    } else {
      this.logger.warn('COS 配置缺失，文档上传/下载接口将不可用');
    }
  }

  async uploadDocument(file: UploadedDocumentFile, folder?: string) {
    if (!file) {
      throw new BadRequestException('请提供需要上传的文件');
    }

    this.ensureCosClient();
    this.validateMimeType(file.mimetype);

    const detectedType = detectDocumentType(file.buffer);
    if (!detectedType) {
      throw new BadRequestException('文件格式无效，仅支持 PDF 或 Word 文档');
    }

    this.ensureMimeMatchesContent(file.mimetype, detectedType);

    const normalizedFolder = this.normalizeFolder(folder);
    const objectKey = `${normalizedFolder}/${Date.now()}-${randomUUID()}${this.getExtensionByType(
      detectedType,
    )}`;

    await this.putObject(objectKey, file);
    const url = await this.createSignedUrl(objectKey);

    return {
      key: objectKey,
      url,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async getDownloadUrl(key: string, expiresIn?: number) {
    if (!key) {
      throw new BadRequestException('缺少文档 Key');
    }
    this.ensureCosClient();
    const url = await this.createSignedUrl(key, expiresIn);
    return { key, url };
  }

  async deleteObject(keyOrUrl: string) {
    if (!keyOrUrl) {
      return;
    }
    this.ensureCosClient();
    const key = this.extractObjectKey(keyOrUrl);
    if (!key) {
      this.logger.warn(`无法解析 COS 对象 Key: ${keyOrUrl}`);
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.cosClient?.deleteObject(
        {
          Bucket: this.bucket!,
          Region: this.region!,
          Key: key,
        },
        (err) => {
          if (err) {
            this.logger.error('COS deleteObject 失败', err);
            return reject(
              new InternalServerErrorException('删除 COS 对象失败，请稍后重试'),
            );
          }
          return resolve();
        },
      );
    });
  }

  private ensureCosClient() {
    if (!this.cosClient || !this.bucket || !this.region) {
      throw new InternalServerErrorException('COS 配置缺失，无法执行该操作');
    }
  }

  private validateMimeType(mimeType: string) {
    if (!SUPPORTED_DOCUMENT_MIME_SET.has(mimeType)) {
      throw new BadRequestException('仅支持 PDF 或 Word 文档上传');
    }
  }

  private ensureMimeMatchesContent(mimeType: string, type: DocumentFileType) {
    const mapping: Record<string, DocumentFileType> = {
      'application/pdf': DocumentFileType.PDF,
      'application/msword': DocumentFileType.DOC,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        DocumentFileType.DOCX,
    };

    if (mapping[mimeType] !== type) {
      throw new BadRequestException('文件扩展名或 MIME 类型与内容不匹配');
    }
  }

  private normalizeFolder(folder?: string) {
    const fallback = 'documents';
    if (!folder) {
      return fallback;
    }
    const sanitized = folder
      .replace(/\\/g, '/')
      .replace(/\.\./g, '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .trim();

    return sanitized || fallback;
  }

  private getExtensionByType(type: DocumentFileType) {
    switch (type) {
      case DocumentFileType.PDF:
        return '.pdf';
      case DocumentFileType.DOC:
        return '.doc';
      case DocumentFileType.DOCX:
        return '.docx';
      default:
        return '';
    }
  }

  private async putObject(key: string, file: UploadedDocumentFile) {
    return new Promise<void>((resolve, reject) => {
      this.cosClient?.putObject(
        {
          Bucket: this.bucket!,
          Region: this.region!,
          Key: key,
          Body: file.buffer,
          ContentLength: file.size,
          ContentType: file.mimetype,
        },
        (err) => {
          if (err) {
            this.logger.error('COS putObject 失败', err);
            return reject(
              new InternalServerErrorException('上传失败，请稍后重试'),
            );
          }
          return resolve();
        },
      );
    });
  }

  private async createSignedUrl(key: string, expiresIn = 3600) {
    return new Promise<string>((resolve, reject) => {
      this.cosClient?.getObjectUrl(
        {
          Bucket: this.bucket!,
          Region: this.region!,
          Key: key,
          Sign: true,
          Expires: expiresIn,
        },
        (err, data) => {
          if (err || !data?.Url) {
            this.logger.error('COS getObjectUrl 失败', err);
            return reject(
              new InternalServerErrorException('生成下载链接失败，请稍后重试'),
            );
          }
          return resolve(data.Url);
        },
      );
    });
  }

  private extractObjectKey(input: string) {
    if (!input) {
      return null;
    }
    if (!input.includes('://')) {
      return input.replace(/^\/+/, '');
    }
    try {
      const parsed = new URL(input);
      return parsed.pathname.replace(/^\/+/, '');
    } catch {
      return null;
    }
  }
}
