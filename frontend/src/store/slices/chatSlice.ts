import type { StateCreator } from 'zustand';
import type { Conversation, Message } from '../types';

const createConversationEntity = (): Conversation => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: '新对话',
  messages: [],
  createdAt: new Date(),
});

export interface ChatSlice {
  conversations: Conversation[];
  activeConversationId: string | null;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  ensureConversation: () => Conversation;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  addMessageToConversation: (conversationId: string, message: Message) => void;
  deleteConversation: (id: string) => void;
}

export const createChatSlice: StateCreator<ChatSlice> = (set, get) => ({
  conversations: [],
  activeConversationId: null,
  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  ensureConversation: () => {
    const { conversations, activeConversationId } = get();
    const existing =
      conversations.find((c) => c.id === activeConversationId) ??
      conversations[0];
    if (existing) {
      if (activeConversationId !== existing.id) {
        set({ activeConversationId: existing.id });
      }
      return existing;
    }

    const fresh = createConversationEntity();
    set((state) => ({
      conversations: [fresh, ...state.conversations],
      activeConversationId: fresh.id,
    }));
    return fresh;
  },
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
  addMessageToConversation: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message] }
          : c,
      ),
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
