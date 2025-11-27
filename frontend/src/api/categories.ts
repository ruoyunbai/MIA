import request from '../utils/request';
import type {
  CategoryDto,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../../../shared/api-contracts';

export const fetchCategories = () => {
  return request.get<CategoryDto[], CategoryDto[]>('/categories');
};

export const createCategory = (payload: CreateCategoryRequest) => {
  return request.post<CategoryDto, CategoryDto>('/categories', payload);
};

export const updateCategory = (
  id: number,
  payload: UpdateCategoryRequest,
) => {
  return request.patch<CategoryDto, CategoryDto>(`/categories/${id}`, payload);
};

export const deleteCategory = (id: number) => {
  return request.delete<null, null>(`/categories/${id}`);
};
