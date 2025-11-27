export enum DocumentChunkStrategyType {
  FIXED = 'fixed',
  PARAGRAPH = 'paragraph',
  SECTION = 'section',
  SLIDING_WINDOW = 'sliding-window',
}

export interface DocumentChunkerOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  paragraphMinLength?: number;
  slidingWindowSize?: number;
  slidingWindowStep?: number;
  minChunkLength?: number;
  [key: string]: unknown;
}

export interface DocumentChunkInput {
  content: string;
  markdown?: string;
  plainText?: string;
  options?: DocumentChunkerOptions;
}

export interface DocumentChunker {
  chunk(input: DocumentChunkInput): Promise<string[]>;
}

export interface DocumentChunkRequestConfig extends DocumentChunkerOptions {
  chunkStrategy?: string;
}
