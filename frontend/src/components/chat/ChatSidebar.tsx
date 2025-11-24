import { type MouseEvent } from 'react';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import styles from './ChatSidebar.module.css';
import type { Conversation } from '../../store/useStore';

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    conversations: Conversation[];
    activeConversationId: string;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
    onDeleteConversation: (id: string) => void;
}

export function ChatSidebar({
    isOpen,
    onClose,
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewChat,
    onDeleteConversation,
}: ChatSidebarProps) {
    return (
        <div className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
            {/* Header */}
            <div className={styles.header}>
                <h3 className={styles.title}>对话历史</h3>
                <button
                    onClick={onClose}
                    className={styles.closeButton}
                    title="关闭侧边栏"
                >
                    <X size={18} />
                </button>
            </div>

            {/* New Chat Button in Sidebar */}
            <div className={styles.newChatSection}>
                <button type="button" onClick={onNewChat} className={styles.newChatButton}>
                    <Plus size={16} />
                    新建对话
                </button>
            </div>

            <div className={styles.scrollArea}>
                {conversations.map(conv => (
                    <div
                        key={conv.id}
                        onClick={() => onSelectConversation(conv.id)}
                        className={`${styles.conversation} ${activeConversationId === conv.id ? styles.conversationActive : ''}`}
                    >
                        <div className={styles.conversationContent}>
                            <div className={styles.conversationIcon}>
                                <MessageSquare size={16} />
                            </div>
                            <div className={styles.conversationInfo}>
                                <p className={styles.conversationTitle}>{conv.title}</p>
                                <p className={styles.conversationDate}>
                                    {conv.createdAt.toLocaleDateString('zh-CN')}
                                </p>
                            </div>
                            <button
                                onClick={(e: MouseEvent) => {
                                    e.stopPropagation();
                                    onDeleteConversation(conv.id);
                                }}
                                className={styles.deleteButton}
                                title="删除对话"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
