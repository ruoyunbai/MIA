import { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { KnowledgeBase } from './components/KnowledgeBase';
import { Dashboard } from './components/Dashboard';
import { RichTextEditor } from './components/RichTextEditor';
import { AuthModal } from './components/AuthModal';
import { MessageSquare, Database, BarChart3, LogIn, User, LogOut } from 'lucide-react';
import { Button } from './components/ui/button';

interface User {
  email: string;
  name: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge' | 'dashboard'>('chat');
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
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
            
            <div className="flex items-center gap-4">
              <nav className="flex gap-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  智能问答
                </button>
                <button
                  onClick={() => setActiveTab('knowledge')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'knowledge'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  知识库
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  数据看板
                </button>
              </nav>

              {user ? (
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-sm text-white">{user.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-gray-700">{user.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAuthModal(true)}
                  variant="outline"
                  className="ml-4"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  登录
                </Button>
              )}
            </div>
          </div>
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