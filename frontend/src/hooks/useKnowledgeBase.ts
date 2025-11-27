import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useAppStore } from "../store/useAppStore";
import { fetchCategories, createCategory as createCategoryApi, updateCategory as updateCategoryApi, deleteCategory as deleteCategoryApi } from "../api/categories";
import notify from "../utils/message";
import type {
  Category,
  Document,
  SubCategory,
} from "../store/types";
import type { CategoryDto } from "../../../shared/api-contracts";

interface EditorState {
  isOpen: boolean;
  title: string;
  content: string;
  category: string;
  subCategory: string;
  status: "active" | "inactive";
  onSave: (content: string) => void;
}

type OpenEditorFn = (state: EditorState) => void;

type DraftDocument = {
  title: string;
  category: string;
  subCategory: string;
  content: string;
  status: "active" | "inactive";
  fileType: "text" | "pdf";
};

const emptyDoc: DraftDocument = {
  title: "",
  category: "",
  subCategory: "",
  content: "",
  status: "active",
  fileType: "text",
};

export function useKnowledgeBase(onOpenEditor: OpenEditorFn) {
  const {
    documents,
    categories,
    setDocuments,
    setCategories,
    addDocument,
    updateDocument,
    deleteDocument: removeDocument,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSubCategory, setFilterSubCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isAddSubCategoryDialogOpen, setIsAddSubCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<{
    category: Category;
    subCategory: SubCategory;
  } | null>(null);
  const [selectedCategoryForSub, setSelectedCategoryForSub] =
    useState<Category | null>(null);
  const [inputMethod, setInputMethod] = useState<"richtext" | "pdf">(
    "richtext",
  );
  const [newDoc, setNewDoc] = useState<DraftDocument>({ ...emptyDoc });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  const refreshCategories = useCallback(async () => {
    try {
      const list = await fetchCategories();
      setCategories(buildCategoryTree(list));
    } catch {
      // 全局请求拦截器已经处理错误提示
    }
  }, [setCategories]);

  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        filterCategory === "all" || doc.category === filterCategory;
      const matchesSubCategory =
        filterSubCategory === "all" || doc.subCategory === filterSubCategory;
      const matchesStatus = filterStatus === "all" || doc.status === filterStatus;

      return (
        matchesSearch && matchesCategory && matchesSubCategory && matchesStatus
      );
    });
  }, [documents, filterCategory, filterStatus, filterSubCategory, searchQuery]);

  const availableSubCategories = useMemo(() => {
    if (filterCategory === "all") return [] as SubCategory[];
    return (
      categories.find((c) => c.name === filterCategory)?.subCategories || []
    );
  }, [categories, filterCategory]);

  const selectedCategory = useMemo(() => {
    if (!newDoc.category) return undefined;
    return categories.find((c) => c.name === newDoc.category);
  }, [categories, newDoc.category]);

  const openDocumentDialog = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setNewDoc({ ...emptyDoc });
      setInputMethod("richtext");
    }
  };

  const openCategoryDialog = (open: boolean) => {
    setIsAddCategoryDialogOpen(open);
    if (!open) {
      setEditingCategory(null);
      setNewCategoryName("");
    }
  };

  const openSubCategoryDialog = (open: boolean) => {
    setIsAddSubCategoryDialogOpen(open);
    if (!open) {
      setEditingSubCategory(null);
      setSelectedCategoryForSub(null);
      setNewSubCategoryName("");
    }
  };

  const beginCreateCategory = () => {
    setEditingCategory(null);
    setNewCategoryName("");
    setIsAddCategoryDialogOpen(true);
  };

  const beginEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setIsAddCategoryDialogOpen(true);
  };

  const beginCreateSubCategory = (category: Category) => {
    setSelectedCategoryForSub(category);
    setEditingSubCategory(null);
    setNewSubCategoryName("");
    setIsAddSubCategoryDialogOpen(true);
  };

  const beginEditSubCategory = (category: Category, subCategory: SubCategory) => {
    setEditingSubCategory({ category, subCategory });
    setSelectedCategoryForSub(category);
    setNewSubCategoryName(subCategory.name);
    setIsAddSubCategoryDialogOpen(true);
  };

  const handleAddCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;
    try {
      await createCategoryApi({ name: trimmedName });
      notify.success("业务分类创建成功");
      openCategoryDialog(false);
      await refreshCategories();
    } catch {
      // 错误由拦截器处理
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;
    const previousName = editingCategory.name;
    try {
      await updateCategoryApi(editingCategory.id, { name: trimmedName });
      const updatedDocs = documents.map((doc) =>
        doc.category === previousName
          ? { ...doc, category: trimmedName }
          : doc,
      );
      setDocuments(updatedDocs);
      notify.success("业务分类更新成功");
      openCategoryDialog(false);
      await refreshCategories();
    } catch {
      // no-op
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    const hasDocuments = documents.some((doc) => doc.category === category.name);
    if (hasDocuments) {
      alert("该业务分类下存在文档，无法删除。请先删除或移动相关文档。");
      return;
    }
    if (confirm(`确定要删除业务分类"${category.name}"吗？`)) {
      try {
        await deleteCategoryApi(categoryId);
        notify.success("业务分类已删除");
        await refreshCategories();
      } catch {
        // handled globally
      }
    }
  };

  const handleAddSubCategory = async () => {
    if (!selectedCategoryForSub) return;
    const trimmedName = newSubCategoryName.trim();
    if (!trimmedName) return;
    try {
      await createCategoryApi({
        name: trimmedName,
        parentId: selectedCategoryForSub.id,
      });
      notify.success("场景分类创建成功");
      openSubCategoryDialog(false);
      await refreshCategories();
    } catch {
      // handled globally
    }
  };

  const handleUpdateSubCategory = async () => {
    if (!editingSubCategory) return;
    const trimmedName = newSubCategoryName.trim();
    if (!trimmedName) return;
    const { category, subCategory } = editingSubCategory;
    try {
      await updateCategoryApi(subCategory.id, { name: trimmedName });
      const updatedDocs = documents.map((doc) =>
        doc.category === category.name && doc.subCategory === subCategory.name
          ? { ...doc, subCategory: trimmedName }
          : doc,
      );
      setDocuments(updatedDocs);
      notify.success("场景分类更新成功");
      openSubCategoryDialog(false);
      await refreshCategories();
    } catch {
      // handled globally
    }
  };

  const handleDeleteSubCategory = async (categoryId: number, subCategoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    const subCategory = category?.subCategories.find((s) => s.id === subCategoryId);
    if (!category || !subCategory) return;
    const hasDocuments = documents.some(
      (doc) => doc.category === category.name && doc.subCategory === subCategory.name,
    );
    if (hasDocuments) {
      alert("该场景分类下存在文档，无法删除。请先删除或移动相关文档。");
      return;
    }
    if (confirm(`确定要删除场景分类"${subCategory.name}"吗？`)) {
      try {
        await deleteCategoryApi(subCategoryId);
        notify.success("场景分类已删除");
        await refreshCategories();
      } catch {
        // handled globally
      }
    }
  };

  const handleProceedToEditor = () => {
    if (!newDoc.title || !newDoc.category || !newDoc.subCategory) {
      alert("请填写完整的文档信息");
      return;
    }

    if (inputMethod === "richtext") {
      openDocumentDialog(false);
      onOpenEditor({
        isOpen: true,
        title: newDoc.title,
        content: newDoc.content,
        category: newDoc.category,
        subCategory: newDoc.subCategory,
        status: newDoc.status,
        onSave: (content: string) => {
          const document: Document = {
            id: Date.now().toString(),
            title: newDoc.title,
            category: newDoc.category,
            subCategory: newDoc.subCategory,
            status: newDoc.status,
            uploadDate: new Date(),
            content,
            fileType: "text",
          };
          addDocument(document);
          setNewDoc({ ...emptyDoc });
          setInputMethod("richtext");
        },
      });
    } else {
      handleAddDocument();
    }
  };

  const handleAddDocument = () => {
    const document: Document = {
      id: Date.now().toString(),
      title: newDoc.title,
      category: newDoc.category,
      subCategory: newDoc.subCategory,
      status: newDoc.status,
      uploadDate: new Date(),
      content: newDoc.content,
      fileType: inputMethod === "pdf" ? "pdf" : "text",
    };
    addDocument(document);
    setNewDoc({ ...emptyDoc });
    setInputMethod("richtext");
    openDocumentDialog(false);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewDoc((prev) => ({ ...prev, content: `已上传文件: ${file.name}` }));
    }
  };

  const toggleStatus = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (doc) {
      updateDocument(id, { status: doc.status === "active" ? "inactive" : "active" });
    }
  };

  const deleteDocument = (id: string) => {
    if (confirm("确定要删除这个文档吗？")) {
      removeDocument(id);
    }
  };

  return {
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
    handleDocumentDialogOpenChange: openDocumentDialog,
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
    handleCategoryDialogOpenChange: openCategoryDialog,
    isAddSubCategoryDialogOpen,
    handleSubCategoryDialogOpenChange: openSubCategoryDialog,
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
    handleAddDocument,
    handleFileUpload,
    toggleStatus,
    deleteDocument,
  };
}

const sortCategories = (a: CategoryDto, b: CategoryDto) => {
  if (a.sortOrder === b.sortOrder) {
    return a.id - b.id;
  }
  return a.sortOrder - b.sortOrder;
};

function buildCategoryTree(categories: CategoryDto[]): Category[] {
  const childrenMap = new Map<number, CategoryDto[]>();
  const roots: CategoryDto[] = [];

  categories.forEach((category) => {
    if (category.parentId === null || category.parentId === undefined) {
      roots.push(category);
      return;
    }
    const list = childrenMap.get(category.parentId) ?? [];
    list.push(category);
    childrenMap.set(category.parentId, list);
  });

  roots.sort(sortCategories);

  return roots.map((root) => ({
    id: root.id,
    name: root.name,
    sortOrder: root.sortOrder,
    subCategories: (childrenMap.get(root.id) ?? [])
      .sort(sortCategories)
      .map((child) => ({
        id: child.id,
        name: child.name,
        parentId: child.parentId ?? root.id,
        sortOrder: child.sortOrder,
      })),
  }));
}
