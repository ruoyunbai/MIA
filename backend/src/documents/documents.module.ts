import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { WebArticleParserService } from './parsers/web-article-parser.service';
import { PdfDocumentParserService } from './parsers/pdf-document-parser.service';
import { WordDocumentParserService } from './parsers/word-document-parser.service';

@Module({
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    WebArticleParserService,
    PdfDocumentParserService,
    WordDocumentParserService,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
