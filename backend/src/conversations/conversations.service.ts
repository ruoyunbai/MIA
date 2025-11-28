import {
  BadRequestException,
  Injectable,
  Logger,
  MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { Observable } from 'rxjs';
import { DocumentIngestionService } from '../documents/services/document-ingestion.service';
import {
  Conversation,
  Message,
  MessageRole,
  Document,
  DocumentChunk,
  SearchLog,
} from '../entities';
import {
  ConversationResponseDto,
  CreateConversationDto,
  ListConversationsDto,
  ListMessagesDto,
  MessageResponseDto,
  SendMessageDto,
  RagStrategy,
  ConversationReferenceDto,
} from './dto';
import type { PreviewSearchMatch } from '../documents/services/document-ingestion.service';
import { LlmClientFactory } from '../llm/llm-client.factory';

type GenerationCallbacks = {
  onEvent?: (type: string, payload: unknown) => void;
  onToken?: (token: string) => void;
};

type GenerationResult = {
  userMessage: Message;
  assistantMessage: Message;
  references: ConversationReferenceDto[];
};

type CandidateContext = ConversationReferenceDto & {
  internalId: string;
  distanceScore?: number;
};

type KnowledgeBaseDecision = {
  useKnowledgeBase: boolean;
  reason?: string;
};

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  private readonly HISTORY_WINDOW = 12;
  private readonly DEFAULT_TITLE = '新对话';
  private readonly DEFAULT_SYSTEM_PROMPT =
    '你是一个面向抖音商家的智能运营助理。请基于给定的资料精准回答用户问题，引用资料时请使用【资料序号】标注来源，如果没有命中资料请直说不知道。回答需结构化、突出关键动作，并尽量使用中文。';
  private openaiClient?: OpenAI;
  private readonly chatModelName: string;
  private readonly rerankModelName: string;
  private readonly RERANK_ACCEPT_THRESHOLD = 0.25;
  private readonly SIMILARITY_ACCEPT_THRESHOLD = 0.4;

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    @InjectRepository(DocumentChunk)
    private readonly chunksRepository: Repository<DocumentChunk>,
    @InjectRepository(SearchLog)
    private readonly searchLogsRepository: Repository<SearchLog>,
    private readonly configService: ConfigService,
    private readonly documentIngestionService: DocumentIngestionService,
    private readonly llmClientFactory: LlmClientFactory,
  ) {
    this.chatModelName = this.resolveChatModel();
    this.rerankModelName = this.resolveRerankModel();
  }

  async listConversations(userId: number, query: ListConversationsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [items, total] = await this.conversationsRepository.findAndCount({
      where: { userId, isDeleted: false },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      items: ConversationResponseDto.fromEntities(items),
      total,
      page,
      pageSize,
    };
  }

  async createConversation(userId: number, payload: CreateConversationDto) {
    const title = payload.title?.trim() || this.DEFAULT_TITLE;
    const conversation = this.conversationsRepository.create({
      title,
      userId,
      isDeleted: false,
    });
    const saved = await this.conversationsRepository.save(conversation);
    return ConversationResponseDto.fromEntity(saved);
  }

  async deleteConversation(conversationId: number, userId: number) {
    const conversation = await this.requireConversation(conversationId, userId);
    conversation.isDeleted = true;
    await this.conversationsRepository.save(conversation);
    return ConversationResponseDto.fromEntity(conversation);
  }

  async listMessages(
    conversationId: number,
    userId: number,
    query: ListMessagesDto,
  ) {
    await this.requireConversation(conversationId, userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const qb = this.messagesRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [messages, total] = await qb.getManyAndCount();
    messages.reverse();
    return {
      items: MessageResponseDto.fromEntities(messages),
      total,
      page,
      pageSize,
    };
  }

  async sendMessage(
    conversationId: number,
    userId: number,
    payload: SendMessageDto,
  ) {
    const buffer: string[] = [];
    const result = await this.generateAnswer(conversationId, userId, payload, {
      onToken: (token) => buffer.push(token),
    });
    return {
      conversationId,
      userMessage: MessageResponseDto.fromEntity(result.userMessage),
      assistantMessage: MessageResponseDto.fromEntity(result.assistantMessage),
      references: result.references,
      content: buffer.join(''),
    };
  }

  streamMessage(
    conversationId: number,
    userId: number,
    payload: SendMessageDto,
  ) {
    return new Observable<MessageEvent>((observer) => {
      this.generateAnswer(conversationId, userId, payload, {
        onEvent: (type, data) =>
          observer.next({
            type,
            data: this.normalizeEventData(data),
          }),
        onToken: (token) =>
          observer.next({
            type: 'answer_token',
            data: this.normalizeEventData({ token }),
          }),
      })
        .then((result) => {
          observer.next({
            type: 'answer_completed',
            data: this.normalizeEventData({
              conversationId,
              userMessage: MessageResponseDto.fromEntity(result.userMessage),
              assistantMessage: MessageResponseDto.fromEntity(
                result.assistantMessage,
              ),
              references: result.references,
            }),
          });
          observer.complete();
        })
        .catch((error) => {
          this.logger.error(
            `streamMessage failed for conversation ${conversationId}`,
            error as Error,
          );
          observer.error(error);
        });
    });
  }

  private getOpenAIClient() {
    if (!this.openaiClient) {
      this.openaiClient = this.llmClientFactory.createOpenAIClient();
    }
    return this.openaiClient;
  }

  private async generateAnswer(
    conversationId: number,
    userId: number,
    payload: SendMessageDto,
    callbacks?: GenerationCallbacks,
  ): Promise<GenerationResult> {
    this.logger.log(
      `generateAnswer start conversation=${conversationId}, user=${userId}`,
    );
    const conversation = await this.requireConversation(conversationId, userId);
    const normalizedQuery = payload.query?.trim();
    if (!normalizedQuery) {
      throw new BadRequestException('请填写需要提问的内容');
    }

    await this.touchConversation(conversation, normalizedQuery);

    const userMessage = await this.messagesRepository.save(
      this.messagesRepository.create({
        conversationId: conversation.id,
        role: MessageRole.USER,
        content: normalizedQuery,
        sources: null,
        metadata: null,
      }),
    );

    const history = await this.loadHistory(conversation.id);

    callbacks?.onEvent?.('retrieval_decision', {
      query: normalizedQuery,
      status: 'evaluating',
    });
    const decision = await this.shouldUseKnowledgeBase(
      normalizedQuery,
      history,
    );
    callbacks?.onEvent?.('retrieval_decision', {
      query: normalizedQuery,
      decision: decision.useKnowledgeBase ? 'retrieve' : 'skip',
      reason: decision.reason,
    });

    let references: ConversationReferenceDto[] = [];
    let knowledgeBaseUsed = decision.useKnowledgeBase;

    if (decision.useKnowledgeBase) {
      const retrievalStartedAt = Date.now();
      callbacks?.onEvent?.('retrieval_start', {
        strategy: payload.ragStrategy ?? RagStrategy.CHUNK_WITH_NEIGHBORS,
        topK: this.normalizeTopK(payload.topK),
        rerank: Boolean(payload.rerank ?? true),
      });

      this.logger.log(
        `retrieval start conversation=${conversationId}, query="${normalizedQuery}"`,
      );
      references = await this.buildContextReferences(
        normalizedQuery,
        payload,
        userId,
        callbacks,
      );
      this.logger.log(
        `retrieval finished conversation=${conversationId}, references=${references.length}`,
      );

      callbacks?.onEvent?.('retrieval_completed', {
        references,
      });

      await this.logSearch(
        userId,
        normalizedQuery,
        references,
        retrievalStartedAt,
      );
    } else {
      knowledgeBaseUsed = false;
      callbacks?.onEvent?.('retrieval_skipped', {
        reason: decision.reason ?? 'retrieval_not_required',
      });
    }

    const chatMessages = this.composeChatMessages(
      history,
      normalizedQuery,
      references,
      payload,
      knowledgeBaseUsed,
    );

    const resolvedModel = payload.model?.trim() || this.chatModelName;
    callbacks?.onEvent?.('llm_start', {
      model: resolvedModel,
    });
    this.logger.log(
      `llm_start conversation=${conversationId}, model=${resolvedModel}`,
    );

    const generationStartedAt = Date.now();
    const { text: answer, usage } = await this.streamChatCompletion(
      chatMessages,
      payload,
      callbacks,
    );
    const generationDuration = Date.now() - generationStartedAt;
    this.logger.log(
      `llm_completed conversation=${conversationId}, tokens=${usage?.total_tokens ?? 'n/a'}, duration=${generationDuration}ms`,
    );

    const assistantMessage = await this.messagesRepository.save(
      this.messagesRepository.create({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: answer,
        sources: references.map((reference) => ({
          ...reference,
        })),
        metadata: {
          ragStrategy: payload.ragStrategy ?? RagStrategy.CHUNK_WITH_NEIGHBORS,
          rerank: Boolean(payload.rerank ?? true),
          rerankModel: payload.rerankModel?.trim() || this.rerankModelName,
          model: resolvedModel,
          temperature: payload.temperature ?? 0.2,
          tokens: usage ?? null,
          generationDuration,
        },
      }),
    );

    return {
      userMessage,
      assistantMessage,
      references,
    };
  }

  private async shouldUseKnowledgeBase(
    query: string,
    history: Message[],
  ): Promise<KnowledgeBaseDecision> {
    if (!query?.trim()) {
      return { useKnowledgeBase: true };
    }
    const recentHistory = history
      .slice(-4)
      .map((message) => {
        const roleLabel =
          message.role === MessageRole.ASSISTANT
            ? '助手'
            : message.role === MessageRole.SYSTEM
              ? '系统'
              : '用户';
        const content = message.content?.trim() || '';
        if (!content) {
          return `${roleLabel}：无内容`;
        }
        return `${roleLabel}：${this.truncateContent(content, 160)}`;
      })
      .join('\n');
    const requestPayload: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          '你是一个用于判断是否需要查询知识库的分类器。仅当用户的问题涉及商家、运营数据、策略、流程或其它需要知识库资料才能回答的内容时返回true；闲聊、寒暄、泛问或无需文档即可回答的问题应返回false。严格按照JSON格式输出：{"useKnowledgeBase": true|false, "reason": "简要原因"}。',
      },
      {
        role: 'user',
        content: `${recentHistory ? `最近对话：\n${recentHistory}\n\n` : ''}本轮问题：${query}\n\n请直接输出JSON。`,
      },
    ];
    try {
      this.logger.log(
        `retrieval gate evaluating query="${this.truncateContent(query, 60)}"`,
      );
      const completion = await this.getOpenAIClient().chat.completions.create({
        model: this.chatModelName,
        temperature: 0,
        messages: requestPayload,
      });
      const content = completion.choices?.[0]?.message?.content?.trim();
      const parsed = content ? this.safeJsonParse(content) : undefined;
      if (parsed && typeof parsed === 'object') {
        const decisionValue =
          typeof parsed.useKnowledgeBase === 'boolean'
            ? parsed.useKnowledgeBase
            : typeof parsed.use_knowledge_base === 'boolean'
              ? parsed.use_knowledge_base
              : typeof parsed.needKnowledgeBase === 'boolean'
                ? parsed.needKnowledgeBase
                : undefined;
        const reasonValue =
          typeof parsed.reason === 'string'
            ? parsed.reason
            : typeof parsed.explain === 'string'
              ? parsed.explain
              : undefined;
        if (typeof decisionValue === 'boolean') {
          this.logger.log(
            `retrieval gate result query="${this.truncateContent(query, 60)}", useKnowledgeBase=${decisionValue}`,
          );
          return { useKnowledgeBase: decisionValue, reason: reasonValue };
        }
      }
      this.logger.warn(
        'retrieval gate received unexpected response, fallback to enabling knowledge base',
      );
      return { useKnowledgeBase: true };
    } catch (error) {
      this.logger.warn(
        'retrieval gate failed, fallback to rag',
        error as Error,
      );
      return { useKnowledgeBase: true };
    }
  }

  private async buildContextReferences(
    query: string,
    payload: SendMessageDto,
    userId: number,
    callbacks?: GenerationCallbacks,
  ): Promise<ConversationReferenceDto[]> {
    this.logger.log(
      `buildContextReferences start query="${query}", strategy=${payload.ragStrategy ?? RagStrategy.CHUNK_WITH_NEIGHBORS}`,
    );
    const searchLimit = this.normalizeRetrievalLimit(payload.retrievalLimit);
    const preview = await this.documentIngestionService.searchDocumentVectors(
      query,
      searchLimit,
      userId,
    );
    const chunkIds = (preview.matches ?? [])
      .map((match) => match.chunkId)
      .filter((chunkId): chunkId is number => Number.isFinite(chunkId));
    if (!chunkIds.length) {
      callbacks?.onEvent?.('retrieval_empty', {
        query,
      });
      return [];
    }

    const chunks = await this.chunksRepository.find({
      where: { id: In(chunkIds), document: { userId } },
      relations: ['document'],
    });
    const chunkMap = new Map<number, DocumentChunk>();
    chunks.forEach((chunk) => chunkMap.set(chunk.id, chunk));

    const filtered = preview.matches
      .map((match, index) => {
        if (!match.chunkId) {
          return undefined;
        }
        const chunk = chunkMap.get(match.chunkId);
        if (!chunk) {
          return undefined;
        }
        if (!this.isDocumentAccessible(chunk.document, userId)) {
          return undefined;
        }
        if (
          payload.documentFilter?.length &&
          !payload.documentFilter.includes(chunk.documentId)
        ) {
          return undefined;
        }
        return {
          match,
          chunk,
          order: index,
        };
      })
      .filter(
        (
          record,
        ): record is {
          match: PreviewSearchMatch;
          chunk: DocumentChunk;
          order: number;
        } => Boolean(record),
      );

    const candidates: CandidateContext[] = [];
    for (let i = 0; i < filtered.length; i += 1) {
      const { match, chunk, order } = filtered[i];
      const document = chunk.document;
      if (!document) {
        continue;
      }
      const content = await this.buildContextContent(chunk, document, payload);
      const normalized = this.truncateContent(
        content,
        payload.maxContextLength ?? 2500,
      );
      if (!normalized) {
        continue;
      }
      const ref: CandidateContext = {
        internalId: `C${order + 1}`,
        referenceId: `ref-${chunk.id}`,
        documentId: document.id,
        documentTitle: document.title,
        chunkId: chunk.id,
        chunkIndex: chunk.chunkIndex,
        snippet:
          match.snippet?.trim() || this.truncateContent(normalized, 200) || '',
        content: normalized,
        strategy: payload.ragStrategy ?? RagStrategy.CHUNK_WITH_NEIGHBORS,
        similarityScore: this.normalizeSimilarity(match.score),
        rerankScore: null,
        metadata: {
          ...this.ensurePlainObject(document.metaInfo),
          ...this.ensurePlainObject(chunk.metadata),
          vectorMetadata: this.ensurePlainObject(match.metadata),
        },
        distanceScore: match.score ?? null,
      };
      candidates.push(ref);
      const { internalId, ...eventPayload } = ref;
      callbacks?.onEvent?.('retrieval_candidate', eventPayload);
    }

    if (!candidates.length) {
      callbacks?.onEvent?.('retrieval_empty', {
        query,
      });
      return [];
    }

    const rerankEnabled = payload.rerank ?? true;
    const activeRerankModel =
      payload.rerankModel?.trim() || this.rerankModelName;
    this.logger.log(
      `rerank start query="${query}", enabled=${rerankEnabled}, model=${activeRerankModel}`,
    );
    const reranked = rerankEnabled
      ? await this.rerankCandidates(
          query,
          candidates,
          activeRerankModel,
          callbacks,
        )
      : candidates;
    this.logger.log(
      `rerank finished query="${query}", candidateCount=${reranked.length}`,
    );

    callbacks?.onEvent?.('rerank_completed', {
      references: reranked.map(({ internalId, ...rest }) => rest),
    });

    const confident = this.retainConfidentReferences(reranked, rerankEnabled);
    if (!confident.length) {
      callbacks?.onEvent?.('retrieval_discarded', {
        reason: 'low_confidence',
      });
      return [];
    }

    const topK = this.normalizeTopK(payload.topK);
    return confident.slice(0, topK).map((reference) => {
      const { internalId, ...rest } = reference;
      return rest;
    });
  }

  private isDocumentAccessible(document: Document | null, userId: number) {
    if (!document) {
      return false;
    }
    return document.userId === userId;
  }

  private async buildContextContent(
    chunk: DocumentChunk,
    document: Document,
    payload: SendMessageDto,
  ) {
    const strategy = payload.ragStrategy ?? RagStrategy.CHUNK_WITH_NEIGHBORS;
    if (strategy === RagStrategy.FULL_DOCUMENT) {
      const content = document.content?.trim();
      if (!content) {
        return chunk.content;
      }
      return content;
    }
    if (strategy === RagStrategy.RAW_CHUNK) {
      return chunk.content;
    }
    const neighborSize = Math.min(
      3,
      Math.max(0, Math.floor(payload.neighborSize ?? 1)),
    );
    if (!neighborSize) {
      return chunk.content;
    }
    const neighbors = await this.chunksRepository.find({
      where: {
        documentId: chunk.documentId,
        chunkIndex: In([
          ...new Set(
            Array.from(
              { length: neighborSize * 2 + 1 },
              (_, idx) => chunk.chunkIndex - neighborSize + idx,
            ),
          ),
        ]),
      },
      order: { chunkIndex: 'ASC' },
    });
    if (!neighbors.length) {
      return chunk.content;
    }
    const merged = neighbors
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .map((item) => item.content?.trim() || '')
      .join('\n');
    return merged || chunk.content;
  }

  private async rerankCandidates(
    query: string,
    candidates: CandidateContext[],
    model: string,
    callbacks?: GenerationCallbacks,
  ) {
    if (!candidates.length) {
      return candidates;
    }
    const rerankModel = model;
    try {
      const prompt = this.buildRerankPrompt(query, candidates);
      const completion = await this.getOpenAIClient().chat.completions.create({
        model: rerankModel,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              '你是一个检索结果重排器，请根据用户问题为候选资料打分，评分范围0到1，1表示最相关，请仅返回JSON数组。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
      const content = completion.choices?.[0]?.message?.content?.trim() ?? '[]';
      const parsed = this.safeJsonParse(content);
      if (Array.isArray(parsed)) {
        const scoreMap = new Map<string, number>();
        parsed.forEach((item) => {
          if (
            item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.score === 'number'
          ) {
            scoreMap.set(item.id, Math.max(0, Math.min(1, Number(item.score))));
          }
        });
        const ranked = candidates
          .map((candidate) => ({
            ...candidate,
            rerankScore: scoreMap.get(candidate.internalId) ?? null,
          }))
          .sort((a, b) => {
            const scoreA = a.rerankScore ?? 0;
            const scoreB = b.rerankScore ?? 0;
            if (scoreA === scoreB) {
              const simA = a.similarityScore ?? 0;
              const simB = b.similarityScore ?? 0;
              return simB - simA;
            }
            return scoreB - scoreA;
          });
        callbacks?.onEvent?.('rerank_result', {
          scores: parsed,
        });
        return ranked;
      }
      return candidates;
    } catch (error) {
      this.logger.warn('rerank failed', error as Error);
      callbacks?.onEvent?.('rerank_error', {
        message: (error as Error).message,
      });
      return candidates;
    }
  }

  private buildRerankPrompt(
    query: string,
    candidates: CandidateContext[],
  ): string {
    const sections = candidates
      .map(
        (candidate) =>
          `- id: ${candidate.internalId}\n标题: ${candidate.documentTitle}\n摘录: ${this.truncateContent(candidate.content, 320)}`,
      )
      .join('\n\n');
    return `用户问题：${query}\n---\n候选资料：\n${sections}\n---\n请输出JSON数组，如 [{"id":"C1","score":0.92}]，仅返回JSON。`;
  }

  private composeChatMessages(
    history: Message[],
    query: string,
    references: ConversationReferenceDto[],
    payload: SendMessageDto,
    knowledgeBaseUsed: boolean,
  ) {
    const systemPrompt =
      payload.systemPrompt?.trim() || this.DEFAULT_SYSTEM_PROMPT;
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];
    if (history.length > this.HISTORY_WINDOW) {
      history = history.slice(-this.HISTORY_WINDOW);
    }
    history.forEach((message, index) => {
      const role =
        message.role === MessageRole.ASSISTANT
          ? 'assistant'
          : message.role === MessageRole.SYSTEM
            ? 'system'
            : 'user';
      let content = message.content;
      if (index === history.length - 1 && message.role === MessageRole.USER) {
        content = this.buildUserPrompt(query, references, knowledgeBaseUsed);
      }
      const chatMessage: ChatCompletionMessageParam = {
        role,
        content,
      };
      messages.push(chatMessage);
    });
    return messages;
  }

  private buildUserPrompt(
    query: string,
    references: ConversationReferenceDto[],
    knowledgeBaseUsed: boolean,
  ) {
    if (!knowledgeBaseUsed) {
      return `用户问题：${query}\n\n本轮无需查询知识库，请结合上下文与常识直接回答。如需向用户确认信息，请礼貌提出。`;
    }
    if (!references.length) {
      return `用户问题：${query}\n\n没有找到可靠的资料，请基于你的常识回答，并提示用户知识库暂无匹配内容。`;
    }
    const segments = references
      .map(
        (reference, index) =>
          `【资料${index + 1}】${reference.documentTitle}\n${reference.content}`,
      )
      .join('\n\n');
    return `以下是根据 "${query}" 检索到的资料，请基于资料回答并引用对应的【资料序号】。\n\n${segments}\n\n请回答用户问题：${query}`;
  }

  private async streamChatCompletion(
    messages: ChatCompletionMessageParam[],
    payload: SendMessageDto,
    callbacks?: GenerationCallbacks,
  ) {
    const model = payload.model?.trim() || this.chatModelName;
    this.logger.log(
      `streamChatCompletion start model=${model}, messageCount=${messages.length}`,
    );
    const stream = await this.getOpenAIClient().chat.completions.create({
      model,
      stream: true,
      temperature: payload.temperature ?? 0.2,
      messages,
    });
    let text = '';
    let usage: OpenAI.Chat.Completions.ChatCompletion['usage'] | null = null;
    for await (const part of stream) {
      const delta = part.choices?.[0]?.delta?.content;
      if (delta) {
        text += delta;
        callbacks?.onToken?.(delta);
      }
      if (part.usage) {
        usage = part.usage;
      }
    }
    this.logger.log(
      `streamChatCompletion completed model=${model}, tokens=${usage?.total_tokens ?? 'n/a'}`,
    );
    return {
      text: text.trim(),
      usage,
    };
  }

  private async loadHistory(conversationId: number) {
    const messages = await this.messagesRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'ASC')
      .getMany();
    return messages;
  }

  private async touchConversation(conversation: Conversation, query: string) {
    const trimmed = query.trim();
    if (
      conversation.title === this.DEFAULT_TITLE ||
      !conversation.title?.trim()
    ) {
      conversation.title =
        trimmed.length > 30 ? `${trimmed.slice(0, 30)}...` : trimmed;
    }
    conversation.updatedAt = new Date();
    await this.conversationsRepository.save(conversation);
  }

  private async logSearch(
    userId: number,
    query: string,
    references: ConversationReferenceDto[],
    startedAt: number,
  ) {
    const log = this.searchLogsRepository.create({
      userId,
      query,
      resultCount: references.length,
      topScore: references[0]?.similarityScore ?? null,
      latency: Date.now() - startedAt,
      matchedDocIds: references.map((reference) => reference.documentId),
    });
    await this.searchLogsRepository.save(log);
  }

  private async requireConversation(conversationId: number, userId: number) {
    const conversation = await this.conversationsRepository.findOne({
      where: { id: conversationId, userId, isDeleted: false },
    });
    if (!conversation) {
      throw new NotFoundException('会话不存在或已被删除');
    }
    return conversation;
  }

  private truncateContent(content: string, maxLength: number) {
    if (content.length <= maxLength) {
      return content;
    }
    return `${content.slice(0, maxLength)}...`;
  }

  private normalizeTopK(value?: number) {
    if (!value || Number.isNaN(Number(value))) {
      return 4;
    }
    return Math.min(8, Math.max(1, Math.floor(value)));
  }

  private normalizeRetrievalLimit(value?: number) {
    if (!value || Number.isNaN(Number(value))) {
      return 6;
    }
    return Math.min(12, Math.max(1, Math.floor(value)));
  }

  private normalizeSimilarity(score?: number) {
    if (score === undefined || score === null) {
      return null;
    }
    const numeric = Number(score);
    if (Number.isNaN(numeric)) {
      return null;
    }
    return 1 / (1 + Math.max(0, numeric));
  }

  private ensurePlainObject(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return value as Record<string, unknown>;
  }

  private safeJsonParse(content: string) {
    const normalized = content
      .replace(/^```json/i, '')
      .replace(/```$/, '')
      .trim();
    try {
      return JSON.parse(normalized);
    } catch {
      return undefined;
    }
  }

  private normalizeEventData(data: unknown): string | Record<string, unknown> {
    if (data === undefined || data === null) {
      return '';
    }
    if (typeof data === 'string') {
      return data;
    }
    if (typeof data === 'object') {
      return data as Record<string, unknown>;
    }
    return String(data);
  }

  private resolveChatModel() {
    return (
      this.configService.get<string>('MIA_OPENAI_MODEL_NAME')?.trim() ||
      this.configService.get<string>('OPENAI_MODEL_NAME')?.trim() ||
      'gpt-4o-mini'
    );
  }

  private resolveRerankModel() {
    return (
      this.configService.get<string>('MIA_OPENAI_RERANK_MODEL')?.trim() ||
      this.configService.get<string>('OPENAI_RERANK_MODEL')?.trim() ||
      this.chatModelName
    );
  }

  private retainConfidentReferences(
    candidates: CandidateContext[],
    rerankEnabled: boolean,
  ) {
    if (!candidates.length) {
      return candidates;
    }
    const scoreSelector = (candidate: CandidateContext) => {
      if (rerankEnabled) {
        return candidate.rerankScore ?? 0;
      }
      return candidate.similarityScore ?? 0;
    };
    const bestScore = Math.max(...candidates.map(scoreSelector));
    const threshold = rerankEnabled
      ? this.RERANK_ACCEPT_THRESHOLD
      : this.SIMILARITY_ACCEPT_THRESHOLD;
    if (bestScore < threshold) {
      return [];
    }
    return candidates;
  }
}
