import { useState } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { ResizeBox } from '@arco-design/web-react';
import { useChat } from '../hooks/useChat';
import { ChatSidebar } from './chat/ChatSidebar';
import { ChatMessageList } from './chat/ChatMessageList';
import { ChatInput } from './chat/ChatInput';
import { SourcePreview } from './chat/SourcePreview';
import styles from './ChatInterface.module.css';

export function ChatInterface() {
  const {
    input,
    setInput,
    isTyping,
    conversations,
    activeConversationId,
    activeConversation,
    setActiveConversationId,
    handleNewChat,
    handleSend,
    handleDeleteConversation,
    selectedSource,
    sourceHistory,
    historyIndex,
    handleSourceClick,
    handleBackward,
    handleForward,
    handleHistoryItemClick,
    handleCloseSource,
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [splitSize, setSplitSize] = useState<number>(0.6);
  const showSourcePanel = Boolean(selectedSource);

  const handleSplitMoving = (_event: MouseEvent, size: number | string) => {
    if (typeof size === 'number') {
      setSplitSize(size);
      return;
    }
    const percent = typeof size === 'string' && size.endsWith('%')
      ? Number.parseFloat(size) / 100
      : undefined;
    if (percent) {
      setSplitSize(percent);
    }
  };

  const chatPane = (
    <div className={styles.chatPanel}>
      <div className={styles.panelBody}>
        <ChatMessageList
          messages={activeConversation?.messages || []}
          isTyping={isTyping}
          onSourceClick={handleSourceClick}
          onSuggestionClick={(text) => handleSend(text)}
        />

        <ChatInput
          input={input}
          setInput={setInput}
          isTyping={isTyping}
          onSend={() => handleSend()}
        />
      </div>
    </div>
  );

  return (
    <div className={styles.interface}>
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Toggle Sidebar Button - Show when sidebar is closed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={styles.toggleSidebar}
          title="打开对话历史"
        >
          <MessageSquare size={18} />
        </button>
      )}

      {/* New Chat Button - Always visible in top right */}
      <button
        onClick={handleNewChat}
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
          setActiveConversationId(id);
          setIsSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main Content Area with Resizable Panels */}
      <div className={styles.workspace}>
        {showSourcePanel && selectedSource ? (
          <ResizeBox.Split
            className={styles.splitContainer}
            direction="horizontal"
            size={splitSize}
            min={0.4}
            max={0.8}
            icon={
              <div className={styles.splitHandle} aria-hidden="true">
                <span className={styles.splitHandleTrack} />
              </div>
            }
            onMoving={handleSplitMoving}
            panes={[
              <div className={styles.chatPane} key="chat-pane">
                {chatPane}
              </div>,
              <div className={styles.sourcePane} key="source-pane">
                <SourcePreview
                  selectedSource={selectedSource}
                  sourceHistory={sourceHistory}
                  historyIndex={historyIndex}
                  onClose={handleCloseSource}
                  onBackward={handleBackward}
                  onForward={handleForward}
                  onHistoryItemClick={handleHistoryItemClick}
                />
              </div>,
            ]}
          />
        ) : (
          <div className={styles.splitPane}>
            {chatPane}
          </div>
        )}
      </div>
    </div>
  );
}
