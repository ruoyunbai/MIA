import { useState } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { Resizable } from 're-resizable';
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
        <Resizable
          defaultSize={{
            width: selectedSource ? '60%' : '100%',
            height: '100%',
          }}
          minWidth={selectedSource ? '40%' : '100%'}
          maxWidth={selectedSource ? '80%' : '100%'}
          enable={{
            right: selectedSource ? true : false,
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
          {/* Chat Area */}
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
        </Resizable>

        {/* Source Viewer Panel */}
        {selectedSource && (
          <SourcePreview
            selectedSource={selectedSource}
            sourceHistory={sourceHistory}
            historyIndex={historyIndex}
            onClose={handleCloseSource}
            onBackward={handleBackward}
            onForward={handleForward}
            onHistoryItemClick={handleHistoryItemClick}
          />
        )}
      </div>
    </div>
  );
}
