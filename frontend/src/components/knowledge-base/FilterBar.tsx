import { Search, Filter, Tag } from "lucide-react";
import styles from "./FilterBar.module.css";
import type { Category, SubCategory } from "../../store/types";

interface KnowledgeFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterCategory: string;
  onFilterCategoryChange: (value: string) => void;
  filterSubCategory: string;
  onFilterSubCategoryChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  categories: Category[];
  availableSubCategories: SubCategory[];
}

export function KnowledgeFilterBar({
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterCategoryChange,
  filterSubCategory,
  onFilterSubCategoryChange,
  filterStatus,
  onFilterStatusChange,
  categories,
  availableSubCategories,
}: KnowledgeFilterBarProps) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.searchField}>
        <Search className={styles.searchIcon} size={16} />
        <input
          placeholder="搜索文档标题或内容..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className={styles.filters}>
        <div>
          <label className="visually-hidden" htmlFor="filter-category">
            业务分类
          </label>
          <div style={{ position: "relative" }}>
            <Filter className={styles.searchIcon} size={16} />
            <select
              id="filter-category"
              className={`${styles.select} ${styles.selectWithIcon}`}
              value={filterCategory}
              onChange={(e) => {
                onFilterCategoryChange(e.target.value);
                onFilterSubCategoryChange("all");
              }}
            >
              <option value="all">全部业务</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="visually-hidden" htmlFor="filter-sub">
            场景分类
          </label>
          <div style={{ position: "relative" }}>
            <Tag className={styles.searchIcon} size={16} />
            <select
              id="filter-sub"
              className={`${styles.select} ${styles.selectWithIcon}`}
              value={filterSubCategory}
              onChange={(e) => onFilterSubCategoryChange(e.target.value)}
              disabled={filterCategory === "all"}
            >
              <option value="all">全部场景</option>
              {availableSubCategories.map((sub) => (
                <option key={sub.id} value={sub.name}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="visually-hidden" htmlFor="filter-status">
            状态
          </label>
          <select
            id="filter-status"
            className={styles.select}
            value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="active">生效中</option>
            <option value="inactive">已失效</option>
          </select>
        </div>
      </div>
    </div>
  );
}
