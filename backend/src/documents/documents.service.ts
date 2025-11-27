import { Injectable } from '@nestjs/common';
import { DocumentsStorageService } from './services/documents-storage.service';
import { DocumentsParsingService } from './services/documents-parsing.service';
import { UploadedDocumentFile } from './interfaces/uploaded-document-file.interface';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly storageService: DocumentsStorageService,
    private readonly parsingService: DocumentsParsingService,
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
}
