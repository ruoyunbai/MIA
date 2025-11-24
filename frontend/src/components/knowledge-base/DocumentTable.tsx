import { FileText, Eye, Edit, Check, X, Trash2 } from "lucide-react";
import styles from "./DocumentTable.module.css";
import type { Document } from "../../store/useStore";

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
  if (documents.length === 0) {
    return (
      <div className={styles.tableWrapper}>
        <div className={styles.emptyState}>
          <FileText size={48} color="#cbd5f5" style={{ margin: "0 auto 0.75rem" }} />
          <p>暂无文档</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>文档标题</th>
            <th className={styles.th}>分类</th>
            <th className={styles.th}>上传时间</th>
            <th className={styles.th}>状态</th>
            <th className={styles.th}>操作</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
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
              <td className={styles.td}>
                {doc.uploadDate.toLocaleDateString("zh-CN")}
              </td>
              <td className={styles.td}>
                <span
                  className={`${styles.statusBadge} ${doc.status === "active" ? styles.statusActive : styles.statusInactive}`}
                >
                  {doc.status === "active" ? "生效中" : "已失效"}
                </span>
              </td>
              <td className={styles.td}>
                <div className={styles.actions}>
                  <button type="button" className={styles.iconButton} title="查看">
                    <Eye size={16} />
                  </button>
                  <button type="button" className={styles.iconButton} title="编辑">
                    <Edit size={16} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => onToggleStatus(doc.id)}
                    title="切换状态"
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
