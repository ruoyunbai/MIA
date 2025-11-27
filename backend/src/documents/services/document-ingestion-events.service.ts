import { Injectable, MessageEvent } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { Observable } from 'rxjs';
import { DocumentIngestionStatus, DocumentStatus } from '../../entities';

export type DocumentIngestionEventType =
  | 'queued'
  | 'processing'
  | 'chunked'
  | 'indexed'
  | 'completed'
  | 'failed';

export interface DocumentIngestionEventPayload {
  type: DocumentIngestionEventType;
  documentId: number;
  status: DocumentStatus;
  ingestionStatus: DocumentIngestionStatus;
  jobId?: string;
  queuePosition?: number;
  message?: string;
}

export interface DocumentIngestionEvent extends DocumentIngestionEventPayload {
  timestamp: string;
}

@Injectable()
export class DocumentIngestionEventsService {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  emit(payload: DocumentIngestionEventPayload) {
    const event: DocumentIngestionEvent = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    this.emitter.emit('document', event);
  }

  stream(documentId?: number): Observable<MessageEvent> {
    return new Observable<MessageEvent>((observer) => {
      const handler = (event: DocumentIngestionEvent) => {
        if (documentId && event.documentId !== documentId) {
          return;
        }
        observer.next({ data: event });
      };
      this.emitter.on('document', handler);
      return () => {
        this.emitter.off('document', handler);
      };
    });
  }
}
