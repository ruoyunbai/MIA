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

  async create(userId: number, createCategoryDto: CreateCategoryDto) {
    const parent = await this.getParentCategory(
      userId,
      createCategoryDto.parentId,
    );

    const level = this.calculateLevel(parent);
    this.ensureLevel(level);

    const payload: DeepPartial<Category> = {
      name: createCategoryDto.name,
      parentId: parent?.id ?? null,
      userId,
      sortOrder: createCategoryDto.sortOrder ?? 0,
      level,
      path: '',
    };

    const category = this.categoryRepository.create(payload);

    const saved = await this.categoryRepository.save(category);
    const path = this.buildPath(saved.id, parent);
    await this.categoryRepository.update(saved.id, { path });
    return this.findOne(userId, saved.id);
  }

  async findAll(userId: number, query: QueryCategoryDto) {
    const where: FindOptionsWhere<Category> = { userId };
    if (query.parentId !== undefined) {
      where.parentId = query.parentId;
    }

    return this.categoryRepository.find({
      where,
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findOne(userId: number, id: number) {
    return this.getOwnedCategory(id, userId);
  }

  async update(
    userId: number,
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.getOwnedCategory(id, userId);
    const nextParentId =
      updateCategoryDto.parentId ?? category.parentId ?? null;

    if (nextParentId === id) {
      throw new BadRequestException('不能将自己设为父分类');
    }

    const parent = await this.getParentCategory(
      userId,
      nextParentId ?? undefined,
    );
    this.ensureParentNotDescendant(parent, id);

    const level = this.calculateLevel(parent);
    this.ensureLevel(level);

    const payload: QueryDeepPartialEntity<Category> = {
      name: updateCategoryDto.name ?? category.name,
      parentId: nextParentId,
      userId,
      sortOrder:
        updateCategoryDto.sortOrder !== undefined
          ? updateCategoryDto.sortOrder
          : category.sortOrder,
      level,
      path: this.buildPath(id, parent),
    };

    await this.categoryRepository.update(id, payload);
    const updated = await this.findOne(userId, id);
    await this.refreshDescendantPath(updated, userId);
    return updated;
  }

  async remove(userId: number, id: number) {
    const category = await this.getOwnedCategory(id, userId);
    await this.categoryRepository.delete(id);
    return category;
  }

  private async getParentCategory(userId: number, parentId?: number) {
    if (!parentId) {
      return null;
    }
    const parent = await this.categoryRepository.findOne({
      where: { id: parentId, userId },
    });
    if (!parent) {
      throw new BadRequestException(`父分类 ${parentId} 不存在`);
    }
    return parent;
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

  private async refreshDescendantPath(category: Category, userId: number) {
    const children = await this.categoryRepository.find({
      where: { parentId: category.id, userId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    for (const child of children) {
      const level = category.level + 1;
      this.ensureLevel(level);
      const path = `${category.path}/${child.id}`;
      await this.categoryRepository.update(child.id, { level, path });
      child.level = level;
      child.path = path;
      await this.refreshDescendantPath(child, userId);
    }
  }

  private async getOwnedCategory(id: number, userId: number) {
    const category = await this.categoryRepository.findOne({
      where: { id, userId },
    });
    if (!category) {
      throw new NotFoundException(`分类 ${id} 不存在`);
    }
    return category;
  }
}
