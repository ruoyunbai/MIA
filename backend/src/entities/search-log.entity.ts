import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('search_logs')
export class SearchLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ nullable: true, comment: '用户ID' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text', comment: '用户搜索/提问内容' })
  query: string;

  @Column({ default: 0, comment: '匹配到的知识点数量' })
  resultCount: number;

  @Column({ type: 'float', nullable: true, comment: '最高匹配分数' })
  topScore: number;

  @Column({ default: 0, comment: '耗时(ms)' })
  latency: number;

  @Column({ type: 'json', nullable: true, comment: '命中的文档ID列表' })
  matchedDocIds: number[];

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
