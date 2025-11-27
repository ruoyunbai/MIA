import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { DocumentIngestionStatus, DocumentStatus } from '../../entities';
import {
  DocumentIngestionService,
  PreparedDocumentIngestion,
} from './document-ingestion.service';
import { DocumentIngestionEventsService } from './document-ingestion-events.service';

interface DocumentIngestionJob {
  id: string;
  payload: PreparedDocumentIngestion;
  enqueuedAt: Date;
}

interface EnqueueResult {
  jobId: string;
  documentId: number;
  queuePosition: number;
  status: DocumentStatus;
}

@Injectable()
export class DocumentIngestionQueueService {
  private readonly logger = new Logger(DocumentIngestionQueueService.name);
  private readonly queue: DocumentIngestionJob[] = [];
  private activeCount = 0;
  private readonly concurrency: number;

  constructor(
    private readonly ingestionService: DocumentIngestionService,
    private readonly configService: ConfigService,
    private readonly ingestionEvents: DocumentIngestionEventsService,
  ) {
    this.concurrency = this.resolveConcurrency();
  }

  enqueue(prepared: PreparedDocumentIngestion): EnqueueResult {
    const job: DocumentIngestionJob = {
      id: randomUUID(),
      payload: prepared,
      enqueuedAt: new Date(),
    };
    this.queue.push(job);
    const queuePosition = this.queue.length - 1;
    this.logger.log(
      'Enqueued ingestion job ' +
        job.id +
        ' for document ' +
        prepared.documentId +
        ' at position ' +
        queuePosition,
    );
    this.ingestionEvents.emit({
      type: 'queued',
      documentId: prepared.documentId,
      jobId: job.id,
      queuePosition,
      status: DocumentStatus.PROCESSING,
      ingestionStatus: DocumentIngestionStatus.UPLOADED,
    });
    this.drain();
    return {
      jobId: job.id,
      documentId: prepared.documentId,
      queuePosition,
      status: DocumentStatus.PROCESSING,
    };
  }

  private drain() {
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) {
        break;
      }
      this.process(job);
    }
  }

  private process(job: DocumentIngestionJob) {
    this.activeCount += 1;
    this.logger.log(
      'Processing ingestion job ' +
        job.id +
        ' for document ' +
        job.payload.documentId,
    );
    this.ingestionService
      .finalizePreparedDocumentIngestion(job.payload, job.id)
      .then(() => {
        this.logger.log(
          'Completed ingestion job ' +
            job.id +
            ' for document ' +
            job.payload.documentId,
        );
      })
      .catch((error) => {
        this.logger.error(
          'Ingestion job ' +
            job.id +
            ' for document ' +
            job.payload.documentId +
            ' failed',
          (error as Error)?.stack,
        );
      })
      .finally(() => {
        this.activeCount = Math.max(0, this.activeCount - 1);
        this.drain();
      });
  }

  private resolveConcurrency() {
    const configured = Number(
      this.configService.get('DOCUMENT_INGESTION_CONCURRENCY'),
    );
    if (Number.isFinite(configured) && configured > 0) {
      return Math.max(1, Math.floor(configured));
    }
    return 1;
  }
}
