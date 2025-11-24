import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  title: string;
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export function RichTextEditor({ title, initialContent, onSave, onCancel }: RichTextEditorProps) {
  const [content, setContent] = useState(initialContent);

  return (
    <div className={styles.editorShell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
            <button type="button" className={styles.primaryButton} onClick={() => onSave(content)}>
              <Save size={16} />
              保存文档
            </button>
          </div>
        </div>
      </header>

      <main className={styles.editorArea}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="在此输入文档内容..."
          className={styles.textarea}
        />
      </main>
    </div>
  );
}
