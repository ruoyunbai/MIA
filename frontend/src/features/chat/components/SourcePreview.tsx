import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, FileText, X } from 'lucide-react';
import styles from './SourcePreview.module.css';
import type { SourceAttachment } from '../../../store/types';

interface SourcePreviewProps {
    selectedSource: SourceAttachment;
    sourceHistory: SourceAttachment[];
    historyIndex: number;
    onClose: () => void;
    onBackward: () => void;
    onForward: () => void;
    onHistoryItemClick: (index: number) => void;
}

export function SourcePreview({
    selectedSource,
    sourceHistory,
    historyIndex,
    onClose,
    onBackward,
    onForward,
    onHistoryItemClick,
}: SourcePreviewProps) {
    const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
    const historyDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
                setShowHistoryDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <div className={styles.navButtons}>
                    <button
                        type="button"
                        onClick={onBackward}
                        disabled={historyIndex <= 0}
                        className={styles.iconButton}
                        title="返回"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={onForward}
                        disabled={historyIndex >= sourceHistory.length - 1}
                        className={styles.iconButton}
                        title="前进"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className={styles.divider} />

                <div className={styles.docInfo} ref={historyDropdownRef}>
                    <FileText size={16} color="#2563eb" />
                    <button
                        type="button"
                        onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                        className={styles.docButton}
                    >
                        <div>
                            <h3 className={styles.docTitle}>
                                {selectedSource.title ?? selectedSource.documentTitle}
                            </h3>
                            <p className={styles.docCategory}>
                                {selectedSource.category ?? '知识库'}
                            </p>
                        </div>
                    </button>
                    {sourceHistory.length > 0 && (
                        <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                            aria-label="历史记录"
                        >
                            <ChevronDown size={16} />
                        </button>
                    )}

                    {showHistoryDropdown && sourceHistory.length > 0 && (
                        <div className={styles.dropdown}>
                            <p className={styles.dropdownLabel}>最近查看</p>
                            {sourceHistory.map((source, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        onHistoryItemClick(idx);
                                        setShowHistoryDropdown(false);
                                    }}
                                    className={`${styles.historyItem} ${idx === historyIndex ? styles.historyItemActive : ''}`}
                                >
                                    <FileText size={14} color="#94a3b8" />
                                    <div>
                                        <p className={styles.historyItemTitle}>
                                            {source.title ?? source.documentTitle}
                                        </p>
                                        <p className={styles.historyItemCategory}>
                                            {source.category ?? '知识库'}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className={styles.iconButton}
                    title="关闭"
                >
                    <X size={16} />
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.contentInner}>
                    {selectedSource.content ? (
                        <div className={styles.richText}>
                            {selectedSource.content.split('\n').map((line, idx) => {
                                if (line.startsWith('# ')) {
                                    return <h1 key={idx}>{line.substring(2)}</h1>;
                                } else if (line.startsWith('## ')) {
                                    return <h2 key={idx}>{line.substring(3)}</h2>;
                                } else if (line.startsWith('### ')) {
                                    return <h3 key={idx}>{line.substring(4)}</h3>;
                                } else if (line.startsWith('- ')) {
                                    return <li key={idx}>{line.substring(2)}</li>;
                                } else if (line.startsWith('**') && line.endsWith('**')) {
                                    return (
                                        <p key={idx}>
                                            <strong>{line.slice(2, -2)}</strong>
                                        </p>
                                    );
                                } else if (line.trim() === '') {
                                    return <div key={idx} style={{ height: '0.5rem' }} />;
                                } else {
                                    return <p key={idx}>{line}</p>;
                                }
                            })}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <FileText size={48} color="#cbd5f5" style={{ margin: '0 auto 0.5rem' }} />
                            <p>暂无详细内容</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
