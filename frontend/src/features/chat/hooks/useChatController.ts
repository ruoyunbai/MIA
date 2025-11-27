import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import type {
  Conversation,
  Message,
  SourceAttachment,
} from '../../../store/types';

const simulateTyping = (text: string): Promise<string> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(text), 1000);
  });

type SourceState = SourceAttachment | null;

export function useChatController() {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    ensureConversation,
    addConversation,
    addMessageToConversation,
    updateConversation,
    deleteConversation,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [selectedSource, setSelectedSource] = useState<SourceState>(null);
  const [sourceHistory, setSourceHistory] = useState<SourceAttachment[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    ensureConversation();
  }, [ensureConversation]);

  const activeConversation = useMemo<Conversation | undefined>(() => {
    return conversations.find((c) => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  const handleNewChat = useCallback(() => {
    const newConversation: Conversation = {
      id: `${Date.now()}`,
      title: '新对话',
      messages: [],
      createdAt: new Date(),
    };
    addConversation(newConversation);
    setActiveConversationId(newConversation.id);
    setSelectedSource(null);
    setSourceHistory([]);
    setHistoryIndex(-1);
  }, [addConversation, setActiveConversationId]);

  const handleSend = useCallback(
    async (text?: string) => {
      const contentToSend = text ?? input;
      if (!contentToSend.trim()) return;

      const targetConversation = activeConversation ?? ensureConversation();
      if (!targetConversation) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: contentToSend,
        timestamp: new Date(),
      };

      addMessageToConversation(targetConversation.id, userMessage);
      if (targetConversation.messages.length === 0) {
        updateConversation(targetConversation.id, {
          title: `${contentToSend.slice(0, 20)}...`,
        });
      }

      if (!text) {
        setInput('');
      }
      setIsTyping(true);

      const mockResponse = await simulateTyping(
        '根据您的问题，我为您查询了相关规则文档。\n\n商家需要遵守平台的经营规范，具体要求包括：\n\n1. **商品信息**：确保商品标题、图片、描述与实物一致\n2. **发货时效**：承诺发货时间内完成发货\n3. **售后服务**：及时响应买家咨询，处理退换货申请\n4. **禁售商品**：不得销售平台明令禁止的商品\n\n违反规则可能导致商品下架、店铺处罚等后果。建议定期查看规则中心了解最新变更。',
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: mockResponse,
        sources: [
          {
            title: '商家经营规范总则',
            category: '管理总则 > 经营规范',
            snippet:
              '商家应遵守诚信经营原则，确保商品信息真实准确，按时发货...',
            content:
              '# 商家经营规范总则\n\n## 第一章 总则\n\n为规范商家经营行为，保护消费者合法权益，促进平台健康发展，特制定本规范。\n\n## 第二章 商品信息规范\n\n### 2.1 商品标题\n\n- 标题应准确描述商品，不得使用夸大、虚假的描述\n- 禁止使用极限词（如"最好"、"第一"等）\n- 标题字数建议30-60字\n\n### 2.2 商品图片\n\n- 图片应清晰展示商品实物\n- 止使用盗图、与实物不符的图片\n- 建议使用白底图，尺寸800x800以\n\n### 2.3 商品描述\n\n- 详细描述商品规格、材质、功能等\n- 如实说明商品瑕疵或使用限制\n- 禁止虚假宣传\n\n## 第三章 发货时效\n\n商家应按照承诺的发货时间完成发货：\n\n- 预售商品：按预售规则约定时间发货\n- 现货商品：72小时内发货\n- 定制商品：与买家约定的时间发货\n\n**超时发货将受到以下处罚**：\n- 首次超时：警告\n- 多次超时：店铺降权\n- 严重超时：赔偿买家\n\n## 第四章 售后服务\n\n### 4.1 客服响应\n\n- 工作时间内，首次响应时间不超过1小时\n- 非工作时间，应设置自动回复\n\n### 4.2 退换货处理\n\n- 7天无理退货（特殊商品除外）\n- 质量问题支持退换货\n- 退换货运费由责任方承担',
          },
          {
            title: '禁售商品管理规则',
            category: '商品管理 > 商品发布',
            snippet: '平台禁止销售假冒伪劣、侵权、违法违规商品...',
            content:
              '# 禁售商品管理规则\n\n## 一、禁售商品类目\n\n### 1.1 假冒伪劣商品\n\n- 假冒品牌商品\n- 三无产品（无生产日期、无质量合格证、无生产厂家）\n- 质量不合格的商品\n\n### 1.2 侵权商品\n\n- 侵犯他人商标权的商品\n- 侵犯著作权的商品\n- 侵犯专利权的商品\n\n### 1.3 违法违规商品\n\n- 危险品（如易燃易爆物品）\n- 管制物品（如管制刀具）\n- 违禁药品\n- 色情低俗商品\n\n## 二、违规处罚\n\n### 2.1 商品下架\n\n一经发现禁售商品，立即下架处理。\n\n### 2.2 店铺处罚\n\n- 首次违规：警告+扣分\n- 二次违规：店铺限流7天\n- 三次违规：店铺封禁30天\n- 严重违规：永久清退\n\n### 2.3 法律责任\n\n涉及违法犯罪的，将移交司法机关处理。',
          },
        ],
        timestamp: new Date(),
      };

      addMessageToConversation(targetConversation.id, assistantMessage);
      setIsTyping(false);
    },
    [
      activeConversation,
      addMessageToConversation,
      ensureConversation,
      input,
      updateConversation,
    ],
  );

  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      deleteConversation(conversationId);
      if (activeConversationId === conversationId) {
        setSelectedSource(null);
        setSourceHistory([]);
        setHistoryIndex(-1);
      }
    },
    [activeConversationId, deleteConversation],
  );

  const handleSourceClick = useCallback(
    (source: SourceAttachment) => {
      if (selectedSource) {
        const newHistory = sourceHistory.slice(0, historyIndex + 1);
        newHistory.push(selectedSource);
        setSourceHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      } else {
        setSourceHistory([]);
        setHistoryIndex(-1);
      }
      setSelectedSource(source);
    },
    [historyIndex, selectedSource, sourceHistory],
  );

  const handleBackward = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSelectedSource(sourceHistory[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setSelectedSource(sourceHistory[0]);
    }
  }, [historyIndex, sourceHistory]);

  const handleForward = useCallback(() => {
    if (historyIndex < sourceHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSelectedSource(sourceHistory[historyIndex + 1]);
    }
  }, [historyIndex, sourceHistory]);

  const handleHistoryItemClick = useCallback(
    (index: number) => {
      setHistoryIndex(index);
      setSelectedSource(sourceHistory[index]);
    },
    [sourceHistory],
  );

  const handleCloseSource = useCallback(() => {
    setSelectedSource(null);
    setSourceHistory([]);
    setHistoryIndex(-1);
  }, []);

  return {
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
  };
}
