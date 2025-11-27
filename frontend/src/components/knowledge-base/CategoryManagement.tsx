import { FolderTree, Plus, Edit, Trash2, Tag } from "lucide-react";
import styles from "./CategoryManagement.module.css";
import type { Category, SubCategory } from "../../store/types";

interface CategoryManagementProps {
  categories: Category[];
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (id: number) => void;
  onAddSubCategory: (category: Category) => void;
  onEditSubCategory: (category: Category, subCategory: SubCategory) => void;
  onDeleteSubCategory: (categoryId: number, subCategoryId: number) => void;
}

export function CategoryManagement({
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddSubCategory,
  onEditSubCategory,
  onDeleteSubCategory,
}: CategoryManagementProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h2>分类管理</h2>
          <p>管理业务分类和场景分类的两级结构</p>
        </div>

        <button type="button" className={styles.outlineButton} onClick={onAddCategory}>
          <Plus size={16} />
          添加业务分类
        </button>
      </div>

      <div className={styles.categoryList}>
        {categories.map((category) => (
          <div key={category.id} className={styles.categoryCard}>
            <div className={styles.categoryHeader}>
              <div className={styles.categoryInfo}>
                <div className={styles.categoryIcon}>
                  <FolderTree size={20} />
                </div>
                <div className={styles.categoryMeta}>
                  <h3>{category.name}</h3>
                  <p>{category.subCategories.length} 个场景分类</p>
                </div>
              </div>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.outlineButton}
                  onClick={() => onAddSubCategory(category)}
                >
                  <Plus size={14} />
                  添加场景
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => onEditCategory(category)}
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => onDeleteCategory(category.id)}
                >
                  <Trash2 size={14} color="#dc2626" />
                </button>
              </div>
            </div>

            {category.subCategories.length > 0 && (
              <div className={styles.subCategoryList}>
                {category.subCategories.map((subCat) => (
                  <div key={subCat.id} className={styles.subCategoryItem}>
                    <div className={styles.subCategoryInfo}>
                      <Tag size={14} color="#94a3b8" />
                      <span>{subCat.name}</span>
                    </div>

                    <div className={styles.actionRow}>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        onClick={() => onEditSubCategory(category, subCat)}
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        onClick={() => onDeleteSubCategory(category.id, subCat.id)}
                      >
                        <Trash2 size={12} color="#dc2626" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {categories.length === 0 && (
          <div className={styles.emptyState}>
            <FolderTree size={48} color="#cbd5f5" style={{ margin: "0 auto 0.5rem" }} />
            <p>暂无分类</p>
          </div>
        )}
      </div>
    </div>
  );
}
