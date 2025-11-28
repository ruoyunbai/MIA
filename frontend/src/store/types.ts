export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationReference {
  referenceId?: string;
  documentId?: number;
  documentTitle: string;
  chunkId?: number;
  chunkIndex?: number;
  snippet: string;
  content?: string;
  similarityScore?: number | null;
  rerankScore?: number | null;
  metadata?: Record<string, unknown> | null;
  strategy?: string;
}

export interface SourceAttachment extends ConversationReference {
  title?: string;
  category?: string;
}

export interface RagEvent {
  type: string;
  payload?: unknown;
  timestamp: number;
}

export interface RagCandidate extends SourceAttachment {
  internalId?: string;
}

export interface RagTrace {
  query?: string;
  strategy?: string;
  topK?: number;
  rerank?: boolean;
  rerankModel?: string;
  discardedReason?: string;
  model?: string;
  decision?: 'retrieve' | 'skip';
  decisionStatus?: 'evaluating' | 'decided';
  decisionReason?: string;
  knowledgeBaseUsed?: boolean;
  candidates: RagCandidate[];
  references: SourceAttachment[];
  events: RagEvent[];
}

export interface Message {
  id: number | string;
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SourceAttachment[];
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  isStreaming?: boolean;
  ragTrace?: RagTrace;
}

export interface Conversation {
  id: number;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
  isMessagesLoaded?: boolean;
}

export interface Document {
  id: string;
  title: string;
  categoryId?: number | null;
  category: string;
  subCategoryId?: number | null;
  subCategory: string;
  status: DocumentStatus;
  uploadDate: Date;
  content: string;
  userId?: number | null;
  fileType?: 'text' | 'pdf' | 'web';
  fileUrl?: string;
  sourceUrl?: string;
  isLocal?: boolean;
  ingestion?: DocumentIngestionState;
}

export type DocumentStatus = 'active' | 'inactive' | 'processing' | 'failed';

export type DocumentIngestionEventType =
  | 'queued'
  | 'processing'
  | 'chunked'
  | 'indexed'
  | 'completed'
  | 'failed';

export type DocumentIngestionStatus =
  | 'uploaded'
  | 'chunked'
  | 'embedded'
  | 'indexed'
  | 'failed';

export interface DocumentIngestionState {
  stage: DocumentIngestionEventType;
  status: DocumentIngestionStatus;
  message?: string;
  jobId?: string;
  queuePosition?: number;
  updatedAt: Date;
}

export interface SubCategory {
  id: number;
  name: string;
  parentId: number;
  sortOrder: number;
}

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  subCategories: SubCategory[];
}
