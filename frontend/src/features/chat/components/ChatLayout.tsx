import { useState } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { Resizable } from 're-resizable';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { SourcePreview } from './SourcePreview';
import styles from './ChatLayout.module.css';
import type {
  Conversation,
  SourceAttachment,
  Message,
} from '../../../store/types';

export interface ChatLayoutProps {
  input: string;
  isTyping: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation?: Conversation;
  selectedSource: SourceAttachment | null;
  sourceHistory: SourceAttachment[];
  historyIndex: number;
  onInputChange: (value: string) => void;
  onSend: (text?: string) => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onSourceClick: (source: SourceAttachment) => void;
  onBackward: () => void;
  onForward: () => void;
  onHistoryItemClick: (index: number) => void;
  onCloseSource: () => void;
}

export function ChatLayout({
  input,
  isTyping,
  conversations,
  activeConversationId,
  activeConversation,
  selectedSource,
  sourceHistory,
  historyIndex,
  onInputChange,
  onSend,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onSourceClick,
  onBackward,
  onForward,
  onHistoryItemClick,
  onCloseSource,
}: ChatLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const chatMessages: Message[] = activeConversation?.messages ?? [];

  return (
    <div className={styles.interface}>
      {isSidebarOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={styles.toggleSidebar}
          title="打开对话历史"
        >
          <MessageSquare size={18} />
        </button>
      )}

      <button
        onClick={onNewChat}
        className={styles.newChat}
        title="新建对话"
      >
        <Plus size={18} />
      </button>

      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          onSelectConversation(id);
          setIsSidebarOpen(false);
        }}
        onNewChat={onNewChat}
        onDeleteConversation={onDeleteConversation}
      />

      <div className={styles.workspace}>
        <Resizable
          defaultSize={{
            width: selectedSource ? '60%' : '100%',
            height: '100%',
          }}
          minWidth={selectedSource ? '40%' : '100%'}
          maxWidth={selectedSource ? '80%' : '100%'}
          enable={{
            right: Boolean(selectedSource),
          }}
          handleStyles={{
            right: {
              width: '4px',
              right: '-2px',
              cursor: 'col-resize',
              backgroundColor: 'transparent',
            },
          }}
          handleClasses={{
            right: 'hover:bg-blue-500 transition-colors',
          }}
          className={styles.chatPanel}
        >
          <div className={styles.panelBody}>
            <ChatMessageList
              messages={chatMessages}
              isTyping={isTyping}
              onSourceClick={onSourceClick}
              onSuggestionClick={(text) => onSend(text)}
            />

            <ChatInput
              input={input}
              setInput={onInputChange}
              isTyping={isTyping}
              onSend={() => onSend()}
            />
          </div>
        </Resizable>

        {selectedSource && (
          <SourcePreview
            selectedSource={selectedSource}
            sourceHistory={sourceHistory}
            historyIndex={historyIndex}
            onClose={onCloseSource}
            onBackward={onBackward}
            onForward={onForward}
            onHistoryItemClick={onHistoryItemClick}
          />
        )}
      </div>
    </div>
  );
}
