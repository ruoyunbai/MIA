import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MessageSquare, Database, BarChart3, LogIn, LogOut, Menu, X } from 'lucide-react';
import styles from '../../App.module.css';
import type { User } from '../../store/useStore';
import { useIsMobile } from '../../hooks/useIsMobile';

const NAV_ITEMS = [
  { id: 'chat', label: '智能问答', icon: MessageSquare },
  { id: 'knowledge', label: '知识库', icon: Database },
  { id: 'dashboard', label: '数据看板', icon: BarChart3 },
] as const;

export type TabId = (typeof NAV_ITEMS)[number]['id'];

interface AppShellProps {
  user: User | null;
  onLoginClick: () => void;
  onLogout: () => void;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: ReactNode;
}

export function AppShell({
  user,
  onLoginClick,
  onLogout,
  activeTab,
  onTabChange,
  children,
}: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // 使用 1025px 作为断点，与 CSS 中的 @media (max-width: 1024px) 保持一致
  const isMobile = useIsMobile(1025);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

  const navButtonClasses = useMemo(
    () => (tab: TabId, variant: 'desktop' | 'mobile' = 'desktop') =>
      [
        variant === 'desktop' ? styles.navButton : styles.mobileNavButton,
        activeTab === tab
          ? variant === 'desktop'
            ? styles.navButtonActive
            : styles.mobileNavButtonActive
          : '',
      ]
        .filter(Boolean)
        .join(' '),
    [activeTab],
  );

  const handleTabChange = (tab: TabId) => {
    onTabChange(tab);
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className={styles.appShell}>
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
                  <button type="button" onClick={onLoginClick} className={styles.outlineButton}>
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
                    <button
                      key={id}
                      onClick={() => handleTabChange(id)}
                      className={navButtonClasses(id)}
                    >
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
                    <button type="button" onClick={onLogout} className={styles.ghostButton}>
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={onLoginClick} className={styles.outlineButton}>
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
                    <button type="button" onClick={onLogout} className={styles.ghostButton}>
                      <LogOut size={16} />
                      退出登录
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={onLoginClick} className={styles.primaryButton}>
                    <LogIn size={16} />
                    登录
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.contentShell}>{children}</div>
      </main>
    </div>
  );
}
