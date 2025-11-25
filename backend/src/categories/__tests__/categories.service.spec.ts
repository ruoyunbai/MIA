import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CategoriesService } from '../categories.service';
import { Category } from '../../entities';

type CategoryPartial = Partial<Category> & { id?: number };
type MockRepository = Pick<
  Repository<Category>,
  'create' | 'save' | 'findOne' | 'find' | 'update' | 'delete'
>;

const createRepository = (): MockRepository => {
  const store = new Map<number, Category>();
  let sequence = 1;

  return {
    create: jest.fn((payload: CategoryPartial) => payload as Category),
    save: jest.fn((entity: CategoryPartial) => {
      const id = entity.id ?? sequence++;
      const saved: Category = {
        id,
        name: entity.name ?? '',
        parentId: entity.parentId ?? null,
        userId: entity.userId ?? null,
        sortOrder: entity.sortOrder ?? 0,
        level: entity.level ?? 1,
        path: entity.path ?? '',
        parent: null,
        children: [],
        documents: [],
        createdAt: entity.createdAt ?? new Date(),
        updatedAt: entity.updatedAt ?? new Date(),
        user: null,
      };
      store.set(id, saved);
      return Promise.resolve(saved);
    }),
    findOne: jest.fn((options?: { where?: Partial<Category> }) => {
      const targetId = options?.where?.id;
      if (typeof targetId === 'number') {
        return Promise.resolve(store.get(targetId) ?? null);
      }
      return Promise.resolve(null);
    }),
    find: jest.fn((options?: { where?: Partial<Category> }) => {
      const values = Array.from(store.values());
      const where = options?.where;
      if (!where || Object.keys(where).length === 0) {
        return Promise.resolve(values);
      }
      const filtered = values.filter((item) => {
        return Object.entries(where).every(([key, value]) => {
          const typedKey = key as keyof Category;
          return item[typedKey] === value;
        });
      });
      return Promise.resolve(filtered);
    }),
    update: jest.fn((id: number, payload: Partial<Category>) => {
      const existing = store.get(id);
      if (existing) {
        const updated = { ...existing, ...payload } as Category;
        store.set(id, updated);
      }
      return Promise.resolve();
    }),
    delete: jest.fn((id: number) => {
      store.delete(id);
      return Promise.resolve();
    }),
  };
};

describe('CategoriesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a root category with level 1 and path equals id', async () => {
    const repository = createRepository();
    const service = new CategoriesService(repository as Repository<Category>);

    const result = await service.create({ name: 'Root', userId: 1 });

    expect(result.level).toBe(1);
    expect(result.path).toBe(String(result.id));
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(result.id, {
      path: result.path,
    });
  });

  it('should create second-level category and build path from parent', async () => {
    const repository = createRepository();
    const service = new CategoriesService(repository as Repository<Category>);
    const parent = await service.create({ name: 'Parent', userId: 1 });

    const child = await service.create({
      name: 'Child',
      userId: 1,
      parentId: parent.id,
    });

    expect(child.level).toBe(2);
    expect(child.path).toBe(`${parent.path}/${child.id}`);
  });

  it('should prevent creating third-level category', async () => {
    const repository = createRepository();
    const service = new CategoriesService(repository as Repository<Category>);
    const parent = await service.create({ name: 'Parent', userId: 1 });
    const child = await service.create({
      name: 'Child',
      userId: 1,
      parentId: parent.id,
    });

    await expect(
      service.create({ name: 'Grandchild', userId: 1, parentId: child.id }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
