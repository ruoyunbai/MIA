import { join } from 'node:path';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import pdfParse from 'pdf-parse';
import { UploadedDocumentFile } from '../interfaces/uploaded-document-file.interface';
import {
  buildOutlineFromPlainText,
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
import type {
  ParsedDocument,
  DocumentOutlineItem,
} from '../interfaces/parsed-document.interface';
import type { DocumentParser } from '../interfaces/document-parser.interface';

const PDF_WORKER_SRC = join(
  __dirname,
  '../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
);

@Injectable()
export class PdfDocumentParserService
  implements DocumentParser<UploadedDocumentFile>
{
  readonly type = 'pdf-document';
  private readonly logger = new Logger(PdfDocumentParserService.name);

  canHandle(file: UploadedDocumentFile) {
    if (!file?.buffer?.length) {
      return false;
    }
    return detectDocumentType(file.buffer) === DocumentFileType.PDF;
  }

  async parse(file: UploadedDocumentFile): Promise<ParsedDocument> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请提供需要解析的 PDF 文件');
    }
    try {
      const pdfData = await pdfParse(file.buffer);
      const text = normalizePlainText(pdfData.text || '');
      if (!text) {
        throw new InternalServerErrorException('PDF 文档为空或无法解析');
      }
      const markdown = plainTextToMarkdown(text);
      const outline =
        (await this.extractOutlineFromPdf(file.buffer)) ||
        buildOutlineFromPlainText(text);

      return {
        markdown,
        plainText: text,
        outline,
        metadata: {
          title: this.resolveTitle(file.originalname, outline, text),
          parser: this.type,
          extractedAt: new Date().toISOString(),
          wordCount: text.length,
        },
      };
    } catch (error) {
      this.logger.error('解析 PDF 失败', error);
      throw new InternalServerErrorException('PDF 解析失败，请确认文件是否损坏');
    }
  }

  private async extractOutlineFromPdf(buffer: Buffer) {
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc ||= PDF_WORKER_SRC;
      const pdf = await pdfjs
        .getDocument({ data: new Uint8Array(buffer) })
        .promise;
      const outline = await pdf.getOutline();
      if (!outline?.length) {
        return null;
      }
      const anchors = new Map<string, number>();
      const items: DocumentOutlineItem[] = [];
      const stack: { item: any; level: number }[] = outline.map((item) => ({
        item,
        level: 1,
      }));
      while (stack.length) {
        const { item, level } = stack.shift()!;
        if (!item?.title) {
          continue;
        }
        const anchor = this.ensureUniqueAnchor(item.title, anchors);
        items.push({
          title: item.title.trim(),
          level: Math.min(level, 6),
          anchor,
        });
        if (item.items?.length) {
          for (const child of item.items) {
            stack.push({ item: child, level: level + 1 });
          }
        }
        if (items.length >= 100) {
          break;
        }
      }
      return items;
    } catch (error) {
      this.logger.warn('读取 PDF 目录失败，回退到文本推断', error as Error);
      return null;
    }
  }

  private resolveTitle(
    filename?: string,
    outline?: DocumentOutlineItem[],
    text?: string,
  ) {
    const normalized = normalizeUploadedFilename(filename);
    if (normalized) {
      return normalized;
    }
    const outlineTitle = outline?.find((item) =>
      isReadableTitle(item.title),
    )?.title;
    if (outlineTitle) {
      return outlineTitle;
    }
    const snippet = this.extractReadableSnippet(text);
    if (snippet) {
      return snippet;
    }
    return '未命名 PDF 文档';
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

  private ensureUniqueAnchor(title: string, anchors: Map<string, number>) {
    const slug = title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    const count = anchors.get(slug) ?? 0;
    anchors.set(slug, count + 1);
    if (count === 0) {
      return slug;
    }
    return `${slug}-${count}`;
  }
}
