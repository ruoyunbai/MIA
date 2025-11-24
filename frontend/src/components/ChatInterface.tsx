import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Plus, MessageSquare, ExternalLink, FileText, ChevronLeft, ChevronRight, Paperclip, Mic, ArrowUp, Scissors, ChevronDown, Trash2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Resizable } from 're-resizable';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    title: string;
    category: string;
    snippet: string;
    content?: string;
  }>;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      title: '差评处理流程咨询',
      messages: [
        {
          id: '1',
          role: 'user',
          content: '差评如何申诉？',
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          id: '2',
          role: 'assistant',
          content: '根据抖音电商规则，商家可以通过以下步骤申诉差评：\\n\\n1. **申诉入口**：进入\"订单管理\" > \"评价管理\"，找到需要申诉的差评\\n2. **申诉条件**：差评内容包含辱骂、广告、无关内容等违规情况\\n3. **申诉流程**：点击\"申诉\"按钮，选择申诉理由，上传相关证明材料\\n4. **审核时效**：平台会在3个工作日内完成审核\\n\\n注意：正常的负面评价（如质量问题、物流问题等真实反馈）不支持申诉删除。',
          sources: [
            {
              title: '评价管理规则',
              category: '商品管理 > 评价管理',
              snippet: '商家可针对违规评价内容提起申诉，包括但不限于：辱骂、广告推广、无关内容...',
              content: '# 评价管理规则\\n\\n## 一、总则\\n\\n商家可针对违规评价内容提起申诉。本规则适用于所有在平台上经营的商家。\\n\\n## 二、申诉条件\\n\\n商家可以对以下类型的评价提起申诉：\\n\\n1. **辱骂类评价**：包含人身攻击、侮辱性语言的评价\\n2. **广告推广**：评价中包含其他商家或平台的推广信息\\n3. **无关内容**：与商品或服务完全无关的评价内容\\n4. **恶意差评**：明显存在恶意攻击或敲诈勒索行为\\n\\n## 三、申诉流程\\n\\n### 3.1 提交申诉\\n\\n1. 登录商家后台\\n2. 进入\"订单管理\" > \"评价管理\"\\n3. 找到需要申诉的评价，点击\"申诉\"按钮\\n4. 选择申诉理由\\n5. 上传相关证明材料\\n6. 提交申诉\\n\\n### 3.2 审核时效\\n\\n平台会在收到申诉后的**3个工作日**内完成审核，并将结果通过站内信通知商家。\\n\\n### 3.3 申诉结果\\n\\n- 申诉通过：违规评价将被删除或隐藏\\n- 申诉驳回：评价继续保留，商家可以通过回复评价的方式进行说明\\n\\n## 四、注意事项\\n\\n⚠️ **重要提示**：正常的负面评价（如质量问题、物流问题等真实反馈）不支持申诉删除。商家应当重视买家的真实反馈，积极改进商品和服务质量。\\n\\n## 五、违规处罚\\n\\n如商家恶意提交虚假申诉，平台将视情节严重程度给予以下处罚：\\n\\n- 警告\\n- 限制申诉功能\\n- 店铺降权\\n- 严重者将清退出平台',
            },
            {
              title: '申诉流程说明',
              category: '商家服务 > 售后管理',
              snippet: '申诉入口位于订单管理-评价管理模块，审核周期为3个工作日...',
              content: '# 申诉流程详细说明\\n\\n## 申诉入口\\n\\n申诉入口位于**订单管理 - 评价管理**模块。\\n\\n## 审核周期\\n\\n标准审核周期为**3个工作日**。如遇特殊情况（如节假日、大促期间），审核时间可能会适当延长。\\n\\n## 所需材料\\n\\n根据不同的申诉理由，需要准备不同的证明材料：\\n\\n1. **辱骂类评价**：截图保存完整的评价内容\\n2. **广告推广**：标注出评价中的广告内容\\n3. **恶意差评**：提供聊天记录、订单信息等证明材料\\n\\n## 申诉技巧\\n\\n- 描述清晰：说明申诉理由时要言简意赅\\n- 证据充分：提供的证明材料要完整、清晰\\n- 及时跟进：关注审核进度，必要时补充材料',
            },
          ],
          timestamp: new Date(Date.now() - 3500000),
        },
      ],
      createdAt: new Date(Date.now() - 3600000),
    },
  ]);
  
  const [activeConversationId, setActiveConversationId] = useState('1');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<{
    title: string;
    category: string;
    snippet: string;
    content?: string;
  } | null>(null);
  const [sourceHistory, setSourceHistory] = useState<{
    title: string;
    category: string;
    snippet: string;
    content?: string;
  }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(80);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Update header height dynamically
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('header');
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
    };
    
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewChat = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: '新对话',
      messages: [],
      createdAt: new Date(),
    };
    setConversations([newConversation, ...conversations]);
    setActiveConversationId(newConversation.id);
  };

  const simulateTyping = async (text: string): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(text), 1000);
    });
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConversation) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    // Update conversation with user message
    setConversations(prev =>
      prev.map(conv =>
        conv.id === activeConversationId
          ? {
              ...conv,
              title: conv.messages.length === 0 ? input.slice(0, 20) + '...' : conv.title,
              messages: [...conv.messages, userMessage],
            }
          : conv
      )
    );

    setInput('');
    setIsTyping(true);

    // Simulate AI response
    const mockResponse = await simulateTyping(
      '根据您的问题，我为您查询了相关规则文档。\n\n商家需要遵守平台的经营规范，具体要求包括：\n\n1. **商品信息**：确保商品标题、图片、描述与实物一致\n2. **发货时效**：承诺发货时间内完成发货\n3. **售后服务**：及时响应买家咨询，处理退换货申请\n4. **禁售商品**：不得销售平台明令禁止的商品\n\n违反规则可能导致商品下架、店铺处罚等后果。建议定期查看规则中心了解最新变更。'
    );

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: mockResponse,
      sources: [
        {
          title: '商家经营规范总则',
          category: '管理总则 > 经营规范',
          snippet: '商家应遵守诚信经营原则，确保商品信息真实准确，按时发货...',
          content: '# 商家经营规范总则\n\n## 第一章 总则\n\n为规范商家经营行为，保护消费者合法权益，促进平台健康发展，特制定本规范。\n\n## 第二章 商品信息规范\n\n### 2.1 商品标题\n\n- 标题应准确描述商品，不得使用夸大、虚假的描述\n- 禁止使用极限词（如"最好"、"第一"等）\n- 标题字数建议30-60字\n\n### 2.2 商品图片\n\n- 图片应清晰展示商品实物\n- 止使用盗图、与实物不符的图片\n- 建议使用白底图，尺寸800x800以\n\n### 2.3 商品描述\n\n- 详细描述商品规格、材质、功能等\n- 如实说明商品瑕疵或使用限制\n- 禁止虚假宣传\n\n## 第三章 发货时效\n\n商家应按照承诺的发货时间完成发货：\n\n- 预售商品：按预售规则约定时间发货\n- 现货商品：72小时内发货\n- 定制商品：与买家约定的时间发货\n\n**超时发货将受到以下处罚**：\n- 首次超时：警告\n- 多次超时：店铺降权\n- 严重超时：赔偿买家\n\n## 第四章 售后服务\n\n### 4.1 客服响应\n\n- 工作时间内，首次响应时间不超过1小时\n- 非工作时间，应设置自动回复\n\n### 4.2 退换货处理\n\n- 7天无理退货（特殊商品除外）\n- 质量问题支持退换货\n- 退换货运费由责任方承担',
        },
        {
          title: '禁售商品管理规则',
          category: '商品管理 > 商品发布',
          snippet: '平台禁止销售假冒伪劣、侵权、违法违规商品...',
          content: '# 禁售商品管理规则\n\n## 一、禁售商品类目\n\n### 1.1 假冒伪劣商品\n\n- 假冒品牌商品\n- 三无产品（无生产日期、无质量合格证、无生产厂家）\n- 质量不合格的商品\n\n### 1.2 侵权商品\n\n- 侵犯他人商标权的商品\n- 侵犯著作权的商品\n- 侵犯专利权的商品\n\n### 1.3 违法违规商品\n\n- 危险品（如易燃易爆物品）\n- 管制物品（如管制刀具）\n- 违禁药品\n- 色情低俗商品\n\n## 二、违规处罚\n\n### 2.1 商品下架\n\n一经发现禁售商品，立即下架处理。\n\n### 2.2 店铺处罚\n\n- 首次违规：警告+扣分\n- 二次违规：店铺限流7天\n- 三次违规：店铺封禁30天\n- 严重违规：永久清退\n\n### 2.3 法律责任\n\n涉及违法犯罪的，将移交司法机关处理。',
        },
      ],
      timestamp: new Date(),
    };

    setConversations(prev =>
      prev.map(conv =>
        conv.id === activeConversationId
          ? { ...conv, messages: [...conv.messages, assistantMessage] }
          : conv
      )
    );

    setIsTyping(false);
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSourceClick = (source: typeof selectedSource) => {
    if (!source) return;
    
    // If there's a current source, add it to history
    if (selectedSource) {
      const newHistory = sourceHistory.slice(0, historyIndex + 1);
      newHistory.push(selectedSource);
      setSourceHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
      // First source, reset history
      setSourceHistory([]);
      setHistoryIndex(-1);
    }
    
    setSelectedSource(source);
  };

  const handleBackward = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSelectedSource(sourceHistory[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setSelectedSource(sourceHistory[0]);
    }
  };

  const handleForward = () => {
    if (historyIndex < sourceHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSelectedSource(sourceHistory[historyIndex + 1]);
    }
  };

  const handleHistoryItemClick = (index: number) => {
    setHistoryIndex(index);
    setSelectedSource(sourceHistory[index]);
    setShowHistoryDropdown(false);
  };

  const handleCloseSource = () => {
    setSelectedSource(null);
    setSourceHistory([]);
    setHistoryIndex(-1);
    setShowHistoryDropdown(false);
  };

  const handleDeleteConversation = (conversationId: string, e: ReactMouseEvent) => {
    e.stopPropagation(); // Prevent triggering the conversation selection
    
    // Filter out the conversation to delete
    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
    setConversations(updatedConversations);
    
    // If deleting the active conversation, switch to another one
    if (activeConversationId === conversationId) {
      if (updatedConversations.length > 0) {
        setActiveConversationId(updatedConversations[0].id);
      } else {
        // If no conversations left, create a new one
        const newConversation: Conversation = {
          id: Date.now().toString(),
          title: '新对话',
          messages: [],
          createdAt: new Date(),
        };
        setConversations([newConversation]);
        setActiveConversationId(newConversation.id);
      }
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-100px)] relative bg-white">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Toggle Sidebar Button - Show when sidebar is closed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 z-30 w-10 h-10 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center text-gray-600 hover:text-gray-900"
          style={{ top: `${headerHeight + 5}px` }}
          title="打开对话历史"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}

      {/* New Chat Button - Always visible in top right */}
      <button
        onClick={handleNewChat}
        className="fixed left-16 z-30 w-10 h-10 bg-blue-500 text-white rounded-lg shadow-sm hover:shadow-md hover:bg-blue-600 transition-all flex items-center justify-center"
        style={{ top: `${headerHeight + 5}px` }}
        title="新建对话"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Sidebar - Conversation History */}
      <div 
        className={`bg-white rounded-lg border border-gray-200 flex flex-col transition-all duration-300 
          fixed inset-y-0 left-0 z-50 w-72 lg:w-80
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-gray-900">对话历史</h3>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="关闭侧边栏"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button in Sidebar */}
        <div className="p-4 border-b border-gray-200">
          <Button onClick={handleNewChat} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            新建对话
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveConversationId(conv.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors group relative cursor-pointer ${
                  activeConversationId === conv.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 mt-1 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0 pr-8">
                    <p className="text-sm text-gray-900 truncate">{conv.title}</p>
                    <p className="text-xs text-gray-500">
                      {conv.createdAt.toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="删除对话"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area with Resizable Panels */}
      <div className="flex-1 flex gap-0 relative">
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
          className="bg-white rounded-lg flex flex-col"
        >
          {/* Chat Area */}
          <div className="flex-1 flex flex-col h-full">
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6 pt-16 lg:pt-6">
              {activeConversation?.messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-gray-900 mb-2">开始您的咨询</h3>
                    <p className="text-gray-500 text-sm mb-6">
                      我是MIA智能助手，可以帮您解答抖音电商经营相关的问题
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['差评如何申诉？', '如何避免商品违规？', '发货超时怎么办？'].map(q => (
                        <button
                          key={q}
                          onClick={() => setInput(q)}
                          className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                activeConversation?.messages.map(message => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-3xl ${message.role === 'user' ? 'ml-12' : 'mr-12'}`}>
                      <div
                        className={`p-3 lg:p-4 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-50 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm lg:text-base">{message.content}</p>
                      </div>
                      
                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            参考来源
                          </p>
                          {message.sources.map((source, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                              onClick={() => handleSourceClick(source)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm text-gray-900">{source.title}</p>
                                    <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  </div>
                                  <p className="text-xs text-gray-500 mb-2">{source.category}</p>
                                  <p className="text-xs text-gray-600 line-clamp-2">{source.snippet}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-400 mt-2">
                        {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-3xl mr-12">
                    <div className="p-4 rounded-lg bg-gray-50">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  {/* Textarea */}
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入您的问题..."
                    className="w-full border-0 resize-none focus:ring-0 focus:outline-none p-2 min-h-[50px] lg:min-h-[60px] max-h-[150px] lg:max-h-[200px] bg-white text-sm lg:text-base"
                  />
                  
                  {/* Bottom Controls */}
                  <div className="flex items-center justify-between pt-2">
                    {/* Left Side Tools */}
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 lg:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="上传附件"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Right Side Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 lg:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors hidden lg:flex"
                        title="裁剪"
                      >
                        <Scissors className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1.5 lg:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="语音输入"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="p-1.5 lg:p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors ml-1"
                        title="发送"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Resizable>

        {/* Source Viewer Panel */}
        {selectedSource && (
          <div className="flex-1 bg-white border-l border-gray-200 flex flex-col h-full fixed inset-0 z-50 lg:relative lg:z-auto">
            {/* Header */}
            <div className="p-3 border-b border-gray-200 flex items-center gap-2 flex-shrink-0">
              {/* Navigation Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleBackward}
                  disabled={historyIndex <= 0}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="返回"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleForward}
                  disabled={historyIndex >= sourceHistory.length - 1}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="前进"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="w-px h-5 bg-gray-200"></div>

              {/* Document Info with Dropdown */}
              <div className="flex items-center gap-2 flex-1 min-w-0 relative" ref={historyDropdownRef}>
                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <button
                  onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                  className="flex-1 min-w-0 text-left hover:bg-gray-50 rounded px-2 py-1.5 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm text-gray-900 truncate">{selectedSource.title}</h3>
                      <p className="text-xs text-gray-500 truncate">{selectedSource.category}</p>
                    </div>
                    {sourceHistory.length > 0 && (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-gray-600" />
                    )}
                  </div>
                </button>

                {/* History Dropdown */}
                {showHistoryDropdown && sourceHistory.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    <div className="p-2">
                      <p className="text-xs text-gray-500 px-2 py-1 mb-1">最近查看</p>
                      {sourceHistory.map((source, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleHistoryItemClick(idx)}
                          className={`w-full text-left px-3 py-2 rounded hover:bg-gray-50 transition-colors ${
                            idx === historyIndex ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 truncate">{source.title}</p>
                              <p className="text-xs text-gray-500 truncate">{source.category}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleCloseSource}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 lg:p-6">
                {selectedSource.content ? (
                  <div className="prose prose-sm max-w-none">
                    {selectedSource.content.split('\n').map((line, idx) => {
                      if (line.startsWith('# ')) {
                        return <h1 key={idx} className="text-gray-900 mt-6 mb-3">{line.substring(2)}</h1>;
                      } else if (line.startsWith('## ')) {
                        return <h2 key={idx} className="text-gray-900 mt-5 mb-2">{line.substring(3)}</h2>;
                      } else if (line.startsWith('### ')) {
                        return <h3 key={idx} className="text-gray-800 mt-4 mb-2">{line.substring(4)}</h3>;
                      } else if (line.startsWith('- ')) {
                        return <li key={idx} className="text-gray-700 ml-4">{line.substring(2)}</li>;
                      } else if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={idx} className="text-gray-900 my-2"><strong>{line.slice(2, -2)}</strong></p>;
                      } else if (line.trim() === '') {
                        return <div key={idx} className="h-2" />;
                      } else {
                        return <p key={idx} className="text-gray-700 my-2">{line}</p>;
                      }
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">暂无详细内容</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
