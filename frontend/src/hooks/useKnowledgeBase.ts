import { useMemo, useState, type ChangeEvent } from "react";
import {
  useStore,
  type Category,
  type Document,
  type SubCategory,
} from "../store/useStore";

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
    addDocument,
    updateDocument,
    deleteDocument: removeDocument,
    addCategory,
    updateCategory,
    deleteCategory: removeCategory,
  } = useStore();

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

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName,
      subCategories: [],
    };
    addCategory(newCategory);
    openCategoryDialog(false);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    updateCategory(editingCategory.id, { name: newCategoryName });
    const updatedDocs = documents.map((doc) =>
      doc.category === editingCategory.name
        ? { ...doc, category: newCategoryName }
        : doc,
    );
    setDocuments(updatedDocs);
    openCategoryDialog(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    const hasDocuments = documents.some((doc) => doc.category === category.name);
    if (hasDocuments) {
      alert("该业务分类下存在文档，无法删除。请先删除或移动相关文档。");
      return;
    }
    if (confirm(`确定要删除业务分类"${category.name}"吗？`)) {
      removeCategory(categoryId);
    }
  };

  const handleAddSubCategory = () => {
    if (!selectedCategoryForSub || !newSubCategoryName.trim()) return;
    const newSubCategory: SubCategory = {
      id: `${selectedCategoryForSub.id}-${Date.now()}`,
      name: newSubCategoryName,
    };
    const updatedCategory = {
      ...selectedCategoryForSub,
      subCategories: [...selectedCategoryForSub.subCategories, newSubCategory],
    };
    updateCategory(selectedCategoryForSub.id, updatedCategory);
    openSubCategoryDialog(false);
  };

  const handleUpdateSubCategory = () => {
    if (!editingSubCategory || !newSubCategoryName.trim()) return;
    const { category, subCategory } = editingSubCategory;
    const updatedSubCategories = category.subCategories.map((sub) =>
      sub.id === subCategory.id ? { ...sub, name: newSubCategoryName } : sub,
    );
    updateCategory(category.id, { subCategories: updatedSubCategories });
    const updatedDocs = documents.map((doc) =>
      doc.category === category.name && doc.subCategory === subCategory.name
        ? { ...doc, subCategory: newSubCategoryName }
        : doc,
    );
    setDocuments(updatedDocs);
    openSubCategoryDialog(false);
  };

  const handleDeleteSubCategory = (categoryId: string, subCategoryId: string) => {
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
      const updatedSubCategories = category.subCategories.filter(
        (sub) => sub.id !== subCategoryId,
      );
      updateCategory(categoryId, { subCategories: updatedSubCategories });
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
