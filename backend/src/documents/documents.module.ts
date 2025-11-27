import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { WebArticleParserService } from './parsers/web-article-parser.service';
import { PdfDocumentParserService } from './parsers/pdf-document-parser.service';
import { WordDocumentParserService } from './parsers/word-document-parser.service';
import { DocumentsStorageService } from './services/documents-storage.service';
import { DocumentsParsingService } from './services/documents-parsing.service';
import { DocumentIngestionService } from './services/document-ingestion.service';
import { DocumentIngestionEventsService } from './services/document-ingestion-events.service';
import { DocumentChunkerRegistry } from './chunkers/document-chunker.registry';
import { FixedLengthChunker } from './chunkers/fixed-length.chunker';
import { ParagraphChunker } from './chunkers/paragraph.chunker';
import { SectionChunker } from './chunkers/section.chunker';
import { SlidingWindowChunker } from './chunkers/sliding-window.chunker';
import { DocumentIngestionQueueService } from './services/document-ingestion-queue.service';
import {
  Document,
  DocumentChunk,
  VectorIndex,
  Category,
  User,
} from '../entities';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentChunk,
      VectorIndex,
      Category,
      User,
    ]),
    LlmModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentsStorageService,
    DocumentsParsingService,
    WebArticleParserService,
    PdfDocumentParserService,
    WordDocumentParserService,
    DocumentIngestionService,
    DocumentIngestionEventsService,
    DocumentIngestionQueueService,
    DocumentChunkerRegistry,
    FixedLengthChunker,
    ParagraphChunker,
    SectionChunker,
    SlidingWindowChunker,
  ],
  exports: [DocumentsService, DocumentIngestionService],
})
export class DocumentsModule {}
