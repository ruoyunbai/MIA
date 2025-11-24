import { useEffect, useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { KnowledgeBase } from './components/KnowledgeBase';
import { Dashboard } from './components/Dashboard';
import { RichTextEditor } from './components/RichTextEditor';
import { AuthModal } from './components/AuthModal';
import { MessageSquare, Database, BarChart3, LogIn, LogOut, Menu, X } from 'lucide-react';
import { Button } from './components/ui/button';

interface User {
  email: string;
  name: string;
}

const NAV_ITEMS = [
  { id: 'chat', label: '智能问答', icon: MessageSquare },
  { id: 'knowledge', label: '知识库', icon: Database },
  { id: 'dashboard', label: '数据看板', icon: BarChart3 },
] as const;

type TabId = (typeof NAV_ITEMS)[number]['id'];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [user, setUser] = useState<User | null>(null);
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

  const navButtonClasses = (tab: TabId, extraClasses = '') =>
    `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${extraClasses} ${
      activeTab === tab
        ? 'bg-blue-500 text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-gray-900">MIA 商家智能助手</h1>
                <p className="text-sm text-gray-500 hidden sm:block">Merchant Intelligent Assistant</p>
              </div>
            </div>

            {isMobile ? (
              <div className="flex items-center gap-3">
                {user ? (
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-sm text-white">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                ) : (
                  <Button onClick={() => setShowAuthModal(true)} variant="outline" size="sm">
                    <LogIn className="w-4 h-4 mr-2" />
                    登录
                  </Button>
                )}

                <button
                  type="button"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-700"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  aria-label="切换导航"
                  aria-expanded={isMobileMenuOpen}
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <nav className="flex gap-2">
                  {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => handleTabChange(id)} className={navButtonClasses(id)}>
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </nav>

                {user ? (
                  <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-sm text-white">{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm text-gray-700">{user.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setShowAuthModal(true)} variant="outline" className="ml-4">
                    <LogIn className="w-4 h-4 mr-2" />
                    登录
                  </Button>
                )}
              </div>
            )}
          </div>

          {isMobile && isMobileMenuOpen && (
            <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
              <nav className="flex flex-col gap-2">
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleTabChange(id)}
                    className={navButtonClasses(id, 'justify-between w-full text-sm')}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </span>
                    {activeTab === id && <span className="text-xs">当前</span>}
                  </button>
                ))}
              </nav>

              <div className="flex flex-col gap-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-base text-white">{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="justify-start text-gray-600 hover:text-gray-900"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      退出登录
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setShowAuthModal(true)} className="w-full">
                    <LogIn className="w-4 h-4 mr-2" />
                    登录
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 bg-white">
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'knowledge' && <KnowledgeBase onOpenEditor={setEditorState} />}
        {activeTab === 'dashboard' && <Dashboard />}
      </main>
    </div>
  );
}
