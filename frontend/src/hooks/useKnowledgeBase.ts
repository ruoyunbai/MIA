import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useAppStore } from "../store/useAppStore";
import { fetchCategories, createCategory as createCategoryApi, updateCategory as updateCategoryApi, deleteCategory as deleteCategoryApi } from "../api/categories";
import notify from "../utils/message";
import { ingestWebArticle, fetchDocuments as fetchDocumentsApi, updateDocument as updateDocumentApi, deleteDocument as deleteDocumentApi, type DocumentIngestionEvent, type DocumentDto } from "../api/documents";
import type {
  Category,
  Document,
  DocumentIngestionEventType,
  DocumentIngestionStatus,
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
  fileType: "text" | "pdf" | "web";
  url: string;
};

const emptyDoc: DraftDocument = {
  title: "",
  category: "",
  subCategory: "",
  content: "",
  status: "active",
  fileType: "text",
  url: "",
};

export function useKnowledgeBase(onOpenEditor: OpenEditorFn) {
  const {
    user,
    documents,
    categories,
    setDocuments,
    setCategories,
    addDocument,
    updateDocument,
    deleteDocument: removeDocumentFromStore,
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
  const [inputMethod, setInputMethod] = useState<"richtext" | "pdf" | "web">(
    "richtext",
  );
  const [newDoc, setNewDoc] = useState<DraftDocument>({ ...emptyDoc });
  const [isSubmittingDocument, setIsSubmittingDocument] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  const pendingEventsRef = useRef<Map<string, DocumentIngestionEvent>>(new Map());
  const documentsRef = useRef<Document[]>(documents);
  const categoriesRef = useRef<Category[]>(categories);
  const rawDocumentsRef = useRef<DocumentDto[]>([]);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const resolveSelectedCategoryIds = useCallback(
    (categoryName: string, subCategoryName: string) => {
      const category = categories.find((cat) => cat.name === categoryName);
      if (!category) {
        return { categoryId: undefined, subCategoryId: undefined };
      }
      if (subCategoryName) {
        const subCategory = category.subCategories.find(
          (sub) => sub.name === subCategoryName,
        );
        if (subCategory) {
          return { categoryId: category.id, subCategoryId: subCategory.id };
        }
      }
      return { categoryId: category.id, subCategoryId: undefined };
    },
    [categories],
  );

  const resolveDocumentCategory = useCallback((categoryId?: number | null) => {
    const fallback = {
      categoryName: "未分类",
      parentCategoryId: null as number | null,
      subCategoryName: "",
      subCategoryId: null as number | null,
    };
    if (categoryId === undefined || categoryId === null) {
      return fallback;
    }
    for (const category of categoriesRef.current) {
      if (category.id === categoryId) {
        return {
          categoryName: category.name,
          parentCategoryId: category.id,
          subCategoryName: "",
          subCategoryId: null,
        };
      }
      const subCategory = category.subCategories.find((sub) => sub.id === categoryId);
      if (subCategory) {
        return {
          categoryName: category.name,
          parentCategoryId: category.id,
          subCategoryName: subCategory.name,
          subCategoryId: subCategory.id,
        };
      }
    }
    return fallback;
  }, []);

  const mapDocumentDto = useCallback(
    (dto: DocumentDto): Document => {
      const categoryInfo = resolveDocumentCategory(dto.categoryId ?? undefined);
      const metaInfo = (dto.metaInfo ?? {}) as Record<string, unknown>;
      const getMetaString = (key: string) => {
        const value = metaInfo[key];
        return typeof value === "string" ? value : undefined;
      };
      const sourceUrl = getMetaString("sourceUrl");
      const origin = getMetaString("origin");
      const content =
        dto.content ??
        getMetaString("plainText") ??
        getMetaString("markdown") ??
        "";
      return {
        id: dto.id.toString(),
        title: dto.title,
        category: categoryInfo.categoryName,
        categoryId: categoryInfo.parentCategoryId ?? undefined,
        subCategory: categoryInfo.subCategoryName,
        subCategoryId: categoryInfo.subCategoryId ?? undefined,
        status: dto.status,
        uploadDate: new Date(dto.createdAt),
        content,
        userId: dto.userId ?? undefined,
        fileType:
          origin === "web-article"
            ? "web"
            : dto.fileUrl
              ? "pdf"
              : "text",
        fileUrl: dto.fileUrl ?? undefined,
        sourceUrl,
        isLocal: false,
        ingestion: {
          stage: mapIngestionStatusToStage(dto.ingestionStatus),
          status: dto.ingestionStatus,
          message: dto.ingestionError ?? undefined,
          updatedAt: new Date(dto.updatedAt),
        },
      };
    },
    [resolveDocumentCategory],
  );

  useEffect(() => {
    if (!rawDocumentsRef.current.length) {
      return;
    }
    const mappedDocuments = rawDocumentsRef.current.map(mapDocumentDto);
    const localDocuments = documentsRef.current.filter((doc) => doc.isLocal);
    setDocuments([...localDocuments, ...mappedDocuments]);
  }, [categories, mapDocumentDto, setDocuments]);
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

  const applyIngestionEvent = useCallback(
    (payload: DocumentIngestionEvent) => {
      updateDocument(String(payload.documentId), {
        status: payload.status,
        ingestion: {
          stage: payload.type,
          status: payload.ingestionStatus,
          message: payload.message,
          jobId: payload.jobId,
          queuePosition: payload.queuePosition,
          updatedAt: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        },
      });
    },
    [updateDocument],
  );

  const applyPendingEventForDocument = useCallback(
    (documentId: string) => {
      const pending = pendingEventsRef.current.get(documentId);
      if (!pending) return;
      pendingEventsRef.current.delete(documentId);
      applyIngestionEvent(pending);
    },
    [applyIngestionEvent],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const baseUrl = import.meta.env.VITE_API_URL || "/api";
    const normalizedBase = baseUrl.endsWith("/")
      ? baseUrl.slice(0, -1)
      : baseUrl;
    const eventSource = new EventSource(
      `${normalizedBase}/documents/ingestion-events`,
    );

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as DocumentIngestionEvent;
        if (!payload?.documentId) {
          return;
        }
        const docId = String(payload.documentId);
        const exists = documentsRef.current.some((doc) => doc.id === docId);
        if (!exists) {
          pendingEventsRef.current.set(docId, payload);
          return;
        }
        applyIngestionEvent(payload);
      } catch (error) {
        console.error("Failed to parse ingestion event", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("Document ingestion event stream error", error);
    };

    return () => {
      eventSource.close();
    };
  }, [applyIngestionEvent]);

  const refreshDocuments = useCallback(async () => {
    try {
      const result = await fetchDocumentsApi({ page: 1, pageSize: 100 });
      rawDocumentsRef.current = result.items;
      const mappedDocuments = result.items.map(mapDocumentDto);
      const localDocuments = documentsRef.current.filter((doc) => doc.isLocal);
      setDocuments([...localDocuments, ...mappedDocuments]);
    } catch {
      // errors handled globally
    }
  }, [mapDocumentDto, setDocuments]);

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

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
      setIsSubmittingDocument(false);
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

  const handleIngestWebDocument = async () => {
    const url = newDoc.url.trim();
    if (!url) {
      alert("请填写需要抓取的链接");
      return;
    }
    const normalizedTitle = newDoc.title.trim();
    const requestTitle = normalizedTitle || "";
    const docCategory = newDoc.category;
    const docSubCategory = newDoc.subCategory;
    const { categoryId, subCategoryId } = resolveSelectedCategoryIds(
      docCategory,
      docSubCategory,
    );
    setIsSubmittingDocument(true);
    const now = new Date();
    const placeholderId = `temp-${Date.now()}`;
    const placeholder: Document = {
      id: placeholderId,
      title: normalizedTitle || "待解析文章",
      category: docCategory,
      categoryId,
      subCategory: docSubCategory,
      subCategoryId,
      status: "processing",
      uploadDate: now,
      content: `来源链接：${url}`,
      fileType: "web",
      sourceUrl: url,
      isLocal: true,
      ingestion: {
        stage: "queued",
        status: "uploaded",
        message: "正在提交解析任务...",
        updatedAt: now,
      },
    };
    addDocument(placeholder);
    openDocumentDialog(false);
    try {
      const requestCategoryId = subCategoryId ?? categoryId;
      const response = await ingestWebArticle(
        {
          url,
          title: requestTitle,
          categoryId: requestCategoryId,
          userId: user?.id,
        },
        {
          timeout: 60000,
        },
      );
      const document: Document = {
        id: response.documentId.toString(),
        title: normalizedTitle || response.title || placeholder.title,
        category: docCategory,
        categoryId,
        subCategory: docSubCategory,
        subCategoryId,
        status: response.status || "processing",
        uploadDate: now,
        content: placeholder.content,
        fileType: "web",
        sourceUrl: url,
        isLocal: false,
        ingestion: {
          stage: "queued",
          status: "uploaded",
          jobId: response.jobId,
          queuePosition: response.queuePosition,
          updatedAt: now,
        },
      };
      removeDocumentFromStore(placeholderId);
      addDocument(document);
      applyPendingEventForDocument(document.id);
      notify.success("链接已加入解析队列");
      void refreshDocuments();
    } catch (error) {
      console.error("Failed to ingest web article", error);
      removeDocumentFromStore(placeholderId);
    } finally {
      setIsSubmittingDocument(false);
    }
  };

  const handleProceedToEditor = async () => {
    if (!newDoc.category || !newDoc.subCategory) {
      alert("请完善业务与场景分类");
      return;
    }
    const trimmedTitle = newDoc.title.trim();
    if (inputMethod !== "web" && !trimmedTitle) {
      alert("请填写文档标题");
      return;
    }
    if (inputMethod === "web" && !newDoc.url.trim()) {
      alert("请填写需要抓取的链接");
      return;
    }

    const selectedCategoryIds = resolveSelectedCategoryIds(
      newDoc.category,
      newDoc.subCategory,
    );

    if (inputMethod === "richtext") {
      openDocumentDialog(false);
      onOpenEditor({
        isOpen: true,
        title: trimmedTitle,
        content: newDoc.content,
        category: newDoc.category,
        subCategory: newDoc.subCategory,
        status: newDoc.status,
        onSave: (content: string) => {
          const document: Document = {
            id: Date.now().toString(),
            title: trimmedTitle,
            category: newDoc.category,
            categoryId: selectedCategoryIds.categoryId,
            subCategory: newDoc.subCategory,
            subCategoryId: selectedCategoryIds.subCategoryId,
            status: newDoc.status,
            uploadDate: new Date(),
            content,
            fileType: "text",
            isLocal: true,
          };
          addDocument(document);
          setNewDoc({ ...emptyDoc });
          setInputMethod("richtext");
        },
      });
    } else if (inputMethod === "pdf") {
      handleAddDocument();
    } else if (inputMethod === "web") {
      await handleIngestWebDocument();
    }
  };

  const handleAddDocument = () => {
    const trimmedTitle = newDoc.title.trim();
    const { categoryId, subCategoryId } = resolveSelectedCategoryIds(
      newDoc.category,
      newDoc.subCategory,
    );
    const document: Document = {
      id: Date.now().toString(),
      title: trimmedTitle,
      category: newDoc.category,
      categoryId,
      subCategory: newDoc.subCategory,
      subCategoryId,
      status: newDoc.status,
      uploadDate: new Date(),
      content: newDoc.content,
      fileType: inputMethod === "pdf" ? "pdf" : "text",
      isLocal: true,
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

  const toggleStatus = async (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc || (doc.status !== "active" && doc.status !== "inactive")) {
      return;
    }
    const nextStatus: Document["status"] = doc.status === "active" ? "inactive" : "active";
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      updateDocument(id, { status: nextStatus });
      notify.success(nextStatus === "active" ? "文档已启用" : "文档已停用");
      return;
    }
    try {
      const updated = await updateDocumentApi(numericId, { status: nextStatus });
      rawDocumentsRef.current = rawDocumentsRef.current.map((dto) =>
        dto.id === updated.id ? updated : dto,
      );
      updateDocument(id, mapDocumentDto(updated));
      notify.success(nextStatus === "active" ? "文档已启用" : "文档已停用");
    } catch {
      // handled globally
    }
  };

  const deleteDocument = async (id: string) => {
    if (!confirm("确定要删除这个文档吗？")) {
      return;
    }
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      removeDocumentFromStore(id);
      notify.success("文档已删除");
      return;
    }
    try {
      await deleteDocumentApi(numericId);
      rawDocumentsRef.current = rawDocumentsRef.current.filter((dto) => dto.id !== numericId);
      removeDocumentFromStore(id);
      notify.success("文档已删除");
    } catch {
      // handled globally
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
    isSubmittingDocument,
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

function mapIngestionStatusToStage(
  status?: DocumentIngestionStatus,
): DocumentIngestionEventType {
  switch (status) {
    case "chunked":
      return "chunked";
    case "embedded":
      return "processing";
    case "indexed":
      return "indexed";
    case "failed":
      return "failed";
    case "uploaded":
    default:
      return "queued";
  }
}
