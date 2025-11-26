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
} from './utils/file-signature.util';
import { SUPPORTED_DOCUMENT_MIME_SET } from './documents.constants';
import { UploadedDocumentFile } from './interfaces/uploaded-document-file.interface';
import { WebArticleParserService } from './parsers/web-article-parser.service';
import { PdfDocumentParserService } from './parsers/pdf-document-parser.service';
import { WordDocumentParserService } from './parsers/word-document-parser.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly cosClient?: COS;
  private readonly bucket?: string;
  private readonly region?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly webArticleParser: WebArticleParserService,
    private readonly pdfDocumentParser: PdfDocumentParserService,
    private readonly wordDocumentParser: WordDocumentParserService,
  ) {
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
    const objectKey = `${normalizedFolder}/${Date.now()}-${randomUUID()}${this.getExtensionByType(detectedType)}`;

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

  async parseWebArticle(url: string) {
    const result = await this.webArticleParser.parse(url);
    return result;
  }

  async parsePdfDocument(file: UploadedDocumentFile) {
    if (!file) {
      throw new BadRequestException('请上传需要解析的 PDF 文档');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('文件内容为空，无法解析');
    }
    const detectedType = detectDocumentType(file.buffer);
    if (detectedType !== DocumentFileType.PDF) {
      throw new BadRequestException('仅支持标准 PDF 文档解析');
    }
    return this.pdfDocumentParser.parse(file);
  }

  async parseWordDocument(file: UploadedDocumentFile) {
    if (!file) {
      throw new BadRequestException('请上传需要解析的 Word 文档');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('文件内容为空，无法解析');
    }
    const detectedType = detectDocumentType(file.buffer);
    if (
      detectedType !== DocumentFileType.DOC &&
      detectedType !== DocumentFileType.DOCX
    ) {
      throw new BadRequestException('仅支持 .doc/.docx 文档解析');
    }
    return this.wordDocumentParser.parse(file);
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
          if (err) {
            this.logger.error('COS getObjectUrl 失败', err);
            return reject(
              new InternalServerErrorException('生成下载链接失败，请稍后再试'),
            );
          }
          return resolve(data?.Url ?? '');
        },
      );
    });
  }

}
