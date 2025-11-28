import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import styles from './ChatMessageList.module.css';
import type { Message, SourceAttachment } from '../../../store/types';

interface ChatMessageListProps {
    messages: Message[];
    isTyping: boolean;
    onSourceClick: (source: SourceAttachment) => void;
    onSuggestionClick: (text: string) => void;
}

export function ChatMessageList({ messages, isTyping, onSourceClick, onSuggestionClick }: ChatMessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    if (messages.length === 0) {
        return (
            <div className={styles.messageList}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyCard}>
                        <div className={styles.emptyIcon}>
                            <MessageSquare size={28} />
                        </div>
                        <h3 className={styles.emptyTitle}>开始您的咨询</h3>
                        <p className={styles.emptyText}>
                            我是 MIA 智能助手，可以帮您解答抖音电商经营相关的问题
                        </p>
                        <div className={styles.suggestions}>
                            {['差评如何申诉？', '如何避免商品违规？', '发货超时怎么办？'].map(q => (
                                <button
                                    key={q}
                                    onClick={() => onSuggestionClick(q)}
                                    className={styles.suggestionButton}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={scrollRef} className={styles.messageList}>
            {messages.map(message => (
                <ChatMessage key={message.id} message={message} onSourceClick={onSourceClick} />
            ))}

            {isTyping && (
                <div className={styles.typingWrapper}>
                    <div className={styles.typingBubble}>
                        <span className={styles.typingDot} />
                        <span className={styles.typingDot} />
                        <span className={styles.typingDot} />
                    </div>
                </div>
            )}
        </div>
    );
}
