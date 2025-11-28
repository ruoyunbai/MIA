import type { StateCreator } from 'zustand';
import type { Conversation, Message } from '../types';

export interface ChatSlice {
  conversations: Conversation[];
  activeConversationId: number | null;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: number | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: number, updates: Partial<Conversation>) => void;
  setConversationMessages: (conversationId: number, messages: Message[]) => void;
  addMessageToConversation: (conversationId: number, message: Message) => void;
  updateMessageInConversation: (
    conversationId: number,
    messageId: Message['id'],
    updater: (message: Message) => Message,
  ) => void;
  deleteConversation: (id: number) => void;
}

export const createChatSlice: StateCreator<ChatSlice> = (set) => ({
  conversations: [],
  activeConversationId: null,
  setConversations: (incoming) =>
    set((state) => {
      const existingMap = new Map(state.conversations.map((c) => [c.id, c]));
      const next = incoming.map((conversation) => {
        const current = existingMap.get(conversation.id);
        if (!current) {
          return conversation;
        }
        return {
          ...conversation,
          messages: current.messages,
          isMessagesLoaded: current.isMessagesLoaded,
        };
      });
      return { conversations: next };
    }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: conversation.id,
    })),
  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })),
  setConversationMessages: (conversationId, messages) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages, isMessagesLoaded: true }
          : c,
      ),
    })),
  addMessageToConversation: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message] }
          : c,
      ),
    })),
  updateMessageInConversation: (conversationId, messageId, updater) =>
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) {
          return c;
        }
        return {
          ...c,
          messages: c.messages.map((message) =>
            message.id === messageId ? updater(message) : message,
          ),
        };
      }),
    })),
  deleteConversation: (id) =>
    set((state) => {
      const filtered = state.conversations.filter((c) => c.id !== id);
      const nextActive =
        state.activeConversationId === id
          ? filtered[0]?.id ?? null
          : state.activeConversationId;
      return {
        conversations: filtered,
        activeConversationId: nextActive,
      };
    }),
});
