import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { DocumentChunk } from './document-chunk.entity';
import { User } from './user.entity';

export enum DocumentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PROCESSING = 'processing',
  FAILED = 'failed',
}

export enum DocumentIngestionStatus {
  UPLOADED = 'uploaded',
  CHUNKED = 'chunked',
  EMBEDDED = 'embedded',
  INDEXED = 'indexed',
  FAILED = 'failed',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 255, comment: '文档标题' })
  title: string;

  @Column({ type: 'text', nullable: true, comment: '文档原始内容' })
  content: string;

  @Column({ nullable: true, comment: '分类ID' })
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.documents, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true, comment: '创建者ID' })
  userId: number;

  @ManyToOne(() => User, (user) => user.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.ACTIVE,
    comment: '文档状态',
  })
  status: DocumentStatus;

  @Column({ type: 'json', nullable: true, comment: '元数据(作者/来源/标签等)' })
  metaInfo: Record<string, any>;

  @Column({ length: 500, nullable: true, comment: '原始文件URL(如果是PDF等)' })
  fileUrl: string;

  @Column({ length: 64, nullable: true, comment: '内容哈希，用于去重' })
  contentHash: string;

  @Column({
    type: 'enum',
    enum: DocumentIngestionStatus,
    default: DocumentIngestionStatus.UPLOADED,
    comment: '文档入库状态',
  })
  ingestionStatus: DocumentIngestionStatus;

  @Column({ type: 'text', nullable: true, comment: '入库失败原因' })
  ingestionError: string;

  @Column({ type: 'timestamp', nullable: true, comment: '完成切片时间' })
  chunkedAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: '生成Embedding时间' })
  embeddedAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: '写入索引时间' })
  indexedAt: Date;

  @Column({ default: 0, comment: '入库重试次数' })
  ingestionRetryCount: number;

  @Column({ type: 'timestamp', nullable: true, comment: '最近一次重试时间' })
  lastIngestionRetryAt: Date;

  @OneToMany(() => DocumentChunk, (chunk) => chunk.document)
  chunks: DocumentChunk[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
