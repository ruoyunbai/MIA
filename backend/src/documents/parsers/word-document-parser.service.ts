import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import { UploadedDocumentFile } from '../interfaces/uploaded-document-file.interface';
import type { DocumentParser } from '../interfaces/document-parser.interface';
import type {
  DocumentOutlineItem,
  ParsedDocument,
} from '../interfaces/parsed-document.interface';
import {
  buildOutlineFromMarkdown,
  buildOutlineFromPlainText,
  normalizeMarkdown,
  normalizePlainText,
  plainTextToMarkdown,
} from '../utils/text-content.util';
import {
  isReadableTitle,
  normalizeUploadedFilename,
} from '../utils/filename.util';
import {
  detectDocumentType,
  DocumentFileType,
} from '../utils/file-signature.util';

@Injectable()
export class WordDocumentParserService
  implements DocumentParser<UploadedDocumentFile>
{
  readonly type = 'word-document';
  private readonly logger = new Logger(WordDocumentParserService.name);
  private readonly legacyExtractor = new WordExtractor();

  canHandle(file: UploadedDocumentFile) {
    if (!file?.buffer?.length) {
      return false;
    }
    const detected = detectDocumentType(file.buffer);
    return (
      detected === DocumentFileType.DOC || detected === DocumentFileType.DOCX
    );
  }

  async parse(file: UploadedDocumentFile): Promise<ParsedDocument> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请提供需要解析的 Word 文档');
    }
    const detectedType = detectDocumentType(file.buffer);
    if (detectedType === DocumentFileType.DOCX) {
      return this.parseDocx(file);
    }
    if (detectedType === DocumentFileType.DOC) {
      return this.parseDoc(file);
    }
    throw new BadRequestException('仅支持 .doc 或 .docx 文档解析');
  }

  private async parseDocx(file: UploadedDocumentFile): Promise<ParsedDocument> {
    try {
      const [markdownResult, textResult] = await Promise.all([
        mammoth.convertToMarkdown({ buffer: file.buffer }),
        mammoth.extractRawText({ buffer: file.buffer }),
      ]);
      const plainText = normalizePlainText(textResult?.value ?? '');
      if (!plainText) {
        throw new InternalServerErrorException('Word 文档为空或无法解析');
      }
      const markdown = normalizeMarkdown(markdownResult?.value ?? '');
      const outline = this.buildOutline(markdown, plainText);

      return this.toParsedDocument(
        file.originalname,
        markdown || plainText,
        plainText,
        outline,
      );
    } catch (error) {
      this.logger.error('解析 DOCX 失败', error);
      throw new InternalServerErrorException('解析 .docx 文档失败，请稍后重试');
    }
  }

  private async parseDoc(file: UploadedDocumentFile): Promise<ParsedDocument> {
    try {
      const document = await this.legacyExtractor.extract(file.buffer);
      const body = document.getBody();
      const plainText = normalizePlainText(body);
      if (!plainText) {
        throw new InternalServerErrorException('Word 文档为空或无法解析');
      }
      const markdown = plainTextToMarkdown(plainText);
      const outline = buildOutlineFromPlainText(plainText);

      return this.toParsedDocument(
        file.originalname,
        markdown,
        plainText,
        outline,
      );
    } catch (error) {
      this.logger.error('解析 DOC 失败', error);
      throw new InternalServerErrorException('解析 .doc 文档失败，请稍后重试');
    }
  }

  private buildOutline(markdown: string, plainText: string): DocumentOutlineItem[] {
    const markdownOutline = buildOutlineFromMarkdown(markdown);
    if (markdownOutline.length) {
      return markdownOutline;
    }
    return buildOutlineFromPlainText(plainText);
  }

  private toParsedDocument(
    filename: string | undefined,
    markdown: string,
    plainText: string,
    outline: DocumentOutlineItem[],
  ): ParsedDocument {
    return {
      markdown,
      plainText,
      outline,
      metadata: {
        title: this.resolveTitle(filename, outline, plainText),
        parser: this.type,
        extractedAt: new Date().toISOString(),
        wordCount: plainText.length,
      },
    };
  }

  private resolveTitle(
    filename: string | undefined,
    outline: DocumentOutlineItem[],
    plainText: string,
  ) {
    const normalized = normalizeUploadedFilename(filename);
    if (normalized) {
      return normalized;
    }
    const outlineTitle = outline.find((item) =>
      isReadableTitle(item.title),
    )?.title;
    if (outlineTitle) {
      return outlineTitle;
    }
    const snippet = this.extractReadableSnippet(plainText);
    if (snippet) {
      return snippet;
    }
    return '未命名 Word 文档';
  }

  private extractReadableSnippet(text?: string) {
    if (!text) {
      return '';
    }
    const snippet = text.trim().slice(0, 30).replace(/\s+/g, ' ');
    if (isReadableTitle(snippet)) {
      return snippet;
    }
    return '';
  }
}
