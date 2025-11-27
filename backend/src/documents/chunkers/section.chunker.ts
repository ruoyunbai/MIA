import { Injectable } from '@nestjs/common';
import {
  DocumentChunker,
  DocumentChunkInput,
} from '../documents.types';
import { ParagraphChunker } from './paragraph.chunker';

const DEFAULT_SECTION_MIN_LENGTH = 200;

@Injectable()
export class SectionChunker implements DocumentChunker {
  constructor(private readonly paragraphChunker: ParagraphChunker) { }

  async chunk(input: DocumentChunkInput): Promise<string[]> {
    const rawMarkdown =
      input.markdown?.trim() ||
      (typeof input.options?.markdown === 'string'
        ? input.options.markdown
        : undefined) ||
      input.plainText ||
      input.content;

    const markdown = typeof rawMarkdown === 'string' ? rawMarkdown : '';

    if (!markdown) {
      return this.paragraphChunker.chunk(input);
    }
    const minLength = this.resolvePositiveNumber(
      input.options?.paragraphMinLength,
      DEFAULT_SECTION_MIN_LENGTH,
    );
    const lines = markdown.split('\n');
    const chunks: string[] = [];
    let currentSection: string[] = [];

    const flushSection = () => {
      if (!currentSection.length) {
        return;
      }
      const content = currentSection.join('\n').trim();
      if (content) {
        chunks.push(content);
      }
      currentSection = [];
    };

    for (const line of lines) {
      if (/^#{1,6}\s+/.test(line)) {
        flushSection();
        currentSection.push(line.trim());
      } else {
        currentSection.push(line);
      }
    }
    flushSection();

    if (!chunks.length) {
      return this.paragraphChunker.chunk({
        content: markdown,
        plainText: input.plainText,
        options: input.options,
      });
    }

    const merged: string[] = [];
    for (const chunk of chunks.map((item) => item.trim()).filter(Boolean)) {
      if (!merged.length) {
        merged.push(chunk);
        continue;
      }
      const last = merged[merged.length - 1];
      if ((last + '\n\n' + chunk).length < minLength) {
        merged[merged.length - 1] = `${last}\n\n${chunk}`;
      } else {
        merged.push(chunk);
      }
    }
    const cleaned = merged.map((item) => item.trim()).filter(Boolean);
    if (cleaned.length) {
      return cleaned;
    }
    return this.paragraphChunker.chunk({
      content: markdown,
      plainText: input.plainText,
      options: input.options,
    });
  }

  private resolvePositiveNumber(
    value: unknown,
    fallback: number,
  ) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
    return fallback;
  }
}
