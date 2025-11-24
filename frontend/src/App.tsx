import { useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { AppShell, type TabId } from './components/layout/AppShell';
import { useStore, type User } from './store/useStore';
import { useEditorModal } from './hooks/useEditorModal';
import { ChatPage, KnowledgePage, DashboardPage } from './pages';
import styles from './App.module.css';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, setUser } = useStore();
  const { EditorModal, openEditor } = useEditorModal();

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
      />
      {EditorModal}

      <AppShell
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLoginClick={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      >
        {activeTab === 'chat' ? (
          <ChatPage />
        ) : (
          <div className={styles.contentPanel}>
            {activeTab === 'knowledge' && <KnowledgePage onOpenEditor={openEditor} />}
            {activeTab === 'dashboard' && <DashboardPage />}
          </div>
        )}
      </AppShell>
    </>
  );
}
