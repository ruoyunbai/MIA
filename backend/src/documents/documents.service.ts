import { BadRequestException, Injectable, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { DocumentsStorageService } from './services/documents-storage.service';
import { DocumentsParsingService } from './services/documents-parsing.service';
import { UploadedDocumentFile } from './interfaces/uploaded-document-file.interface';
import { DocumentIngestionService } from './services/document-ingestion.service';
import { IngestUploadedDocumentDto } from './dto/ingest-uploaded-document.dto';
import { IngestWebArticleDto } from './dto/ingest-web-article.dto';
import { DocumentIngestionQueueService } from './services/document-ingestion-queue.service';
import { DocumentIngestionEventsService } from './services/document-ingestion-events.service';
import { SearchDocumentsDto } from './dto/search-documents.dto';
import {
  detectDocumentType,
  DocumentFileType,
} from './utils/file-signature.util';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly storageService: DocumentsStorageService,
    private readonly parsingService: DocumentsParsingService,
    private readonly ingestionService: DocumentIngestionService,
    private readonly ingestionQueue: DocumentIngestionQueueService,
    private readonly ingestionEvents: DocumentIngestionEventsService,
  ) {}

  uploadDocument(file: UploadedDocumentFile, folder?: string) {
    return this.storageService.uploadDocument(file, folder);
  }

  getDownloadUrl(key: string, expiresIn?: number) {
    return this.storageService.getDownloadUrl(key, expiresIn);
  }

  parseWebArticle(url: string) {
    return this.parsingService.parseWebArticle(url);
  }

  parsePdfDocument(file: UploadedDocumentFile) {
    return this.parsingService.parsePdfDocument(file);
  }

  parseWordDocument(file: UploadedDocumentFile) {
    return this.parsingService.parseWordDocument(file);
  }

  async ingestUploadedDocument(
    file: UploadedDocumentFile,
    payload: IngestUploadedDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('请上传需要解析的文档文件');
    }
    const parsed = await this.parseUploadedFile(file);
    const title =
      payload.title?.trim() || parsed.metadata.title || '未命名文档';
    return this.ingestionService.ingestParsedDocument({
      parsed,
      title,
      categoryId: payload.categoryId,
      userId: payload.userId,
      chunkStrategy: payload.chunkStrategy,
      chunkSize: payload.chunkSize,
      chunkOverlap: payload.chunkOverlap,
      paragraphMinLength: payload.paragraphMinLength,
      slidingWindowStep: payload.slidingWindowStep,
      slidingWindowSize: payload.slidingWindowSize,
      previewQuery: payload.previewQuery?.trim(),
      metaInfo: {
        ...parsed.metadata,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
      },
    });
  }

  async ingestWebArticle(payload: IngestWebArticleDto) {
    const normalizedUrl = payload.url.trim();
    const parsed = await this.parsingService.parseWebArticle(normalizedUrl);
    const prepared = await this.ingestionService.prepareDocumentIngestion({
      parsed,
      title: payload.title,
      categoryId: payload.categoryId,
      userId: payload.userId,
      chunkStrategy: payload.chunkStrategy,
      chunkSize: payload.chunkSize,
      chunkOverlap: payload.chunkOverlap,
      paragraphMinLength: payload.paragraphMinLength,
      slidingWindowStep: payload.slidingWindowStep,
      slidingWindowSize: payload.slidingWindowSize,
      previewQuery: payload.previewQuery?.trim(),
      metaInfo: {
        ...parsed.metadata,
        sourceUrl: normalizedUrl,
        origin: 'web-article',
      },
    });
    const job = this.ingestionQueue.enqueue(prepared);
    return {
      documentId: job.documentId,
      jobId: job.jobId,
      queuePosition: job.queuePosition,
      status: job.status,
    };
  }

  getDocumentIngestionStatus(documentId: number) {
    return this.ingestionService.getDocumentIngestionStatus(documentId);
  }

  ingestionEventStream(documentId?: number): Observable<MessageEvent> {
    return this.ingestionEvents.stream(documentId);
  }

  searchDocuments(payload: SearchDocumentsDto) {
    return this.ingestionService.searchDocumentVectors(
      payload.query,
      payload.limit,
    );
  }

  private async parseUploadedFile(file: UploadedDocumentFile) {
    const detectedType = detectDocumentType(file.buffer);
    if (detectedType === DocumentFileType.PDF) {
      return this.parsingService.parsePdfDocument(file);
    }
    if (detectedType === DocumentFileType.DOC) {
      return this.parsingService.parseWordDocument(file);
    }
    if (detectedType === DocumentFileType.DOCX) {
      return this.parsingService.parseWordDocument(file);
    }
    throw new BadRequestException('暂不支持的文档类型');
  }
}
