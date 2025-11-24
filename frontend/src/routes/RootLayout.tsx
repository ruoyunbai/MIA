import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router';
import { AuthModal } from '../components/AuthModal';
import { AppShell, type TabId } from '../components/layout/AppShell';
import { useStore, type User } from '../store/useStore';
import { useEditorModal, type OpenEditorPayload } from '../hooks/useEditorModal';

const tabToPath: Record<TabId, string> = {
  chat: '/',
  knowledge: '/knowledge',
  dashboard: '/dashboard',
};

const resolveTabFromPath = (pathname: string): TabId => {
  if (pathname.startsWith('/knowledge')) return 'knowledge';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  return 'chat';
};

export interface RootOutletContext {
  openEditor: (state: OpenEditorPayload) => void;
}

export function RootLayout() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, setUser } = useStore();
  const { EditorModal, openEditor } = useEditorModal();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = useMemo<TabId>(
    () => resolveTabFromPath(location.pathname),
    [location.pathname],
  );

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleTabChange = (tab: TabId) => {
    const targetPath = tabToPath[tab];
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
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
        onTabChange={handleTabChange}
        onLoginClick={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      >
        <Outlet context={{ openEditor }} />
      </AppShell>
    </>
  );
}

export function useRootOutletContext() {
  return useOutletContext<RootOutletContext>();
}
