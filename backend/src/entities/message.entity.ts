import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ comment: '所属会话ID' })
  conversationId: number;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column({
    type: 'enum',
    enum: MessageRole,
    comment: '消息角色',
  })
  role: MessageRole;

  @Column({ type: 'text', comment: '消息内容' })
  content: string;

  @Column({ type: 'json', nullable: true, comment: '引用来源' })
  sources: Record<string, any>[];

  @Column({ type: 'json', nullable: true, comment: '额外元数据(如token消耗)' })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
