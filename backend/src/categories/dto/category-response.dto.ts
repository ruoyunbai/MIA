import { Category } from '../../entities';

export class CategoryResponseDto {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  level: number;
  path: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(category: Category): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = category.id;
    dto.name = category.name;
    dto.parentId = category.parentId ?? null;
    dto.sortOrder = category.sortOrder;
    dto.level = category.level;
    dto.path = category.path;
    dto.createdAt = category.createdAt;
    dto.updatedAt = category.updatedAt;
    return dto;
  }

  static fromEntities(categories: Category[]): CategoryResponseDto[] {
    return categories.map((category) =>
      CategoryResponseDto.fromEntity(category),
    );
  }
}
