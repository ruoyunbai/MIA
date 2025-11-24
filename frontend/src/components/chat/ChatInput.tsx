import { ArrowUp, Mic, Paperclip, Scissors } from 'lucide-react';
import styles from './ChatInput.module.css';
import type { KeyboardEvent } from 'react';

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    isTyping: boolean;
    onSend: () => void;
}

export function ChatInput({ input, setInput, isTyping, onSend }: ChatInputProps) {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className={styles.inputSection}>
            <div className={styles.inputCard}>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入您的问题..."
                    className={styles.textarea}
                />

                <div className={styles.controls}>
                    <div className={styles.toolRow}>
                        <button type="button" className={styles.iconButton} title="上传附件">
                            <Paperclip size={16} />
                        </button>
                    </div>

                    <div className={styles.toolRow}>
                        <button
                            type="button"
                            className={`${styles.iconButton} ${styles.desktopOnly}`}
                            title="裁剪"
                        >
                            <Scissors size={16} />
                        </button>
                        <button type="button" className={styles.iconButton} title="语音输入">
                            <Mic size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={onSend}
                            disabled={!input.trim() || isTyping}
                            className={styles.sendButton}
                            title="发送"
                        >
                            <ArrowUp size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
