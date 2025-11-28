import request from '../utils/request';
import { getAuthToken } from '../utils/authToken';

export interface ConversationDto {
  id: number;
  title: string;
  userId: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListResponse {
  items: ConversationDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ConversationReferenceDto {
  referenceId?: string;
  documentId?: number;
  documentTitle: string;
  chunkId?: number;
  chunkIndex?: number;
  snippet: string;
  content: string;
  strategy?: string;
  similarityScore?: number | null;
  rerankScore?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface MessageDto {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources: ConversationReferenceDto[] | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface MessageListResponse {
  items: MessageDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SendMessagePayload {
  query: string;
  ragStrategy?: string;
  topK?: number;
  retrievalLimit?: number;
  neighborSize?: number;
  maxContextLength?: number;
  rerank?: boolean;
  temperature?: number;
  model?: string;
  systemPrompt?: string;
  documentFilter?: number[];
}

export interface ConversationStreamEvent {
  type: string;
  data?: unknown;
}

export interface ConversationStreamCompletedPayload {
  conversationId: number;
  userMessage: MessageDto;
  assistantMessage: MessageDto;
  references: ConversationReferenceDto[];
}

export interface ConversationStreamCallbacks {
  onEvent?: (event: ConversationStreamEvent) => void;
  onToken?: (token: string) => void;
  onCompleted?: (payload: ConversationStreamCompletedPayload) => void;
  onError?: (error: Error) => void;
}

export interface ConversationStreamController {
  cancel: () => void;
}

const API_PREFIX = '/conversations';

const getBaseUrl = () => {
  const base = import.meta.env.VITE_API_URL || '/api';
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

export function fetchConversations(params?: {
  page?: number;
  pageSize?: number;
}) {
  return request.get<ConversationListResponse, ConversationListResponse>(
    `${API_PREFIX}`,
    {
      params,
    },
  );
}

export function createConversation(payload?: { title?: string }) {
  return request.post<typeof payload, ConversationDto>(`${API_PREFIX}`, payload);
}

export function deleteConversationApi(conversationId: number) {
  return request.delete<ConversationDto, ConversationDto>(
    `${API_PREFIX}/${conversationId}`,
  );
}

export function fetchMessages(conversationId: number, params?: { page?: number; pageSize?: number }) {
  return request.get<MessageListResponse, MessageListResponse>(
    `${API_PREFIX}/${conversationId}/messages`,
    {
      params,
    },
  );
}

export function sendMessage(
  conversationId: number,
  payload: SendMessagePayload,
) {
  return request.post<SendMessagePayload, ConversationStreamCompletedPayload>(
    `${API_PREFIX}/${conversationId}/messages`,
    payload,
  );
}

export function streamConversationMessage(
  conversationId: number,
  payload: SendMessagePayload,
  callbacks: ConversationStreamCallbacks,
): ConversationStreamController {
  const abortController = new AbortController();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${API_PREFIX}/${conversationId}/messages/stream`;
  const token = getAuthToken();

  const run = async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        const message = await response.text().catch(() => '');
        throw new Error(
          message || `消息流启动失败（${response.status}）`,
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        buffer = processBuffer(buffer, (event) => {
          if (event.type === 'error') {
            const message = extractErrorMessage(event.data);
            callbacks.onError?.(new Error(message));
            abortController.abort();
            return;
          }
          callbacks.onEvent?.(event);
          if (event.type === 'answer_token') {
            const tokenValue = extractToken(event.data);
            if (tokenValue) {
              callbacks.onToken?.(tokenValue);
            }
            return;
          }
          if (event.type === 'answer_completed' && event.data) {
            callbacks.onCompleted?.(
              event.data as ConversationStreamCompletedPayload,
            );
          }
        });
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        return;
      }
      callbacks.onError?.(error as Error);
    }
  };

  void run();

  return {
    cancel: () => abortController.abort(),
  };
}

const processBuffer = (
  buffer: string,
  handleEvent: (event: ConversationStreamEvent) => void,
) => {
  let remaining = buffer;
  while (true) {
    const delimiterIndex = remaining.indexOf('\n\n');
    if (delimiterIndex === -1) {
      break;
    }
    const rawEvent = remaining.slice(0, delimiterIndex).trim();
    remaining = remaining.slice(delimiterIndex + 2);
    if (!rawEvent) {
      continue;
    }
    const event = parseEvent(rawEvent);
    if (event) {
      handleEvent(event);
    }
  }
  return remaining;
};

const parseEvent = (block: string): ConversationStreamEvent | null => {
  const lines = block.split(/\r?\n/);
  let type = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    if (line.startsWith('event:')) {
      type = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  const dataRaw = dataLines.join('\n');
  let data: unknown = undefined;
  if (dataRaw) {
    data = tryParseJson(dataRaw);
  }

  return { type, data };
};

const tryParseJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const extractToken = (data: unknown) => {
  if (!data) {
    return '';
  }
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data === 'object' && 'token' in data) {
    const token = (data as Record<string, unknown>).token;
    return typeof token === 'string' ? token : '';
  }
  return '';
};

const extractErrorMessage = (data: unknown) => {
  if (!data) {
    return '流式响应失败';
  }
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data === 'object' && 'message' in data) {
    const message = (data as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return '流式响应失败';
};
