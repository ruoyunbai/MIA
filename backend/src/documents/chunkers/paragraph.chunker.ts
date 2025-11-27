import { Injectable } from '@nestjs/common';
import {
  DocumentChunker,
  DocumentChunkInput,
} from '../documents.types';

const DEFAULT_PARAGRAPH_MIN_LENGTH = 200;

@Injectable()
export class ParagraphChunker implements DocumentChunker {
  async chunk(input: DocumentChunkInput): Promise<string[]> {
    const minLength = this.resolvePositiveNumber(
      input.options?.paragraphMinLength,
      DEFAULT_PARAGRAPH_MIN_LENGTH,
    );
    const segments = input.content
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    if (!segments.length) {
      return [input.content.trim()].filter(Boolean);
    }
    const merged: string[] = [];
    let buffer = '';
    for (const segment of segments) {
      if (!buffer) {
        buffer = segment;
      } else if ((buffer + '\n\n' + segment).length < minLength) {
        buffer = `${buffer}\n\n${segment}`;
      } else {
        merged.push(buffer);
        buffer = segment;
      }
    }
    if (buffer) {
      merged.push(buffer);
    }
    return merged.map((item) => item.trim()).filter(Boolean);
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
