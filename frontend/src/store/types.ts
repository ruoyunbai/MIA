export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SourceAttachment {
  title: string;
  category: string;
  snippet: string;
  content?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceAttachment[];
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export interface Document {
  id: string;
  title: string;
  category: string;
  subCategory: string;
  status: 'active' | 'inactive';
  uploadDate: Date;
  content: string;
  fileType?: 'text' | 'pdf';
  fileUrl?: string;
}

export interface SubCategory {
  id: number;
  name: string;
  parentId: number;
  sortOrder: number;
}

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  subCategories: SubCategory[];
}
