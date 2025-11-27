import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Category } from '../entities';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const parent = await this.getParentCategory(createCategoryDto.parentId);
    const userId = createCategoryDto.userId ?? null;
    this.ensureParentOwnership(parent, userId);

    const level = this.calculateLevel(parent);
    this.ensureLevel(level);

    const payload: DeepPartial<Category> = {
      name: createCategoryDto.name,
      parentId: createCategoryDto.parentId ?? null,
      userId,
      sortOrder: createCategoryDto.sortOrder ?? 0,
      level,
      path: '',
    };

    const category = this.categoryRepository.create(payload);

    const saved = await this.categoryRepository.save(category);
    const path = this.buildPath(saved.id, parent);
    await this.categoryRepository.update(saved.id, { path });
    return this.findOne(saved.id);
  }

  async findAll(query: QueryCategoryDto) {
    const where: FindOptionsWhere<Category> = {};
    if (query.userId !== undefined) {
      where.userId = query.userId;
    }
    if (query.parentId !== undefined) {
      where.parentId = query.parentId;
    }

    return this.categoryRepository.find({
      where,
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`分类 ${id} 不存在`);
    }
    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);
    const nextParentId =
      updateCategoryDto.parentId ?? category.parentId ?? null;

    if (nextParentId === id) {
      throw new BadRequestException('不能将自己设为父分类');
    }

    const parent = await this.getParentCategory(nextParentId ?? undefined);
    const nextUserId =
      updateCategoryDto.userId !== undefined
        ? (updateCategoryDto.userId ?? null)
        : category.userId;
    this.ensureParentOwnership(parent, nextUserId);
    this.ensureParentNotDescendant(parent, id);

    const level = this.calculateLevel(parent);
    this.ensureLevel(level);

    const payload: QueryDeepPartialEntity<Category> = {
      name: updateCategoryDto.name ?? category.name,
      parentId: nextParentId,
      userId: nextUserId,
      sortOrder:
        updateCategoryDto.sortOrder !== undefined
          ? updateCategoryDto.sortOrder
          : category.sortOrder,
      level,
      path: this.buildPath(id, parent),
    };

    await this.categoryRepository.update(id, payload);
    const updated = await this.findOne(id);
    await this.refreshDescendantPath(updated);
    return updated;
  }

  async remove(id: number) {
    const category = await this.findOne(id);
    await this.categoryRepository.delete(id);
    return category;
  }

  private async getParentCategory(parentId?: number) {
    if (!parentId) {
      return null;
    }
    const parent = await this.categoryRepository.findOne({
      where: { id: parentId },
    });
    if (!parent) {
      throw new BadRequestException(`父分类 ${parentId} 不存在`);
    }
    return parent;
  }

  private ensureParentOwnership(
    parent: Category | null,
    userId: number | null,
  ) {
    if (!parent || userId === null || parent.userId === null) {
      return;
    }
    if (parent.userId !== userId) {
      throw new BadRequestException('父分类不属于该用户');
    }
  }

  private ensureParentNotDescendant(
    parent: Category | null,
    categoryId: number,
  ) {
    if (!parent || !parent.path) {
      return;
    }
    const segments = parent.path.split('/');
    if (segments.includes(String(categoryId))) {
      throw new BadRequestException('不能将子分类设置为父分类');
    }
  }

  private calculateLevel(parent: Category | null) {
    return parent ? parent.level + 1 : 1;
  }

  private ensureLevel(level: number) {
    if (level > 2) {
      throw new BadRequestException('仅支持两级分类');
    }
  }

  private buildPath(id: number, parent: Category | null) {
    if (!parent) {
      return `${id}`;
    }
    const base = parent.path?.length ? parent.path : `${parent.id}`;
    return `${base}/${id}`;
  }

  private async refreshDescendantPath(category: Category) {
    const children = await this.categoryRepository.find({
      where: { parentId: category.id },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    for (const child of children) {
      const level = category.level + 1;
      this.ensureLevel(level);
      const path = `${category.path}/${child.id}`;
      await this.categoryRepository.update(child.id, { level, path });
      child.level = level;
      child.path = path;
      await this.refreshDescendantPath(child);
    }
  }
}
