import { useEffect, useState } from 'react';
import { MessageSquare, Database, BarChart3, LogIn, LogOut, Menu, X } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { KnowledgeBase } from './components/KnowledgeBase';
import { Dashboard } from './components/Dashboard';
import { RichTextEditor } from './components/RichTextEditor';
import { AuthModal } from './components/AuthModal';
import { useStore, type User } from './store/useStore';
import styles from './App.module.css';

const NAV_ITEMS = [
  { id: 'chat', label: '智能问答', icon: MessageSquare },
  { id: 'knowledge', label: '知识库', icon: Database },
  { id: 'dashboard', label: '数据看板', icon: BarChart3 },
] as const;

type TabId = (typeof NAV_ITEMS)[number]['id'];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const { user, setUser } = useStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(max-width: 767px)').matches;
  });

  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    category: string;
    subCategory: string;
    status: 'active' | 'inactive';
    onSave: (content: string) => void;
  } | null>(null);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const navButtonClasses = (tab: TabId, variant: 'desktop' | 'mobile' = 'desktop') =>
    [
      variant === 'desktop' ? styles.navButton : styles.mobileNavButton,
      activeTab === tab
        ? variant === 'desktop'
          ? styles.navButtonActive
          : styles.mobileNavButtonActive
        : '',
    ]
      .filter(Boolean)
      .join(' ');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = () => {
      setIsMobile(mediaQuery.matches);
    };

    handleChange();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

  if (editorState?.isOpen) {
    return (
      <RichTextEditor
        title={editorState.title}
        initialContent={editorState.content}
        onSave={(content) => {
          editorState.onSave(content);
          setEditorState(null);
        }}
        onCancel={() => setEditorState(null)}
      />
    );
  }

  return (
    <div className={styles.appShell}>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
      />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={`${styles.topRow} ${styles.desktopRow}`}>
            <div className={styles.brand}>
              <div className={styles.logo}>
                <MessageSquare className={styles.navIcon} size={20} />
              </div>
              <div className={styles.brandInfo}>
                <h1>MIA 商家智能助手</h1>
                <p>Merchant Intelligent Assistant</p>
              </div>
            </div>

            {isMobile ? (
              <div className={styles.mobileControls}>
                {user ? (
                  <div className={styles.profileBadge}>
                    <span>{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(true)}
                    className={styles.outlineButton}
                  >
                    <LogIn size={16} />
                    登录
                  </button>
                )}

                <button
                  type="button"
                  className={styles.mobileMenuButton}
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  aria-label="切换导航"
                  aria-expanded={isMobileMenuOpen}
                >
                  {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            ) : (
              <div className={styles.desktopRow}>
                <nav className={styles.desktopNav}>
                  {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => handleTabChange(id)} className={navButtonClasses(id)}>
                      <Icon className={styles.navIcon} size={16} />
                      {label}
                    </button>
                  ))}
                </nav>

                {user ? (
                  <div className={styles.userArea}>
                    <div className={styles.profile}>
                      <div className={styles.profileBadge}>
                        <span>{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className={styles.profileName}>{user.name}</span>
                    </div>
                    <button type="button" onClick={handleLogout} className={styles.ghostButton}>
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowAuthModal(true)} className={styles.outlineButton}>
                    <LogIn size={16} />
                    登录
                  </button>
                )}
              </div>
            )}
          </div>

          {isMobile && isMobileMenuOpen && (
            <div className={styles.mobileMenu}>
              <nav className={styles.mobileNav}>
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleTabChange(id)}
                    className={navButtonClasses(id, 'mobile')}
                  >
                    <span>
                      <Icon className={styles.navIcon} size={16} />
                      {label}
                    </span>
                    {activeTab === id && <span className={styles.mobileCurrent}>当前</span>}
                  </button>
                ))}
              </nav>

              <div className={styles.mobileUser}>
                {user ? (
                  <>
                    <div className={styles.mobileUserInfo}>
                      <div className={styles.mobileProfile}>
                        <span>{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className={styles.mobileUserDetails}>
                        <p>{user.name}</p>
                        <span>{user.email}</span>
                      </div>
                    </div>
                    <button type="button" onClick={handleLogout} className={styles.ghostButton}>
                      <LogOut size={16} />
                      退出登录
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setShowAuthModal(true)} className={styles.primaryButton}>
                    <LogIn size={16} />
                    登录
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.contentShell}>
          {activeTab === 'chat' ? (
            <ChatInterface />
          ) : (
            <div className={styles.contentPanel}>
              {activeTab === 'knowledge' && <KnowledgeBase onOpenEditor={setEditorState} />}
              {activeTab === 'dashboard' && <Dashboard />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
