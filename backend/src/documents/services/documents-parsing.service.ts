import { BadRequestException, Injectable } from '@nestjs/common';
import { WebArticleParserService } from '../parsers/web-article-parser.service';
import { PdfDocumentParserService } from '../parsers/pdf-document-parser.service';
import { WordDocumentParserService } from '../parsers/word-document-parser.service';
import {
  detectDocumentType,
  DocumentFileType,
} from '../utils/file-signature.util';
import { UploadedDocumentFile } from '../interfaces/uploaded-document-file.interface';

@Injectable()
export class DocumentsParsingService {
  constructor(
    private readonly webArticleParser: WebArticleParserService,
    private readonly pdfDocumentParser: PdfDocumentParserService,
    private readonly wordDocumentParser: WordDocumentParserService,
  ) {}

  parseWebArticle(url: string) {
    return this.webArticleParser.parse(url);
  }

  parsePdfDocument(file: UploadedDocumentFile) {
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

  parseWordDocument(file: UploadedDocumentFile) {
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
}
