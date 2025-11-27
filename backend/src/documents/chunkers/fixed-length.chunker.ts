import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DocumentChunker, DocumentChunkInput } from '../documents.types';

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 160;

@Injectable()
export class FixedLengthChunker implements DocumentChunker {
  async chunk(input: DocumentChunkInput): Promise<string[]> {
    const chunkSize = this.resolvePositiveNumber(
      input.options?.chunkSize,
      DEFAULT_CHUNK_SIZE,
    );
    const chunkOverlap = this.resolvePositiveNumber(
      input.options?.chunkOverlap,
      DEFAULT_CHUNK_OVERLAP,
    );
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ['\n\n', '\n', '。', '！', '？', '；', '，', ' ', ''],
    });
    return splitter.splitText(input.content);
  }

  private resolvePositiveNumber(value: unknown, fallback: number) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
    return fallback;
  }
}
