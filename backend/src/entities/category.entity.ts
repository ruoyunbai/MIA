import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    Check,
} from 'typeorm';
import { Document } from './document.entity';
import { User } from './user.entity';

@Entity('categories')
@Check('level <= 2')
export class Category {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ length: 100, comment: '分类名称' })
    name: string;

    @Column({ nullable: true, comment: '父分类ID' })
    parentId: number;

    @ManyToOne(() => Category, (category) => category.children, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'parentId' })
    parent: Category;

    @OneToMany(() => Category, (category) => category.parent)
    children: Category[];

    @Column({ nullable: true, comment: '创建者ID' })
    userId: number;

    @ManyToOne(() => User, (user) => user.categories, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ default: 0, comment: '排序权重' })
    sortOrder: number;

    @Column({ default: 1, comment: '层级深度' })
    level: number;

    @Column({ length: 255, default: '', comment: '层级路径，如 0/1/5' })
    path: string;

    @OneToMany(() => Document, (document) => document.category)
    documents: Document[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
