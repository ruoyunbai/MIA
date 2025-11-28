import { RagStrategy } from './send-message.dto';

export class ConversationReferenceDto {
  referenceId: string;
  documentId: number;
  documentTitle: string;
  chunkId?: number;
  chunkIndex?: number;
  snippet: string;
  content: string;
  strategy: RagStrategy;
  similarityScore?: number | null;
  rerankScore?: number | null;
  metadata?: Record<string, unknown> | null;
}
