import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { Category } from './category.entity';
import { Document } from './document.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ length: 255, unique: true, nullable: true, comment: '邮箱' })
    email: string;

    @Column({ length: 20, unique: true, nullable: true, comment: '手机号' })
    phone: string;

    @Column({ length: 100, comment: '用户名' })
    name: string;

    @Column({ length: 255, nullable: true, select: false, comment: '密码哈希' })
    passwordHash: string;

    @Column({ length: 500, nullable: true, comment: '头像URL' })
    avatarUrl: string;

    @Column({ length: 100, nullable: true, unique: true, comment: '抖音OpenID' })
    douyinOpenId: string;

    @OneToMany(() => Conversation, (conversation) => conversation.user)
    conversations: Conversation[];

    @OneToMany(() => Category, (category) => category.user)
    categories: Category[];

    @OneToMany(() => Document, (document) => document.user)
    documents: Document[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
