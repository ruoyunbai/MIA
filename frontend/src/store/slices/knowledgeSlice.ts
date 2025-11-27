import type { StateCreator } from 'zustand';
import type { Category, Document } from '../types';

export interface KnowledgeSlice {
  documents: Document[];
  categories: Category[];
  setDocuments: (documents: Document[]) => void;
  setCategories: (categories: Category[]) => void;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
}

export const createKnowledgeSlice: StateCreator<KnowledgeSlice> = (set) => ({
  documents: [],
  categories: [],
  setDocuments: (documents) => set({ documents }),
  setCategories: (categories) => set({ categories }),
  addDocument: (doc) =>
    set((state) => ({ documents: [doc, ...state.documents] })),
  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d,
      ),
    })),
  deleteDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    })),
  addCategory: (category) =>
    set((state) => ({ categories: [...state.categories, category] })),
  updateCategory: (id, updates) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })),
  deleteCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    })),
});
