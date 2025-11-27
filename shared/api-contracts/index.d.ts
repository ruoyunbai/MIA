export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface CategoryDto {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  level: number;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  parentId?: number;
  sortOrder?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  parentId?: number | null;
  sortOrder?: number;
}
