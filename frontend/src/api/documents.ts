import type { AxiosRequestConfig } from 'axios';
import request from '../utils/request';
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
