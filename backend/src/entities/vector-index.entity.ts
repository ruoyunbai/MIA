import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { DocumentChunk } from './document-chunk.entity';

@Entity('vector_indices')
export class VectorIndex {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ comment: '关联的切片ID' })
  chunkId: number;

  @ManyToOne(() => DocumentChunk, (chunk) => chunk.vectorIndices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'chunkId' })
  chunk: DocumentChunk;

  @Index()
  @Column({ length: 100, comment: 'ChromaDB中的ID' })
  chromaId: string;

  @Column({ length: 100, comment: '使用的Embedding模型' })
  embeddingModel: string;

  @Column({ default: 1536, comment: '向量维度' })
  dimension: number;

  @Column({ type: 'json', nullable: true, comment: '向量存储的额外元数据' })
  vectorMetadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
