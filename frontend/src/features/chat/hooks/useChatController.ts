import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createConversation,
  deleteConversationApi,
  fetchConversations,
  fetchMessages,
  streamConversationMessage,
  type ConversationDto,
  type ConversationReferenceDto,
  type MessageDto,
  type ConversationStreamCompletedPayload,
  type ConversationStreamEvent,
} from '../../../api/conversations';
import notify from '../../../utils/message';
import { useAppStore } from '../../../store/useAppStore';
import type {
  Conversation,
  Message,
  RagTrace,
  SourceAttachment,
} from '../../../store/types';

type SourceState = SourceAttachment | null;

const mapConversationDto = (dto: ConversationDto): Conversation => ({
  id: dto.id,
  title: dto.title,
  messages: [],
  createdAt: new Date(dto.createdAt),
  updatedAt: new Date(dto.updatedAt),
  isDeleted: dto.isDeleted,
  isMessagesLoaded: false,
});

const extractCategory = (metadata?: Record<string, unknown> | null) => {
  if (!metadata) return undefined;
  const fallbackKeys = [
    'category',
    'categoryName',
    'channel',
    'docCategory',
    'folder',
  ];
  for (const key of fallbackKeys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return undefined;
};

const normalizeReference = (
  reference: ConversationReferenceDto,
): SourceAttachment => ({
  referenceId: reference.referenceId,
  documentId: reference.documentId,
  documentTitle: reference.documentTitle,
  chunkId: reference.chunkId,
  chunkIndex: reference.chunkIndex,
  snippet: reference.snippet,
  content: reference.content,
  strategy: reference.strategy,
  similarityScore:
    reference.similarityScore === undefined
      ? null
      : Number(reference.similarityScore),
  rerankScore:
    reference.rerankScore === undefined
      ? null
      : Number(reference.rerankScore),
  metadata: reference.metadata ?? null,
  title: reference.documentTitle,
  category: extractCategory(reference.metadata),
});

const mapMessageDto = (dto: MessageDto): Message => ({
  id: dto.id,
  conversationId: dto.conversationId,
  role: dto.role,
  content: dto.content,
  sources: (dto.sources ?? []).map(normalizeReference),
  metadata: dto.metadata ?? null,
  createdAt: new Date(dto.createdAt),
});

const cloneTrace = (trace: RagTrace): RagTrace => ({
  ...trace,
  candidates: (trace.candidates ?? []).map((candidate) => ({ ...candidate })),
  references: (trace.references ?? []).map((reference) => ({
    ...reference,
  })),
  events: (trace.events ?? []).map((event) => ({ ...event })),
});

export function useChatController() {
  const {
    conversations,
    activeConversationId,
    setConversations,
    setActiveConversationId,
    addConversation,
    updateConversation,
    setConversationMessages,
    addMessageToConversation,
    updateMessageInConversation,
    deleteConversation,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceState>(null);
  const [sourceHistory, setSourceHistory] = useState<SourceAttachment[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const streamControllerRef = useRef<ReturnType<
    typeof streamConversationMessage
  > | null>(null);
  const pendingUserMessageIdRef = useRef<Message['id'] | null>(null);
  const pendingAssistantMessageIdRef = useRef<Message['id'] | null>(null);
  const streamingConversationIdRef = useRef<number | null>(null);
  const currentQueryRef = useRef('');
  const ragTraceRef = useRef<RagTrace | null>(null);

  const activeConversation = useMemo<Conversation | undefined>(() => {
    return conversations.find((c) => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  const loadConversationList = useCallback(async () => {
    try {
      const response = await fetchConversations({ pageSize: 50 });
      const mapped = response.items.map(mapConversationDto);
      setConversations(mapped);
      if (!activeConversationId && mapped.length > 0) {
        setActiveConversationId(mapped[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch conversations', error);
      notify.error('加载对话失败，请稍后再试');
    }
  }, [activeConversationId, setActiveConversationId, setConversations]);

  useEffect(() => {
    void loadConversationList();
  }, [loadConversationList]);

  const loadMessages = useCallback(
    async (conversationId: number) => {
      try {
        const response = await fetchMessages(conversationId, {
          pageSize: 200,
        });
        const mapped = response.items.map(mapMessageDto);
        setConversationMessages(conversationId, mapped);
      } catch (error) {
        console.error('Failed to fetch messages', error);
        notify.error('加载历史消息失败');
      }
    },
    [setConversationMessages],
  );

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }
    const target = conversations.find((conv) => conv.id === activeConversationId);
    if (target && !target.isMessagesLoaded) {
      void loadMessages(activeConversationId);
    }
  }, [activeConversationId, conversations, loadMessages]);

  useEffect(() => {
    return () => {
      streamControllerRef.current?.cancel();
    };
  }, []);

  const handleNewChat = useCallback(async () => {
    try {
      const created = await createConversation({
        title: '新对话',
      });
      const mapped = mapConversationDto(created);
      mapped.isMessagesLoaded = true;
      addConversation(mapped);
      setSelectedSource(null);
      setSourceHistory([]);
      setHistoryIndex(-1);
    } catch (error) {
      console.error('Failed to create conversation', error);
      notify.error('创建对话失败，请稍后再试');
    }
  }, [addConversation]);

  const ensureConversationForSend = useCallback(
    async (fallbackTitle: string) => {
      if (activeConversation) {
        return activeConversation;
      }
      try {
        const created = await createConversation({
          title: fallbackTitle || '新对话',
        });
        const mapped = mapConversationDto(created);
        mapped.isMessagesLoaded = true;
        addConversation(mapped);
        setActiveConversationId(mapped.id);
        return mapped;
      } catch (error) {
        console.error('Failed to create conversation before send', error);
        notify.error('创建对话失败，请稍后再试');
        return undefined;
      }
    },
    [activeConversation, addConversation, setActiveConversationId],
  );

  const finalizeStreamingState = useCallback(() => {
    streamControllerRef.current?.cancel();
    streamControllerRef.current = null;
    streamingConversationIdRef.current = null;
    pendingAssistantMessageIdRef.current = null;
    pendingUserMessageIdRef.current = null;
    ragTraceRef.current = null;
    currentQueryRef.current = '';
  }, []);

  const syncTraceToMessage = useCallback(() => {
    const trace = ragTraceRef.current;
    const conversationId = streamingConversationIdRef.current;
    const messageId = pendingAssistantMessageIdRef.current;
    if (!trace || !conversationId || !messageId) {
      return;
    }
    const snapshot = cloneTrace(trace);
    updateMessageInConversation(conversationId, messageId, (prev) => ({
      ...prev,
      ragTrace: snapshot,
    }));
  }, [updateMessageInConversation]);

  const applyTraceEvent = useCallback(
    (event: ConversationStreamEvent) => {
      if (!event?.type) {
        return;
      }
      const payload =
        event.data && typeof event.data === 'object'
          ? (event.data as Record<string, unknown>)
          : undefined;
      const ensureTrace = () => {
        if (!ragTraceRef.current) {
          ragTraceRef.current = {
            query: currentQueryRef.current,
            candidates: [],
            references: [],
            events: [],
          };
        }
        return ragTraceRef.current;
      };
      const trace = ensureTrace();
      trace.events.push({
        type: event.type,
        payload,
        timestamp: Date.now(),
      });

      switch (event.type) {
        case 'retrieval_decision': {
          const status =
            typeof payload?.status === 'string' ? payload.status : undefined;
          if (status === 'evaluating' || status === 'decided') {
            trace.decisionStatus = status;
          }
          const decisionValue =
            typeof payload?.decision === 'string' ? payload.decision : undefined;
          if (decisionValue === 'retrieve' || decisionValue === 'skip') {
            trace.decision = decisionValue;
          }
          if (typeof payload?.reason === 'string') {
            trace.decisionReason = payload.reason;
          }
          break;
        }
        case 'retrieval_start': {
          trace.knowledgeBaseUsed = true;
          trace.decision = trace.decision ?? 'retrieve';
          trace.decisionStatus = 'decided';
          trace.strategy =
            typeof payload?.strategy === 'string' ? payload.strategy : trace.strategy;
          trace.topK =
            typeof payload?.topK === 'number' ? payload.topK : trace.topK;
          trace.rerank =
            typeof payload?.rerank === 'boolean' ? payload.rerank : trace.rerank;
          trace.rerankModel =
            typeof payload?.rerankModel === 'string'
              ? payload.rerankModel
              : trace.rerankModel;
          trace.discardedReason = undefined;
          break;
        }
        case 'retrieval_skipped': {
          trace.knowledgeBaseUsed = false;
          trace.decision = 'skip';
          trace.decisionStatus = 'decided';
          trace.decisionReason =
            typeof payload?.reason === 'string'
              ? payload.reason
              : '模型判断无需查询知识库';
          trace.discardedReason = trace.decisionReason;
          trace.candidates = [];
          trace.references = [];
          break;
        }
        case 'retrieval_candidate': {
          if (payload) {
            const candidate = normalizeReference(payload as unknown as ConversationReferenceDto);
            candidate.internalId = `C${trace.candidates.length + 1}`;
            trace.candidates.push(candidate);
          }
          break;
        }
        case 'retrieval_completed':
        case 'rerank_completed': {
          const references = Array.isArray(payload?.references)
            ? (payload?.references as ConversationReferenceDto[])
            : [];
          trace.references = references.map(normalizeReference);
          if (trace.references.length > 0) {
            trace.discardedReason = undefined;
          }
          break;
        }
        case 'retrieval_discarded': {
          trace.references = [];
          const reason =
            typeof payload?.reason === 'string' ? payload.reason : undefined;
          trace.discardedReason = reason ?? '无可用参考';
          break;
        }
        case 'rerank_result': {
          const scores = Array.isArray(payload?.scores)
            ? (payload?.scores as Array<{ id?: string; score?: number }>)
            : [];
          trace.candidates = trace.candidates.map((candidate) => {
            const match = scores.find(
              (item) => item.id && item.id === candidate.internalId,
            );
            if (!match) return candidate;
            return {
              ...candidate,
              rerankScore:
                typeof match.score === 'number' ? match.score : candidate.rerankScore,
            };
          });
          break;
        }
        case 'llm_start': {
          trace.model =
            typeof payload?.model === 'string' ? payload.model : trace.model;
          break;
        }
        default:
          break;
      }

      syncTraceToMessage();
    },
    [syncTraceToMessage],
  );

  const appendAssistantToken = useCallback(
    (token: string) => {
      const conversationId = streamingConversationIdRef.current;
      const messageId = pendingAssistantMessageIdRef.current;
      if (!conversationId || !messageId || !token) {
        return;
      }
      updateMessageInConversation(conversationId, messageId, (prev) => ({
        ...prev,
        content: `${prev.content || ''}${token}`,
      }));
    },
    [updateMessageInConversation],
  );

  const finalizeMessages = useCallback(
    (payload: ConversationStreamCompletedPayload) => {
      const conversationId = payload.conversationId;
      const userTempId = pendingUserMessageIdRef.current;
      const assistantTempId = pendingAssistantMessageIdRef.current;
      if (userTempId !== null) {
        const normalizedUser = mapMessageDto(payload.userMessage);
        updateMessageInConversation(conversationId, userTempId, () => normalizedUser);
      }
      if (assistantTempId !== null) {
        const normalizedAssistant = mapMessageDto(payload.assistantMessage);
        const traceSnapshot = ragTraceRef.current
          ? cloneTrace(ragTraceRef.current)
          : undefined;
        if (traceSnapshot && traceSnapshot.references.length === 0) {
          traceSnapshot.references = (payload.references ?? []).map(
            normalizeReference,
          );
        }
        updateMessageInConversation(conversationId, assistantTempId, () => ({
          ...normalizedAssistant,
          isStreaming: false,
          ragTrace: traceSnapshot,
        }));
      }
      updateConversation(conversationId, { updatedAt: new Date() });
      setIsTyping(false);
      finalizeStreamingState();
    },
    [finalizeStreamingState, updateConversation, updateMessageInConversation],
  );

  const handleStreamError = useCallback(
    (error: Error) => {
      console.error('stream error', error);
      setIsTyping(false);
      const conversationId = streamingConversationIdRef.current;
      finalizeStreamingState();
      if (conversationId) {
        void loadMessages(conversationId);
      }
      notify.error(error.message || '对话出错，请稍后重试');
    },
    [finalizeStreamingState, loadMessages],
  );

  const handleSend = useCallback(
    async (text?: string) => {
      const contentToSend = (text ?? input).trim();
      if (!contentToSend) {
        return;
      }
      if (isTyping) {
        notify.warning('正在生成回答，请稍候');
        return;
      }

      const targetConversation =
        activeConversation ?? (await ensureConversationForSend(contentToSend));
      if (!targetConversation) {
        return;
      }

      if (!targetConversation.messages.length) {
        updateConversation(targetConversation.id, {
          title:
            contentToSend.length > 30
              ? `${contentToSend.slice(0, 30)}...`
              : contentToSend,
        });
      }

      const now = new Date();
      const tempUserId = `user-${now.getTime()}`;
      const userMessage: Message = {
        id: tempUserId,
        conversationId: targetConversation.id,
        role: 'user',
        content: contentToSend,
        createdAt: now,
      };
      addMessageToConversation(targetConversation.id, userMessage);

      const tempAssistantId = `assistant-${now.getTime()}`;
      const assistantMessage: Message = {
        id: tempAssistantId,
        conversationId: targetConversation.id,
        role: 'assistant',
        content: '',
        createdAt: now,
        isStreaming: true,
      };
      addMessageToConversation(targetConversation.id, assistantMessage);

      setInput('');
      setIsTyping(true);
      pendingUserMessageIdRef.current = tempUserId;
      pendingAssistantMessageIdRef.current = tempAssistantId;
      streamingConversationIdRef.current = targetConversation.id;
      currentQueryRef.current = contentToSend;
      ragTraceRef.current = {
        query: contentToSend,
        candidates: [],
        references: [],
        events: [],
      };
      syncTraceToMessage();

      streamControllerRef.current = streamConversationMessage(
        targetConversation.id,
        {
          query: contentToSend,
        },
        {
          onEvent: applyTraceEvent,
          onToken: appendAssistantToken,
          onCompleted: finalizeMessages,
          onError: handleStreamError,
        },
      );
    },
    [
      activeConversation,
      addMessageToConversation,
      applyTraceEvent,
      appendAssistantToken,
      ensureConversationForSend,
      finalizeMessages,
      handleStreamError,
      input,
      isTyping,
      syncTraceToMessage,
      updateConversation,
    ],
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: number) => {
      try {
        await deleteConversationApi(conversationId);
        deleteConversation(conversationId);
        if (activeConversationId === conversationId) {
          setSelectedSource(null);
          setSourceHistory([]);
          setHistoryIndex(-1);
        }
      } catch (error) {
        console.error('Failed to delete conversation', error);
        notify.error('删除对话失败，请稍后再试');
      }
    },
    [activeConversationId, deleteConversation],
  );

  const handleSourceClick = useCallback(
    (source: SourceAttachment) => {
      if (selectedSource) {
        const newHistory = sourceHistory.slice(0, historyIndex + 1);
        newHistory.push(selectedSource);
        setSourceHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      } else {
        setSourceHistory([]);
        setHistoryIndex(-1);
      }
      setSelectedSource(source);
    },
    [historyIndex, selectedSource, sourceHistory],
  );

  const handleBackward = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSelectedSource(sourceHistory[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setSelectedSource(sourceHistory[0]);
    }
  }, [historyIndex, sourceHistory]);

  const handleForward = useCallback(() => {
    if (historyIndex < sourceHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSelectedSource(sourceHistory[historyIndex + 1]);
    }
  }, [historyIndex, sourceHistory]);

  const handleHistoryItemClick = useCallback(
    (index: number) => {
      setHistoryIndex(index);
      setSelectedSource(sourceHistory[index]);
    },
    [sourceHistory],
  );

  const handleCloseSource = useCallback(() => {
    setSelectedSource(null);
    setSourceHistory([]);
    setHistoryIndex(-1);
  }, []);

  return {
    input,
    setInput,
    isTyping,
    conversations,
    activeConversationId,
    activeConversation,
    setActiveConversationId,
    handleNewChat,
    handleSend,
    handleDeleteConversation,
    selectedSource,
    sourceHistory,
    historyIndex,
    handleSourceClick,
    handleBackward,
    handleForward,
    handleHistoryItemClick,
    handleCloseSource,
  };
}
