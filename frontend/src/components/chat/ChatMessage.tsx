import { ExternalLink, FileText } from 'lucide-react';
import styles from './ChatMessage.module.css';
import type { Message } from '../../store/useStore';

export type ChatMessageSource = NonNullable<Message['sources']>[number];

interface ChatMessageProps {
    message: Message;
    onSourceClick: (source: ChatMessageSource) => void;
}

export function ChatMessage({ message, onSourceClick }: ChatMessageProps) {
    const isUser = message.role === 'user';

    const rowClass = `${styles.messageRow} ${isUser ? styles.messageRowUser : ''}`;
    const wrapperClass = [
        styles.messageWrapper,
        isUser ? styles.messageWrapperUser : styles.messageWrapperAssistant,
    ]
        .filter(Boolean)
        .join(' ');
    const bubbleClass = `${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`;

    return (
        <div className={rowClass}>
            <div className={wrapperClass}>
                <div className={bubbleClass}>{message.content}</div>

                {message.sources && message.sources.length > 0 && (
                    <div className={styles.sources}>
                        <p className={styles.sourceLabel}>
                            <FileText size={14} />
                            参考来源
                        </p>
                        {message.sources.map((source, idx) => (
                            <div
                                key={idx}
                                className={styles.sourceCard}
                                onClick={() => onSourceClick(source)}
                            >
                                <div className={styles.sourceTitleRow}>
                                    <p className={styles.sourceTitle}>{source.title}</p>
                                    <ExternalLink size={14} color="#94a3b8" />
                                </div>
                                <p className={styles.sourceCategory}>{source.category}</p>
                                <p className={styles.sourceSnippet}>{source.snippet}</p>
                            </div>
                        ))}
                    </div>
                )}

                <p className={styles.timestamp}>
                    {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}
