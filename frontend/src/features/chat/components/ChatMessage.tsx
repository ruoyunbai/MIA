import { ExternalLink, FileText } from 'lucide-react';
import { RagTracePanel } from './RagTracePanel';
import styles from './ChatMessage.module.css';
import type { Message, SourceAttachment } from '../../../store/types';

export type ChatMessageSource = NonNullable<Message['sources']>[number];

interface ChatMessageProps {
    message: Message;
    onSourceClick: (source: SourceAttachment) => void;
}

export function ChatMessage({ message, onSourceClick }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const timestamp = message.createdAt;
    const formattedTime = timestamp.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const rowClass = `${styles.messageRow} ${isUser ? styles.messageRowUser : ''}`;
    const wrapperClass = [
        styles.messageWrapper,
        isUser ? styles.messageWrapperUser : styles.messageWrapperAssistant,
    ]
        .filter(Boolean)
        .join(' ');
    const bubbleClasses = [
        styles.bubble,
        isUser ? styles.bubbleUser : styles.bubbleAssistant,
        !isUser && message.isStreaming ? styles.bubbleAssistantStreaming : '',
    ]
        .filter(Boolean)
        .join(' ');
    const bubbleContent = message.content || (message.isStreaming ? '\u00a0' : '');

    return (
        <div className={rowClass}>
            <div className={wrapperClass}>
                <div className={bubbleClasses}>{bubbleContent}</div>

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
                                    <p className={styles.sourceTitle}>{source.title ?? source.documentTitle}</p>
                                    <ExternalLink size={14} color="#94a3b8" />
                                </div>
                                <p className={styles.sourceCategory}>{source.category ?? '知识库'}</p>
                                <p className={styles.sourceSnippet}>{source.snippet}</p>
                            </div>
                        ))}
                    </div>
                )}

                {!isUser && message.ragTrace && (
                    <RagTracePanel trace={message.ragTrace} onSelectSource={onSourceClick} />
                )}

                <p className={styles.timestamp}>
                    {formattedTime}
                </p>
            </div>
        </div>
    );
}
