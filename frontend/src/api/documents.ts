import request from '../utils/request';
import type { AxiosRequestConfig } from 'axios';
import type {
  DocumentStatus,
  DocumentIngestionStatus,
  DocumentIngestionEventType,
} from '../store/types';

export interface IngestWebArticleRequest {
  url: string;
  title?: string;
  categoryId?: number;
  userId?: number;
}

export interface IngestWebArticleResponse {
  documentId: number;
  jobId: string;
  queuePosition: number;
  status: DocumentStatus;
  title?: string;
}

export interface DocumentIngestionEvent {
  type: DocumentIngestionEventType;
  documentId: number;
  status: DocumentStatus;
  ingestionStatus: DocumentIngestionStatus;
  jobId?: string;
  queuePosition?: number;
  message?: string;
  timestamp: string;
}

export interface DocumentDto {
  id: number;
  title: string;
  content: string | null;
  categoryId: number | null;
  userId: number | null;
  status: DocumentStatus;
  ingestionStatus: DocumentIngestionStatus;
  ingestionError: string | null;
  fileUrl: string | null;
  metaInfo: Record<string, unknown> | null;
  chunkedAt: string | null;
  embeddedAt: string | null;
  indexedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueryDocumentsParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: number;
  userId?: number;
  status?: DocumentStatus;
  ingestionStatus?: DocumentIngestionStatus;
}

export interface PaginatedDocumentsResponse {
  items: DocumentDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string | null;
  categoryId?: number | null;
  userId?: number | null;
  status?: DocumentStatus;
  ingestionStatus?: DocumentIngestionStatus;
  fileUrl?: string | null;
  metaInfo?: Record<string, unknown> | null;
}

export const fetchDocuments = (params?: QueryDocumentsParams) => {
  return request.get<PaginatedDocumentsResponse, PaginatedDocumentsResponse>(
    '/documents',
    { params },
  );
};

export const getDocument = (documentId: number) => {
  return request.get<DocumentDto, DocumentDto>(`/documents/${documentId}`);
};

export const updateDocument = (
  documentId: number,
  payload: UpdateDocumentRequest,
) => {
  return request.patch<DocumentDto, DocumentDto>(
    `/documents/${documentId}`,
    payload,
  );
};

export const deleteDocument = (documentId: number) => {
  return request.delete<DocumentDto, DocumentDto>(`/documents/${documentId}`);
};

export const ingestWebArticle = (
  payload: IngestWebArticleRequest,
  config?: AxiosRequestConfig,
) => {
  return request.post<IngestWebArticleResponse, IngestWebArticleResponse>(
    '/documents/ingest-web-article',
    payload,
    config,
  );
};
