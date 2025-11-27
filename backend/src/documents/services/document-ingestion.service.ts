import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DeepPartial } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import {
  ChromaClient,
  type EmbeddingFunction,
  type Collection,
} from 'chromadb';
import { randomUUID } from 'node:crypto';
import {
  Document,
  DocumentChunk,
  DocumentIngestionStatus,
  DocumentStatus,
  VectorIndex,
  Category,
  User,
} from '../../entities';
import { LlmClientFactory } from '../../llm/llm-client.factory';
import type { ParsedDocument } from '../interfaces/parsed-document.interface';
import { DocumentChunkRequestConfig } from '../documents.types';
import { DocumentChunkerRegistry } from '../chunkers/document-chunker.registry';
import { DocumentIngestionEventsService } from './document-ingestion-events.service';
import type {
  DocumentIngestionEventPayload,
  DocumentIngestionEventType,
} from './document-ingestion-events.service';

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 160;
const DEFAULT_MIN_CHUNK_LENGTH = 80;
const DEFAULT_PARAGRAPH_MIN_LENGTH = 200;
const DEFAULT_SLIDING_WINDOW_STEP = 200;
const DEFAULT_COLLECTION_NAME = 'mia_documents';
const DEFAULT_EMBEDDING_DIMENSION = 1536;

type ChunkRemovalOptions = {
  detachOnly?: boolean;
  suppressErrors?: boolean;
};

type VectorizationSummary = {
  chunkCount: number;
  vectorCount: number;
  embeddingModel: string;
  previewSearch?: PreviewSearchResult;
};

export interface IngestParsedDocumentPayload
  extends DocumentChunkRequestConfig {
  parsed: ParsedDocument;
  title?: string;
  categoryId?: number;
  userId?: number;
  fileUrl?: string;
  metaInfo?: Record<string, unknown>;
  previewQuery?: string;
}

type ChunkingOptions = DocumentChunkRequestConfig & {
  parsed?: ParsedDocument;
  jobId?: string;
};

export interface PreparedDocumentIngestion {
  documentId: number;
  title: string;
  parsed: ParsedDocument;
  chunkOptions: DocumentChunkRequestConfig;
  previewQuery?: string;
}

type IngestionWorkflowOptions = {
  documentId: number;
  title: string;
  parsed?: ParsedDocument;
  chunkOptions: DocumentChunkRequestConfig;
  previewQuery?: string;
  jobId?: string;
};

type PreviewSearchMatch = {
  chunkId?: number;
  score: number;
  title?: string;
  snippet: string;
  metadata?: Record<string, unknown>;
};

type PreviewSearchResult = {
  query: string;
  matches: PreviewSearchMatch[];
};

class LangchainEmbeddingFunction implements EmbeddingFunction {
  constructor(private readonly embeddings: EmbeddingsInterface) {}

  async generate(texts: string[]) {
    return this.embeddings.embedDocuments(texts);
  }
}

@Injectable()
export class DocumentIngestionService {
  private readonly logger = new Logger(DocumentIngestionService.name);
  private embeddings?: EmbeddingsInterface;
  private chromaClient?: ChromaClient;
  private collection?: Collection;
  private collectionName?: string;

  constructor(
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private readonly chunksRepository: Repository<DocumentChunk>,
    @InjectRepository(VectorIndex)
    private readonly vectorIndexRepository: Repository<VectorIndex>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly llmClientFactory: LlmClientFactory,
    private readonly chunkerRegistry: DocumentChunkerRegistry,
    private readonly ingestionEvents: DocumentIngestionEventsService,
  ) {}

  async ingestDocument(documentId: number) {
    const document = await this.requireDocument(documentId);
    return this.runIngestionWorkflow({
      documentId,
      title: document.title,
      chunkOptions: {},
      previewQuery: this.pickPreviewQuery(
        undefined,
        undefined,
        document.content ?? '',
      ),
    });
  }

  async ingestParsedDocument(payload: IngestParsedDocumentPayload) {
    const prepared = await this.prepareDocumentIngestion(payload);
    return this.finalizePreparedDocumentIngestion(prepared);
  }

  async prepareDocumentIngestion(
    payload: IngestParsedDocumentPayload,
  ): Promise<PreparedDocumentIngestion> {
    const content =
      payload.parsed.markdown?.trim() || payload.parsed.plainText?.trim();
    if (!content) {
      throw new BadRequestException('解析结果为空，无法执行入库');
    }
    const title =
      payload.title?.trim() || payload.parsed.metadata.title || '未命名文档';
    const mergedMeta: Record<string, unknown> = {
      ...(payload.parsed.metadata ?? {}),
      ...(payload.metaInfo ?? {}),
    };
    const categoryId = await this.resolveCategoryId(payload.categoryId);
    const userId = await this.resolveUserId(payload.userId);
    const createPayload: DeepPartial<Document> = {
      title,
      content,
      categoryId,
      userId,
      fileUrl: payload.fileUrl ?? undefined,
      metaInfo: Object.keys(mergedMeta).length ? mergedMeta : null,
      ingestionStatus: DocumentIngestionStatus.UPLOADED,
      ingestionError: null,
      status: DocumentStatus.PROCESSING,
    };
    const document = this.documentsRepository.create(createPayload);
    const saved = await this.documentsRepository.save(document);
    return {
      documentId: saved.id,
      title,
      parsed: payload.parsed,
      chunkOptions: this.buildChunkOptionsFromPayload(payload),
      previewQuery: this.pickPreviewQuery(
        payload.previewQuery,
        payload.parsed,
        content,
      ),
    };
  }

  async finalizePreparedDocumentIngestion(
    prepared: PreparedDocumentIngestion,
    jobId?: string,
  ) {
    return this.runIngestionWorkflow({
      documentId: prepared.documentId,
      title: prepared.title,
      parsed: prepared.parsed,
      chunkOptions: prepared.chunkOptions,
      previewQuery: prepared.previewQuery,
      jobId,
    });
  }

  async getDocumentIngestionStatus(documentId: number) {
    const document = await this.requireDocument(documentId);
    return {
      documentId: document.id,
      title: document.title,
      status: document.status,
      ingestionStatus: document.ingestionStatus,
      ingestionError: document.ingestionError,
      chunkedAt: document.chunkedAt,
      embeddedAt: document.embeddedAt,
      indexedAt: document.indexedAt,
      updatedAt: document.updatedAt,
    };
  }

  private async runIngestionWorkflow(options: IngestionWorkflowOptions) {
    await this.markDocumentProcessing(options.documentId, options.jobId);
    const chunkOptions: ChunkingOptions = {
      ...options.chunkOptions,
      parsed: options.parsed,
      jobId: options.jobId,
    };
    try {
      const chunks = await this.chunkDocument(options.documentId, chunkOptions);
      const vectorization = await this.vectorizeDocument(
        options.documentId,
        chunks,
        options.previewQuery,
        options.jobId,
      );
      await this.markDocumentActive(options.documentId, options.jobId);
      return {
        documentId: options.documentId,
        title: options.title,
        ...vectorization,
      };
    } catch (error) {
      await this.handleIngestionFailure(
        options.documentId,
        error,
        options.jobId,
      );
      throw error;
    }
  }

  async chunkDocument(documentId: number, options?: ChunkingOptions) {
    const document = await this.requireDocument(documentId);
    const content = document.content?.trim();
    if (!content) {
      throw new BadRequestException('文档内容为空，无法进行切片');
    }

    await this.removeExistingChunks(documentId);

    const chunkerKey = this.resolveChunkerKey(options?.chunkStrategy);
    const chunker = this.chunkerRegistry.getChunker(chunkerKey);
    const normalizedChunks = await chunker.chunk({
      content,
      markdown: options?.parsed?.markdown,
      plainText: options?.parsed?.plainText,
      options: {
        chunkSize: this.resolveChunkParam(
          'DOCUMENT_CHUNK_SIZE',
          options?.chunkSize,
          DEFAULT_CHUNK_SIZE,
        ),
        chunkOverlap: this.resolveChunkParam(
          'DOCUMENT_CHUNK_OVERLAP',
          options?.chunkOverlap,
          DEFAULT_CHUNK_OVERLAP,
        ),
        paragraphMinLength: this.resolveChunkParam(
          'DOCUMENT_PARAGRAPH_MIN_LENGTH',
          options?.paragraphMinLength,
          DEFAULT_PARAGRAPH_MIN_LENGTH,
        ),
        slidingWindowSize: this.resolveChunkParam(
          'DOCUMENT_SLIDING_WINDOW_SIZE',
          options?.slidingWindowSize ?? options?.chunkSize,
          DEFAULT_CHUNK_SIZE,
        ),
        slidingWindowStep: this.resolveChunkParam(
          'DOCUMENT_SLIDING_WINDOW_STEP',
          options?.slidingWindowStep,
          DEFAULT_SLIDING_WINDOW_STEP,
        ),
        minChunkLength: this.getMinChunkLength(),
      },
    });

    const trimmedChunks = normalizedChunks
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length >= this.getMinChunkLength());

    if (!trimmedChunks.length) {
      throw new BadRequestException('文档内容过短，未生成有效切片');
    }

    const payloads = trimmedChunks.map((chunkContent, index) =>
      this.chunksRepository.create({
        documentId: document.id,
        content: chunkContent,
        chunkIndex: index,
        tokenCount: this.estimateTokenCount(chunkContent),
        metadata: this.buildChunkMetadata(
          document,
          chunkContent,
          index,
          chunkerKey,
        ),
      }),
    );

    const savedChunks = await this.chunksRepository.save(payloads);
    await this.documentsRepository.update(document.id, {
      ingestionStatus: DocumentIngestionStatus.CHUNKED,
      chunkedAt: new Date(),
      ingestionError: null,
    });
    this.emitIngestionEvent('chunked', documentId, {
      jobId: options?.jobId,
      status: DocumentStatus.PROCESSING,
      ingestionStatus: DocumentIngestionStatus.CHUNKED,
    });

    return savedChunks;
  }

  async vectorizeDocument(
    documentId: number,
    chunks?: DocumentChunk[],
    previewQuery?: string,
    jobId?: string,
  ): Promise<VectorizationSummary> {
    const document = await this.requireDocument(documentId);
    const targetChunks =
      chunks ??
      (await this.chunksRepository.find({
        where: { documentId },
        order: { chunkIndex: 'ASC' },
      }));

    if (!targetChunks.length) {
      throw new BadRequestException('文档尚未切片，请先执行切片');
    }

    await this.removeVectorIndicesByChunkIds(
      targetChunks.map((chunk) => chunk.id),
      { detachOnly: true },
    );

    const collection = await this.getCollection();
    const chunkMetadata = targetChunks.map((chunk) =>
      this.buildVectorMetadata(document, chunk),
    );
    const chunkContents = targetChunks.map((chunk) => chunk.content);
    const embeddings =
      await this.ensureEmbeddings().embedDocuments(chunkContents);

    if (embeddings.length > 0) {
      this.logger.log(
        `Generated ${embeddings.length} embeddings. Dimension of first vector: ${embeddings[0].length}`,
      );
    }

    const chromaIds = embeddings.map(() => randomUUID());
    try {
      await collection.upsert({
        ids: chromaIds,
        embeddings,
        metadatas: chunkMetadata,
        documents: chunkContents,
      });
    } catch (error) {
      this.logger.error('写入向量数据库失败', error as Error);
      throw new InternalServerErrorException('向量写入失败，请稍后重试');
    }

    const embeddingModel = this.resolveEmbeddingModel();
    const dimension = this.resolveEmbeddingDimension();
    const vectorRecords = chromaIds.map((chromaId, index) =>
      this.vectorIndexRepository.create({
        chunkId: targetChunks[index].id,
        chromaId,
        embeddingModel,
        dimension,
        vectorMetadata: chunkMetadata[index],
      }),
    );
    await this.vectorIndexRepository.save(vectorRecords);

    const now = new Date();
    await this.documentsRepository.update(document.id, {
      ingestionStatus: DocumentIngestionStatus.INDEXED,
      embeddedAt: now,
      indexedAt: now,
      ingestionError: null,
    });
    this.emitIngestionEvent('indexed', documentId, {
      jobId,
      status: DocumentStatus.PROCESSING,
      ingestionStatus: DocumentIngestionStatus.INDEXED,
    });

    const previewSearch = await this.buildPreviewSearch(previewQuery);

    return {
      chunkCount: targetChunks.length,
      vectorCount: vectorRecords.length,
      embeddingModel,
      previewSearch,
    };
  }

  private async markDocumentProcessing(documentId: number, jobId?: string) {
    await this.documentsRepository.update(documentId, {
      status: DocumentStatus.PROCESSING,
      ingestionError: null,
    });
    this.emitIngestionEvent('processing', documentId, {
      jobId,
      status: DocumentStatus.PROCESSING,
      ingestionStatus: DocumentIngestionStatus.UPLOADED,
    });
  }

  private async markDocumentActive(documentId: number, jobId?: string) {
    await this.documentsRepository.update(documentId, {
      status: DocumentStatus.ACTIVE,
      ingestionError: null,
    });
    this.emitIngestionEvent('completed', documentId, {
      jobId,
      status: DocumentStatus.ACTIVE,
      ingestionStatus: DocumentIngestionStatus.INDEXED,
    });
  }

  private async handleIngestionFailure(
    documentId: number,
    error: unknown,
    jobId?: string,
  ) {
    const message = this.extractIngestionError(error);
    await this.documentsRepository.update(documentId, {
      status: DocumentStatus.FAILED,
      ingestionStatus: DocumentIngestionStatus.FAILED,
      ingestionError: message,
    });
    this.emitIngestionEvent('failed', documentId, {
      jobId,
      status: DocumentStatus.FAILED,
      ingestionStatus: DocumentIngestionStatus.FAILED,
      message,
    });
  }

  private extractIngestionError(error: unknown) {
    if (error instanceof Error) {
      return error.message.slice(0, 500);
    }
    if (typeof error === 'string') {
      return error.slice(0, 500);
    }
    return '文档入库失败';
  }

  private emitIngestionEvent(
    type: DocumentIngestionEventType,
    documentId: number,
    payload: Omit<DocumentIngestionEventPayload, 'type' | 'documentId'>,
  ) {
    this.ingestionEvents.emit({
      ...payload,
      type,
      documentId,
    });
  }

  private async removeExistingChunks(documentId: number) {
    const existingChunks = await this.chunksRepository.find({
      where: { documentId },
      select: ['id'],
    });
    if (!existingChunks.length) {
      return;
    }
    await this.removeVectorIndicesByChunkIds(
      existingChunks.map((chunk) => chunk.id),
      { suppressErrors: true },
    );
    await this.chunksRepository.delete({ documentId });
  }

  private async removeVectorIndicesByChunkIds(
    chunkIds: number[],
    options: ChunkRemovalOptions = {},
  ) {
    if (!chunkIds.length) {
      return;
    }
    const vectorRecords = await this.vectorIndexRepository.find({
      where: { chunkId: In(chunkIds) },
    });
    if (!vectorRecords.length) {
      return;
    }
    const chromaIds = vectorRecords.map((record) => record.chromaId);
    try {
      const collection = await this.getCollection();
      await collection.delete({ ids: chromaIds });
    } catch (error) {
      this.logger.warn('删除 ChromaDB 向量失败', error as Error);
      if (!options.suppressErrors) {
        throw error;
      }
      return;
    }

    if (options.detachOnly) {
      await this.vectorIndexRepository.delete({
        id: In(vectorRecords.map((record) => record.id)),
      });
    }
  }

  private async requireDocument(documentId: number) {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException(`文档 ${documentId} 不存在`);
    }
    return document;
  }

  private async getCollection() {
    if (!this.collection) {
      const url = this.configService.get<string>('CHROMA_DB_URL');
      if (!url) {
        throw new InternalServerErrorException(
          'CHROMA_DB_URL 未配置，无法连接向量数据库',
        );
      }
      this.collectionName =
        this.configService.get<string>('CHROMA_DB_COLLECTION') ||
        DEFAULT_COLLECTION_NAME;
      this.chromaClient = this.createChromaClient(url);
      this.collection = await this.ensureCollection(this.collectionName);
    }
    return this.collection;
  }

  private resolveEmbeddingModel() {
    return (
      this.configService.get<string>('MIA_OPENAI_EMBEDDING_MODEL') ||
      'text-embedding-ada-002'
    );
  }

  private resolveEmbeddingDimension() {
    return this.resolveNumericConfig(
      'MIA_VECTOR_EMBEDDING_DIMENSION',
      DEFAULT_EMBEDDING_DIMENSION,
    );
  }

  private resolveNumericConfig(key: string, fallback: number) {
    const value = Number(this.configService.get(key));
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
    return fallback;
  }

  private getMinChunkLength() {
    return this.resolveNumericConfig(
      'DOCUMENT_MIN_CHUNK_LENGTH',
      DEFAULT_MIN_CHUNK_LENGTH,
    );
  }

  private estimateTokenCount(content: string) {
    if (!content) {
      return 0;
    }
    return Math.max(1, Math.ceil(content.length / 3.5));
  }

  private buildChunkMetadata(
    document: Document,
    chunkContent: string,
    chunkIndex: number,
    strategy?: string,
  ) {
    return {
      title: document.title,
      categoryId: document.categoryId,
      sourceUrl: this.extractSourceUrl(document),
      chunkIndex,
      length: chunkContent.length,
      strategy: strategy ?? this.resolveChunkerKey(),
    };
  }

  private buildVectorMetadata(document: Document, chunk: DocumentChunk) {
    let chunkStrategy: string | undefined;
    const chunkMetadata = chunk.metadata;
    if (
      chunkMetadata &&
      typeof chunkMetadata === 'object' &&
      'strategy' in chunkMetadata
    ) {
      const metadataRecord: Record<string, unknown> = chunkMetadata;
      const rawStrategy = metadataRecord['strategy'];
      if (typeof rawStrategy === 'string') {
        chunkStrategy = rawStrategy;
      }
    }
    return {
      documentId: document.id,
      chunkId: chunk.id,
      chunkIndex: chunk.chunkIndex,
      title: document.title,
      categoryId: document.categoryId,
      userId: document.userId,
      sourceUrl: this.extractSourceUrl(document) ?? '',
      strategy: chunkStrategy ?? '',
    };
  }

  private extractSourceUrl(document: Document) {
    const metaInfo = document.metaInfo;
    if (metaInfo && typeof metaInfo['sourceUrl'] === 'string') {
      return metaInfo['sourceUrl'];
    }
    return document.fileUrl ?? undefined;
  }

  private buildChunkOptionsFromPayload(
    payload: DocumentChunkRequestConfig,
  ): DocumentChunkRequestConfig {
    return {
      chunkStrategy: payload.chunkStrategy,
      chunkSize: payload.chunkSize,
      chunkOverlap: payload.chunkOverlap,
      paragraphMinLength: payload.paragraphMinLength,
      slidingWindowStep: payload.slidingWindowStep,
      slidingWindowSize: payload.slidingWindowSize,
    };
  }

  private resolveChunkerKey(strategy?: string) {
    if (strategy && this.chunkerRegistry.has(strategy)) {
      return strategy;
    }
    const defaultStrategy = this.configService.get<string>(
      'DOCUMENT_CHUNK_STRATEGY',
    );
    if (defaultStrategy && this.chunkerRegistry.has(defaultStrategy)) {
      return defaultStrategy;
    }
    return this.chunkerRegistry.getDefaultKey();
  }

  private resolveChunkParam(
    key: string,
    override: number | undefined,
    fallback: number,
  ) {
    if (override !== undefined && override > 0) {
      return override;
    }
    const envValue = Number(this.configService.get(key));
    if (Number.isFinite(envValue) && envValue > 0) {
      return envValue;
    }
    return fallback;
  }

  private ensureEmbeddings() {
    if (!this.embeddings) {
      this.embeddings = this.llmClientFactory.createEmbeddings();
    }
    return this.embeddings;
  }

  private createChromaClient(url: string) {
    const parsed = new URL(url);
    const ssl = parsed.protocol === 'https:';
    const port = parsed.port ? Number(parsed.port) : ssl ? 443 : 8000;
    const basePath =
      parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : undefined;
    return new ChromaClient({
      host: parsed.hostname,
      port,
      ssl,
      ...(basePath ? { path: basePath } : {}),
    });
  }

  private async ensureCollection(collectionName: string) {
    if (!this.chromaClient) {
      throw new InternalServerErrorException('Chroma 客户端未初始化');
    }
    const embeddingFunction = new LangchainEmbeddingFunction(
      this.ensureEmbeddings(),
    );
    return this.chromaClient.getOrCreateCollection({
      name: collectionName,
      embeddingFunction,
      metadata: {
        description: 'MIA 文档知识库',
      },
    });
  }

  private pickPreviewQuery(
    preferred: string | undefined,
    parsed?: ParsedDocument,
    fallbackContent?: string,
  ) {
    const trimmed = preferred?.trim();
    if (trimmed?.length) {
      return trimmed;
    }
    const plain = parsed?.plainText?.trim() || fallbackContent?.trim();
    if (!plain) {
      return undefined;
    }
    const snippet = plain
      .split(/\n+/)
      .map((line) => line.trim())
      .find((line) => line.length >= 8);
    if (!snippet) {
      return undefined;
    }
    return snippet.slice(0, 60);
  }

  private async buildPreviewSearch(query?: string) {
    if (!query) {
      return undefined;
    }
    try {
      const collection = await this.getCollection();
      const embedding = await this.ensureEmbeddings().embedQuery(query);
      const result = await collection.query({
        queryEmbeddings: [embedding],
        nResults: 3,
      });
      const matches: PreviewSearchMatch[] = [];
      const [ids] = result.ids ?? [];
      const [distances] = result.distances ?? [];
      const [documents] = result.documents ?? [];
      const [metadatas] = result.metadatas ?? [];
      if (ids && distances && documents && metadatas) {
        for (let i = 0; i < ids.length; i += 1) {
          const metadata =
            metadatas[i] && typeof metadatas[i] === 'object'
              ? (metadatas[i] as Record<string, unknown>)
              : undefined;
          const chunkId = Number(metadata?.chunkId);
          matches.push({
            chunkId: Number.isFinite(chunkId) ? chunkId : undefined,
            score: distances[i] ?? 0,
            title:
              typeof metadata?.title === 'string' ? metadata?.title : undefined,
            snippet: documents[i]?.slice(0, 120) ?? '',
            metadata,
          });
        }
      }
      return { query, matches };
    } catch (error) {
      this.logger.warn('预检索失败', error as Error);
      return undefined;
    }
  }

  private async resolveCategoryId(categoryId?: number) {
    if (categoryId === undefined || categoryId === null) {
      return undefined;
    }
    const exists = await this.categoriesRepository.findOne({
      where: { id: categoryId },
    });
    if (!exists) {
      throw new BadRequestException(`分类 ${categoryId} 不存在`);
    }
    return categoryId;
  }

  private async resolveUserId(userId?: number) {
    if (userId === undefined || userId === null) {
      return undefined;
    }
    const exists = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!exists) {
      throw new BadRequestException(`用户 ${userId} 不存在`);
    }
    return userId;
  }
}
