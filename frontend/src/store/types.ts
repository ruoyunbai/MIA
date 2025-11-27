export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SourceAttachment {
  title: string;
  category: string;
  snippet: string;
  content?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceAttachment[];
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export interface Document {
  id: string;
  title: string;
  category: string;
  subCategory: string;
  status: DocumentStatus;
  uploadDate: Date;
  content: string;
  fileType?: 'text' | 'pdf' | 'web';
  fileUrl?: string;
  sourceUrl?: string;
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
