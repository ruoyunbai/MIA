import { useState, type ReactNode, type MouseEvent } from "react";
import { Upload, FileText, Plus, AlertCircle, FolderTree } from "lucide-react";
import { useKnowledgeBase } from "../hooks/useKnowledgeBase";
import { KnowledgeFilterBar } from "./knowledge-base/FilterBar";
import { KnowledgeDocumentTable } from "./knowledge-base/DocumentTable";
import { CategoryManagement } from "./knowledge-base/CategoryManagement";
import styles from "./KnowledgeBase.module.css";

interface KnowledgeBaseProps {
  onOpenEditor: (state: {
    isOpen: boolean;
    title: string;
    content: string;
    category: string;
    subCategory: string;
    status: "active" | "inactive";
    onSave: (content: string) => void;
  }) => void;
}

const TAB_OPTIONS = [
  { id: "documents", label: "文档管理", icon: FileText },
  { id: "categories", label: "分类管理", icon: FolderTree },
] as const;

type TabId = (typeof TAB_OPTIONS)[number]["id"];

export function KnowledgeBase({ onOpenEditor }: KnowledgeBaseProps) {
  const [activeTab, setActiveTab] = useState<TabId>("documents");
  const {
    documents,
    categories,
    filteredDocuments,
    availableSubCategories,
    selectedCategory,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    filterSubCategory,
    setFilterSubCategory,
    filterStatus,
    setFilterStatus,
    isAddDialogOpen,
    handleDocumentDialogOpenChange,
    inputMethod,
    setInputMethod,
    newDoc,
    setNewDoc,
    newCategoryName,
    setNewCategoryName,
    newSubCategoryName,
    setNewSubCategoryName,
    editingCategory,
    editingSubCategory,
    selectedCategoryForSub,
    isAddCategoryDialogOpen,
    handleCategoryDialogOpenChange,
    isAddSubCategoryDialogOpen,
    handleSubCategoryDialogOpenChange,
    beginCreateCategory,
    beginEditCategory,
    beginCreateSubCategory,
    beginEditSubCategory,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleAddSubCategory,
    handleUpdateSubCategory,
    handleDeleteSubCategory,
    handleProceedToEditor,
    handleFileUpload,
    toggleStatus,
    deleteDocument,
  } = useKnowledgeBase(onOpenEditor);

  const activeDocumentCount = (categoryName: string) =>
    documents.filter(
      (doc) => doc.category === categoryName && doc.status === "active",
    ).length;

  const canProceed =
    newDoc.title &&
    newDoc.category &&
    newDoc.subCategory &&
    (inputMethod === "pdf" ? Boolean(newDoc.content) : true);

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {TAB_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`${styles.tabButton} ${activeTab === id ? styles.tabButtonActive : ""}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "documents" && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>知识库管理</h2>
              <p>管理所有业务知识文档，支持分类、上传和状态控制</p>
            </div>
            <button
              type="button"
              className={styles.buttonPrimary}
              onClick={() => handleDocumentDialogOpenChange(true)}
            >
              <Plus size={16} />
              添加文档
            </button>
          </div>

          <KnowledgeFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterCategory={filterCategory}
            onFilterCategoryChange={setFilterCategory}
            filterSubCategory={filterSubCategory}
            onFilterSubCategoryChange={setFilterSubCategory}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            categories={categories}
            availableSubCategories={availableSubCategories}
          />

          <KnowledgeDocumentTable
            documents={filteredDocuments}
            onToggleStatus={toggleStatus}
            onDelete={deleteDocument}
          />

          <div className={styles.categoryStats}>
            {categories.map((category) => (
              <div key={category.id} className={styles.categoryStatCard}>
                <h3>{category.name}</h3>
                <p className={styles.categoryStatValue}>{activeDocumentCount(category.name)}</p>
                <p>个生效文档</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <CategoryManagement
          categories={categories}
          onAddCategory={beginCreateCategory}
          onEditCategory={beginEditCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddSubCategory={beginCreateSubCategory}
          onEditSubCategory={beginEditSubCategory}
          onDeleteSubCategory={handleDeleteSubCategory}
        />
      )}

      <Modal
        open={isAddDialogOpen}
        title="添加知识文档"
        description="选择录入方式：富文本编辑或上传 PDF"
        onClose={() => handleDocumentDialogOpenChange(false)}
        footer={
          <>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => handleDocumentDialogOpenChange(false)}
            >
              取消
            </button>
            <button
              type="button"
              className={styles.buttonPrimary}
              onClick={handleProceedToEditor}
              disabled={!canProceed}
            >
              {inputMethod === "richtext" ? "下一步" : "保存"}
            </button>
          </>
        }
      >
        <div className={styles.formGroup}>
          <span className={styles.label}>录入方式</span>
          <div className={styles.radioGroup}>
            <button
              type="button"
              className={`${styles.radioOption} ${inputMethod === "richtext" ? styles.radioOptionActive : ""}`}
              onClick={() => setInputMethod("richtext")}
            >
              <FileText size={20} />
              <p>富文本编辑</p>
            </button>
            <button
              type="button"
              className={`${styles.radioOption} ${inputMethod === "pdf" ? styles.radioOptionActive : ""}`}
              onClick={() => setInputMethod("pdf")}
            >
              <Upload size={20} />
              <p>上传 PDF</p>
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>文档标题</label>
          <input
            className={styles.input}
            placeholder="请输入文档标题"
            value={newDoc.title}
            onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>业务分类</label>
            <select
              className={styles.select}
              value={newDoc.category}
              onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value, subCategory: "" })}
            >
              <option value="">选择业务分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>场景分类</label>
            <select
              className={styles.select}
              value={newDoc.subCategory}
              onChange={(e) => setNewDoc({ ...newDoc, subCategory: e.target.value })}
              disabled={!newDoc.category}
            >
              <option value="">选择场景分类</option>
              {selectedCategory?.subCategories.map((sub) => (
                <option key={sub.id} value={sub.name}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {inputMethod === "pdf" && (
          <div className={styles.formGroup}>
            <label className={styles.label}>上传 PDF 文件</label>
            <div className={styles.uploadZone}>
              <Upload size={32} color="#94a3b8" style={{ margin: "0 auto 0.5rem" }} />
              <p className={styles.helperText}>点击或拖拽上传 PDF 文件</p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                id="pdf-upload"
                style={{ display: "none" }}
              />
              <label htmlFor="pdf-upload">
                <button type="button" className={styles.buttonSecondary}>
                  选择文件
                </button>
              </label>
              {newDoc.content && <p className={styles.helperText}>{newDoc.content}</p>}
            </div>
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label}>文档状态</label>
          <div
            className={styles.radioGroup}
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
          >
            <button
              type="button"
              className={`${styles.radioOption} ${newDoc.status === "active" ? styles.radioOptionActive : ""}`}
              onClick={() => setNewDoc({ ...newDoc, status: "active" })}
            >
              生效中
            </button>
            <button
              type="button"
              className={`${styles.radioOption} ${newDoc.status === "inactive" ? styles.radioOptionActive : ""}`}
              onClick={() => setNewDoc({ ...newDoc, status: "inactive" })}
            >
              已失效
            </button>
          </div>
          <div className={styles.statusInfo}>
            <AlertCircle size={16} />
            <p>
              <strong>生效中</strong>：文档参与智能问答检索；
              <strong>已失效</strong>：仅保留归档，不参与检索。
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={isAddCategoryDialogOpen}
        title={editingCategory ? "编辑业务分类" : "添加业务分类"}
        description={editingCategory ? "修改业务分类名称" : "创建新的业务分类"}
        onClose={() => handleCategoryDialogOpenChange(false)}
        footer={
          <>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => handleCategoryDialogOpenChange(false)}
            >
              取消
            </button>
            <button
              type="button"
              className={styles.buttonPrimary}
              onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
              disabled={!newCategoryName.trim()}
            >
              {editingCategory ? "更新" : "添加"}
            </button>
          </>
        }
      >
        <div className={styles.formGroup}>
          <label className={styles.label}>分类名称</label>
          <input
            className={styles.input}
            placeholder="请输入业务分类名称"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={isAddSubCategoryDialogOpen}
        title={editingSubCategory ? "编辑场景分类" : "添加场景分类"}
        description={
          editingSubCategory
            ? "修改场景分类名称"
            : selectedCategoryForSub
              ? `为 “${selectedCategoryForSub.name}” 添加场景分类`
              : "添加新的场景分类"
        }
        onClose={() => handleSubCategoryDialogOpenChange(false)}
        footer={
          <>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => handleSubCategoryDialogOpenChange(false)}
            >
              取消
            </button>
            <button
              type="button"
              className={styles.buttonPrimary}
              onClick={editingSubCategory ? handleUpdateSubCategory : handleAddSubCategory}
              disabled={!newSubCategoryName.trim()}
            >
              {editingSubCategory ? "更新" : "添加"}
            </button>
          </>
        }
      >
        <div className={styles.formGroup}>
          <label className={styles.label}>场景名称</label>
          <input
            className={styles.input}
            placeholder="请输入场景分类名称"
            value={newSubCategoryName}
            onChange={(e) => setNewSubCategoryName(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

function Modal({ open, title, description, onClose, children, footer }: ModalProps) {
  if (!open) return null;

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        <div className={styles.modalBody}>{children}</div>
        {footer && <div className={styles.modalActions}>{footer}</div>}
      </div>
    </div>
  );
}
