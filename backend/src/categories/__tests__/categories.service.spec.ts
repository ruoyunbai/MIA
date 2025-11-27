import * as path from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dotenv from 'dotenv';
import { CategoriesService } from '../categories.service';
import {
  Category,
  Conversation,
  Document,
  DocumentChunk,
  Message,
  SearchLog,
  User,
  VectorIndex,
} from '../../entities';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const shouldRunIntegration =
  process.env.CATEGORIES_DB_TEST === 'true' ||
  process.env.RUN_CATEGORY_DB_TEST === 'true';
const describeCategory = shouldRunIntegration ? describe : describe.skip;

describeCategory('CategoriesService (integration)', () => {
  let moduleRef: TestingModule;
  let service: CategoriesService;
  let repository: Repository<Category>;
  let userRepository: Repository<User>;
  let testUser: User;
  const createdIds: number[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'mysql',
            host: configService.get<string>('DB_HOST'),
            port: configService.get<number>('DB_PORT'),
            username: configService.get<string>('DB_USERNAME'),
            password: configService.get<string>('DB_PASSWORD'),
            database: configService.get<string>('DB_DATABASE'),
            entities: [
              Category,
              Document,
              DocumentChunk,
              VectorIndex,
              User,
              Conversation,
              Message,
              SearchLog,
            ],
            synchronize: true,
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([Category, User]),
      ],
      providers: [CategoriesService],
    }).compile();

    service = moduleRef.get(CategoriesService);
    repository = moduleRef.get(getRepositoryToken(Category));
    userRepository = moduleRef.get(getRepositoryToken(User));

    testUser = await userRepository.save(
      userRepository.create({
        name: `integration-user-${Date.now()}`,
        email: `integration-${Date.now()}@example.com`,
      }),
    );
  });

  afterAll(async () => {
    if (createdIds.length) {
      await repository.delete(createdIds);
    }
    if (testUser?.id) {
      await userRepository.delete(testUser.id);
    }
    await moduleRef.close();
  });

  it('creates a root category and persists to database', async () => {
    const root = await service.create(testUser.id, {
      name: `Integration Root ${Date.now()}`,
    });

    createdIds.push(root.id);
    const stored = await repository.findOne({ where: { id: root.id } });

    expect(stored).toBeDefined();
    expect(root.level).toBe(1);
    expect(root.path).toBe(String(root.id));
    expect(stored?.name).toBeDefined();
  });

  it('creates second-level category under a parent', async () => {
    const parent = await service.create(testUser.id, {
      name: `Integration Parent ${Date.now()}`,
    });
    createdIds.push(parent.id);

    const child = await service.create(testUser.id, {
      name: `Integration Child ${Date.now()}`,
      parentId: parent.id,
    });
    createdIds.push(child.id);

    expect(child.level).toBe(2);
    expect(child.path).toBe(`${parent.path}/${child.id}`);
  });

  it('rejects third-level category creation', async () => {
    const parent = await service.create(testUser.id, {
      name: `Integration Parent 2 ${Date.now()}`,
    });
    createdIds.push(parent.id);

    const child = await service.create(testUser.id, {
      name: `Integration Child 2 ${Date.now()}`,
      parentId: parent.id,
    });
    createdIds.push(child.id);

    await expect(
      service.create(testUser.id, {
        name: `Integration Third ${Date.now()}`,
        parentId: child.id,
      }),
    ).rejects.toThrow();
  });
});
