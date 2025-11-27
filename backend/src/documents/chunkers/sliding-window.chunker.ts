import { Injectable } from '@nestjs/common';
import {
  DocumentChunker,
  DocumentChunkInput,
} from '../documents.types';

const DEFAULT_WINDOW_SIZE = 800;
const DEFAULT_WINDOW_STEP = 200;

@Injectable()
export class SlidingWindowChunker implements DocumentChunker {
  async chunk(input: DocumentChunkInput): Promise<string[]> {
    const windowSize = this.resolvePositiveNumber(
      input.options?.slidingWindowSize ?? input.options?.chunkSize,
      DEFAULT_WINDOW_SIZE,
    );
    const windowStep = this.resolvePositiveNumber(
      input.options?.slidingWindowStep,
      DEFAULT_WINDOW_STEP,
    );
    const trimmed = input.content.trim();
    if (trimmed.length <= windowSize) {
      return [trimmed];
    }
    const chunks: string[] = [];
    for (let i = 0; i < trimmed.length; i += windowStep) {
      const slice = trimmed.slice(i, i + windowSize).trim();
      if (slice) {
        chunks.push(slice);
      }
      if (i + windowSize >= trimmed.length) {
        break;
      }
    }
    const tailStart = Math.max(0, trimmed.length - windowSize);
    const tail = trimmed.slice(tailStart).trim();
    if (tail.length) {
      const lastChunk = chunks[chunks.length - 1];
      if (lastChunk !== tail) {
        chunks.push(tail);
      }
    }
    if (!chunks.length) {
      chunks.push(trimmed.slice(0, windowSize));
    }
    return chunks;
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
