import { create } from 'zustand';
import {
  createUserSlice,
  type UserSlice,
} from './slices/userSlice';
import {
  createChatSlice,
  type ChatSlice,
} from './slices/chatSlice';
import {
  createKnowledgeSlice,
  type KnowledgeSlice,
} from './slices/knowledgeSlice';

export type AppState = UserSlice & ChatSlice & KnowledgeSlice;

export const useAppStore = create<AppState>()((...args) => ({
  ...createUserSlice(...args),
  ...createChatSlice(...args),
  ...createKnowledgeSlice(...args),
}));
