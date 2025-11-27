import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router';
import { AuthModal } from '../components/AuthModal';
import { AppShell, type TabId } from '../components/layout/AppShell';
import { useAppStore } from '../store/useAppStore';
import { useEditorModal, type OpenEditorPayload } from '../hooks/useEditorModal';
import { fetchCurrentUser } from '../api/user';
import { AUTH_LOGOUT_EVENT, clearAuthToken, getAuthToken } from '../utils/authToken';
import type { User } from '../store/types';

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
  const { user, setUser } = useAppStore();
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
    clearAuthToken();
    setUser(null);
  };

  const handleTabChange = (tab: TabId) => {
    const targetPath = tabToPath[tab];
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (user) return undefined;
    const token = getAuthToken();
    if (!token) return undefined;
    let active = true;

    fetchCurrentUser()
      .then((profile) => {
        if (active) {
          setUser(profile);
        }
      })
      .catch(() => {
        clearAuthToken();
        if (active) {
          setUser(null);
        }
      });

    return () => {
      active = false;
    };
  }, [setUser, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleForceLogout = () => setUser(null);
    window.addEventListener(AUTH_LOGOUT_EVENT, handleForceLogout);
    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleForceLogout);
    };
  }, [setUser]);

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
