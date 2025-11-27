import { ChatLayout } from './components/ChatLayout';
import { useChatController } from './hooks/useChatController';

export function ChatFeature() {
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
  } = useChatController();

  return (
    <ChatLayout
      input={input}
      isTyping={isTyping}
      conversations={conversations}
      activeConversationId={activeConversationId}
      activeConversation={activeConversation}
      selectedSource={selectedSource}
      sourceHistory={sourceHistory}
      historyIndex={historyIndex}
      onInputChange={setInput}
      onSend={handleSend}
      onNewChat={handleNewChat}
      onSelectConversation={setActiveConversationId}
      onDeleteConversation={handleDeleteConversation}
      onSourceClick={(source) => handleSourceClick(source)}
      onBackward={handleBackward}
      onForward={handleForward}
      onHistoryItemClick={handleHistoryItemClick}
      onCloseSource={handleCloseSource}
    />
  );
}
