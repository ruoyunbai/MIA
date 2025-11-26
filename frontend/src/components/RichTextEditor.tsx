import { useMemo } from "react"
import { ArrowLeft, Save } from "lucide-react"
import styles from "./RichTextEditor.module.css"
import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"
import type { PartialBlock } from "@blocknote/core"
import "@blocknote/core/fonts/inter.css"
import "@blocknote/mantine/style.css"

interface RichTextEditorProps {
  title: string
  initialContent: string
  onSave: (content: string) => void
  onCancel: () => void
}

export function RichTextEditor({ title, initialContent, onSave, onCancel }: RichTextEditorProps) {
  const hasInitialContent = useMemo(() => initialContent.trim().length > 0, [initialContent])

  const blockNoteInitialContent = useMemo<PartialBlock[] | undefined>(() => {
    if (!hasInitialContent) return undefined
    return [
      {
        type: "paragraph",
        content: initialContent,
      },
    ]
  }, [hasInitialContent, initialContent])

  const blockNoteEditor = useCreateBlockNote(
    {
      initialContent: blockNoteInitialContent,
    },
    [blockNoteInitialContent],
  )

  const handleSave = () => {
    const markdown = blockNoteEditor.blocksToMarkdownLossy(blockNoteEditor.document).trim()
    onSave(markdown)
  }

  return (
    <div className={styles.editorShell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={onCancel} className={styles.outlineButton}>
              <ArrowLeft size={18} />
            </button>
            <div className={styles.titleGroup}>
              <h1>编辑文档</h1>
              <p>{title}</p>
            </div>
          </div>

          <div className={styles.buttonRow}>
            <button type="button" className={styles.outlineButton} onClick={onCancel}>
              取消
            </button>
            <button type="button" className={styles.primaryButton} onClick={handleSave}>
              <Save size={16} />
              保存文档
            </button>
          </div>
        </div>
      </header>

      <main className={styles.editorArea}>
        {hasInitialContent && (
          <div className={styles.editorNotice}>
            BlockNote 体验版本会直接载入本地文本，不走协作房间，保存后请确认字段格式符合预期。
          </div>
        )}
        <div className={styles.blockNoteContainer}>
          <BlockNoteView editor={blockNoteEditor} theme="light" />
        </div>
      </main>
    </div>
  )
}
