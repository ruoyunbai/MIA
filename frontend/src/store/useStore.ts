import { create } from 'zustand';

// --- User Types ---
export interface User {
    email: string;
    name: string;
}

// --- Chat Types ---
export interface Message {
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

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
}

// --- Knowledge Base Types ---
export interface Document {
    id: string;
    title: string;
    category: string;
    subCategory: string;
    status: 'active' | 'inactive';
    uploadDate: Date;
    content: string;
    fileType?: 'text' | 'pdf';
    fileUrl?: string;
}

export interface SubCategory {
    id: string;
    name: string;
}

export interface Category {
    id: string;
    name: string;
    subCategories: SubCategory[];
}

// --- Store State & Actions ---
interface AppState {
    // User State
    user: User | null;
    setUser: (user: User | null) => void;

    // Chat State
    conversations: Conversation[];
    activeConversationId: string;
    setConversations: (conversations: Conversation[]) => void;
    setActiveConversationId: (id: string) => void;
    addConversation: (conversation: Conversation) => void;
    updateConversation: (id: string, updates: Partial<Conversation>) => void;
    addMessageToConversation: (conversationId: string, message: Message) => void;
    deleteConversation: (id: string) => void;

    // Knowledge Base State
    documents: Document[];
    categories: Category[];
    setDocuments: (documents: Document[]) => void;
    setCategories: (categories: Category[]) => void;
    addDocument: (doc: Document) => void;
    updateDocument: (id: string, updates: Partial<Document>) => void;
    deleteDocument: (id: string) => void;
    addCategory: (category: Category) => void;
    updateCategory: (id: string, updates: Partial<Category>) => void;
    deleteCategory: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
    // --- User Initial State ---
    user: null,
    setUser: (user) => set({ user }),

    // --- Chat Initial State ---
    conversations: [
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
                    content: '根据抖音电商规则，商家可以通过以下步骤申诉差评：\\n\\n1. **申诉入口**：进入"订单管理" > "评价管理"，找到需要申诉的差评\\n2. **申诉条件**：差评内容包含辱骂、广告、无关内容等违规情况\\n3. **申诉流程**：点击"申诉"按钮，选择申诉理由，上传相关证明材料\\n4. **审核时效**：平台会在3个工作日内完成审核\\n\\n注意：正常的负面评价（如质量问题、物流问题等真实反馈）不支持申诉删除。',
                    sources: [
                        {
                            title: '评价管理规则',
                            category: '商品管理 > 评价管理',
                            snippet: '商家可针对违规评价内容提起申诉，包括但不限于：辱骂、广告推广、无关内容...',
                            content: '# 评价管理规则\\n\\n## 一、总则\\n\\n商家可针对违规评价内容提起申诉。本规则适用于所有在平台上经营的商家。\\n\\n## 二、申诉条件\\n\\n商家可以对以下类型的评价提起申诉：\\n\\n1. **辱骂类评价**：包含人身攻击、侮辱性语言的评价\\n2. **广告推广**：评价中包含其他商家或平台的推广信息\\n3. **无关内容**：与商品或服务完全无关的评价内容\\n4. **恶意差评**：明显存在恶意攻击或敲诈勒索行为\\n\\n## 三、申诉流程\\n\\n### 3.1 提交申诉\\n\\n1. 登录商家后台\\n2. 进入"订单管理" > "评价管理"\\n3. 找到需要申诉的评价，点击"申诉"按钮\\n4. 选择申诉理由\\n5. 上传相关证明材料\\n6. 提交申诉\\n\\n### 3.2 审核时效\\n\\n平台会在收到申诉后的**3个工作日**内完成审核，并将结果通过站内信通知商家。\\n\\n### 3.3 申诉结果\\n\\n- 申诉通过：违规评价将被删除或隐藏\\n- 申诉驳回：评价继续保留，商家可以通过回复评价的方式进行说明\\n\\n## 四、注意事项\\n\\n⚠️ **重要提示**：正常的负面评价（如质量问题、物流问题等真实反馈）不支持申诉删除。商家应当重视买家的真实反馈，积极改进商品和服务质量。\\n\\n## 五、违规处罚\\n\\n如商家恶意提交虚假申诉，平台将视情节严重程度给予以下处罚：\\n\\n- 警告\\n- 限制申诉功能\\n- 店铺降权\\n- 严重者将清退出平台',
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
    ],
    activeConversationId: '1',
    setConversations: (conversations) => set({ conversations }),
    setActiveConversationId: (id) => set({ activeConversationId: id }),
    addConversation: (conversation) =>
        set((state) => ({ conversations: [conversation, ...state.conversations] })),
    updateConversation: (id, updates) =>
        set((state) => ({
            conversations: state.conversations.map((c) =>
                c.id === id ? { ...c, ...updates } : c
            ),
        })),
    addMessageToConversation: (conversationId, message) =>
        set((state) => ({
            conversations: state.conversations.map((c) =>
                c.id === conversationId
                    ? { ...c, messages: [...c.messages, message] }
                    : c
            ),
        })),
    deleteConversation: (id) =>
        set((state) => ({
            conversations: state.conversations.filter((c) => c.id !== id),
        })),

    // --- Knowledge Base Initial State ---
    documents: [
        {
            id: '1',
            title: '评价管理规则',
            category: '商品管理',
            subCategory: '评价管理',
            status: 'active',
            uploadDate: new Date('2024-11-15'),
            content: '商家可针对违规评价内容提起申诉，包括但不限于：辱骂、广告推广、无关内容...',
        },
        {
            id: '2',
            title: '商家经营规范总则',
            category: '管理总则',
            subCategory: '经营规范',
            status: 'active',
            uploadDate: new Date('2024-11-10'),
            content: '商家应遵守诚信经营原则，确保商品信息真实准确，按时发货...',
        },
        {
            id: '3',
            title: '禁售商品管理规则',
            category: '商品管理',
            subCategory: '商品发布',
            status: 'active',
            uploadDate: new Date('2024-11-01'),
            content: '平台禁止销售假冒伪劣、侵权、违法违规商品...',
        },
        {
            id: '4',
            title: '入驻规则（2023版）',
            category: '招商入驻',
            subCategory: '入驻与退出',
            status: 'inactive',
            uploadDate: new Date('2023-06-01'),
            content: '商家入驻需提交营业执照、品牌授权等资质材料...',
        },
    ],
    categories: [
        {
            id: '1',
            name: '招商入驻',
            subCategories: [
                { id: '1-1', name: '入驻与退出' },
                { id: '1-2', name: '资质管理' },
                { id: '1-3', name: '保证金管理' },
            ],
        },
        {
            id: '2',
            name: '商品管理',
            subCategories: [
                { id: '2-1', name: '商品发布' },
                { id: '2-2', name: '商品审核' },
                { id: '2-3', name: '评价管理' },
            ],
        },
        {
            id: '3',
            name: '管理总则',
            subCategories: [
                { id: '3-1', name: '经营规范' },
                { id: '3-2', name: '违规处罚' },
                { id: '3-3', name: '申诉流程' },
            ],
        },
        {
            id: '4',
            name: '商家服务',
            subCategories: [
                { id: '4-1', name: '售后管理' },
                { id: '4-2', name: '物流管理' },
                { id: '4-3', name: '客服规范' },
            ],
        },
    ],
    setDocuments: (documents) => set({ documents }),
    setCategories: (categories) => set({ categories }),
    addDocument: (doc) => set((state) => ({ documents: [doc, ...state.documents] })),
    updateDocument: (id, updates) =>
        set((state) => ({
            documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),
    deleteDocument: (id) =>
        set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),
    addCategory: (category) =>
        set((state) => ({ categories: [...state.categories, category] })),
    updateCategory: (id, updates) =>
        set((state) => ({
            categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
    deleteCategory: (id) =>
        set((state) => ({ categories: state.categories.filter((c) => c.id !== id) })),
}));
