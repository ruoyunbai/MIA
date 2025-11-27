import { Injectable } from '@nestjs/common';
import { DocumentChunker, DocumentChunkStrategyType } from '../documents.types';
import { FixedLengthChunker } from './fixed-length.chunker';
import { ParagraphChunker } from './paragraph.chunker';
import { SectionChunker } from './section.chunker';
import { SlidingWindowChunker } from './sliding-window.chunker';

@Injectable()
export class DocumentChunkerRegistry {
  private readonly chunkers = new Map<string, DocumentChunker>();
  private readonly defaultKey = DocumentChunkStrategyType.FIXED;

  constructor(
    fixedLengthChunker: FixedLengthChunker,
    paragraphChunker: ParagraphChunker,
    sectionChunker: SectionChunker,
    slidingWindowChunker: SlidingWindowChunker,
  ) {
    this.register(DocumentChunkStrategyType.FIXED, fixedLengthChunker);
    this.register(DocumentChunkStrategyType.PARAGRAPH, paragraphChunker);
    this.register(DocumentChunkStrategyType.SECTION, sectionChunker);
    this.register(
      DocumentChunkStrategyType.SLIDING_WINDOW,
      slidingWindowChunker,
    );
  }

  register(key: string, chunker: DocumentChunker) {
    this.chunkers.set(this.normalizeKey(key), chunker);
  }

  has(key: string) {
    return this.chunkers.has(this.normalizeKey(key));
  }

  getChunker(key?: string) {
    if (key) {
      const found = this.chunkers.get(this.normalizeKey(key));
      if (found) {
        return found;
      }
    }
    return this.chunkers.get(this.defaultKey)!;
  }

  getDefaultKey() {
    return this.defaultKey;
  }

  private normalizeKey(key: string) {
    return key.trim().toLowerCase();
  }
}
