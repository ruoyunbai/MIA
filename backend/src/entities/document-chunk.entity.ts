import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';
import { VectorIndex } from './vector-index.entity';

@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ comment: '所属文档ID' })
  documentId: number;

  @ManyToOne(() => Document, (document) => document.chunks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column({ type: 'text', comment: '切片文本内容' })
  content: string;

  @Column({ comment: '切片在文档中的顺序索引' })
  chunkIndex: number;

  @Column({ default: 0, comment: 'Token数量估算' })
  tokenCount: number;

  @Column({ type: 'json', nullable: true, comment: '切片特定元数据' })
  metadata: Record<string, any>;

  @OneToMany(() => VectorIndex, (vectorIndex) => vectorIndex.chunk)
  vectorIndices: VectorIndex[];

  @CreateDateColumn()
  createdAt: Date;
}
