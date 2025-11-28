import { useMemo, useState, type MouseEvent } from "react";
import { FileText, Eye, Edit, Check, X, Trash2 } from "lucide-react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
import styles from "./DocumentTable.module.css";
import type { Document, DocumentIngestionEventType, DocumentStatus } from "../../store/types";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

const DOCUMENT_STATUS_META: Record<DocumentStatus, { label: string; className: string }> = {
  active: { label: "作为助手参考", className: styles.statusActive },
  inactive: { label: "不作为参考", className: styles.statusInactive },
  processing: { label: "处理中", className: styles.statusProcessing },
  failed: { label: "入库失败", className: styles.statusFailed },
};

const INGESTION_STAGE_META: Record<
  DocumentIngestionEventType,
  { label: string; className: string; description: string }
> = {
  queued: {
    label: "排队中",
    className: styles.ingestionQueued,
    description: "已提交，等待入库",
  },
  processing: {
    label: "解析中",
    className: styles.ingestionProcessing,
    description: "正在解析与切片",
  },
  chunked: {
    label: "切片完成",
    className: styles.ingestionChunked,
    description: "切片完成，等待向量化",
  },
  indexed: {
    label: "已写入索引",
    className: styles.ingestionIndexed,
    description: "索引完成，等待确认",
  },
  completed: {
    label: "已完成",
    className: styles.ingestionCompleted,
    description: "入库已完成",
  },
  failed: {
    label: "入库失败",
    className: styles.ingestionFailed,
    description: "入库失败，请重试",
  },
};

const getIngestionMessage = (doc: Document) => {
  const ingestion = doc.ingestion;
  if (!ingestion) {
    return "暂无入库记录";
  }
  if (ingestion.message) {
    return ingestion.message;
  }
  if (ingestion.stage === "queued" && typeof ingestion.queuePosition === "number") {
    return `队列位置：第 ${ingestion.queuePosition + 1} 位`;
  }
  const meta = INGESTION_STAGE_META[ingestion.stage];
  return meta?.description ?? "等待更新";
};

interface KnowledgeDocumentTableProps {
  documents: Document[];
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

export function KnowledgeDocumentTable({
  documents,
  onToggleStatus,
  onDelete,
}: KnowledgeDocumentTableProps) {
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const tableContent =
    documents.length === 0 ? (
      <div className={styles.tableWrapper}>
        <div className={styles.emptyState}>
          <FileText size={48} color="#cbd5f5" style={{ margin: "0 auto 0.75rem" }} />
          <p>暂无文档</p>
        </div>
      </div>
    ) : (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>文档标题</th>
              <th className={styles.th}>分类</th>
              <th className={styles.th}>上传时间</th>
              <th className={styles.th}>入库进度</th>
              <th className={styles.th}>状态</th>
              <th className={styles.th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const statusMeta = DOCUMENT_STATUS_META[doc.status] ?? DOCUMENT_STATUS_META.active;
              const ingestionStage = doc.ingestion?.stage;
              const ingestionMeta = ingestionStage ? INGESTION_STAGE_META[ingestionStage] : undefined;
              const canToggleStatus = doc.status === "active" || doc.status === "inactive";
              return (
                <tr key={doc.id}>
                  <td className={styles.td}>
                    <div className={styles.docInfo}>
                      <div className={styles.docIcon}>
                        <FileText size={16} />
                      </div>
                      <div className={styles.docMeta}>
                        <p className={styles.docTitle}>{doc.title}</p>
                        <p className={styles.docSnippet}>{doc.content}</p>
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div>
                      <p>{doc.category}</p>
                      <p className={styles.docSnippet}>{doc.subCategory}</p>
                    </div>
                  </td>
                  <td className={styles.td}>{doc.uploadDate.toLocaleDateString("zh-CN")}</td>
                  <td className={styles.td}>
                    {ingestionMeta ? (
                      <div className={styles.ingestionInfo}>
                        <span className={`${styles.statusBadge} ${ingestionMeta.className}`}>
                          {ingestionMeta.label}
                        </span>
                        <p className={styles.ingestionMeta}>{getIngestionMessage(doc)}</p>
                      </div>
                    ) : (
                      <p className={styles.docSnippet}>暂无入库记录</p>
                    )}
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.statusBadge} ${statusMeta.className}`}>{statusMeta.label}</span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        title="查看"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        <Eye size={16} />
                      </button>
                      <button type="button" className={styles.iconButton} title="编辑">
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => onToggleStatus(doc.id)}
                        title={canToggleStatus ? "切换参考状态" : "处理中，暂不可切换"}
                        disabled={!canToggleStatus}
                      >
                        {doc.status === "active" ? <X size={16} color="#f97316" /> : <Check size={16} color="#16a34a" />}
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => onDelete(doc.id)}
                        title="删除"
                      >
                        <Trash2 size={16} color="#dc2626" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

  return (
    <>
      {tableContent}
      {previewDoc && (
        <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </>
  );
}

interface DocumentPreviewModalProps {
  doc: Document;
  onClose: () => void;
}

function DocumentPreviewModal({ doc, onClose }: DocumentPreviewModalProps) {
  const formattedDate = useMemo(
    () => doc.uploadDate.toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" }),
    [doc.uploadDate],
  );
  const hasContent = doc.content.trim().length > 0;
  const normalizedContent = hasContent ? doc.content : "暂无内容";
  const blockNoteInitialContent = useMemo<PartialBlock[]>(() => {
    const paragraphs = normalizedContent
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    if (paragraphs.length === 0) {
      return [
        {
          type: "paragraph",
          content: "暂无内容",
        },
      ];
    }
    return paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: paragraph.replace(/\n/g, " "),
    }));
  }, [normalizedContent]);
  const blockNoteEditor = useCreateBlockNote(
    {
      initialContent: blockNoteInitialContent,
    },
    [blockNoteInitialContent],
  );

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.previewOverlay} onClick={handleOverlayClick}>
      <div className={styles.previewPanel}>
        <header className={styles.previewHeader}>
          <div>
            <p className={styles.previewSubtitle}>文档详情</p>
            <h3 className={styles.previewTitle}>{doc.title}</h3>
            <div className={styles.previewMeta}>
              <span>{doc.category}</span>
              {doc.subCategory && <span>{doc.subCategory}</span>}
              <span>{formattedDate}</span>
            </div>
          </div>
          <button type="button" className={styles.previewCloseButton} onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className={styles.previewBody}>
          <div className={styles.blockNoteViewer}>
            <BlockNoteView editor={blockNoteEditor} theme="light" editable={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
