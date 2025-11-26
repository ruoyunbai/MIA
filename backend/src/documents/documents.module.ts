import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { WebArticleParserService } from './parsers/web-article-parser.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, WebArticleParserService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
