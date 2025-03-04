import { Message } from 'ai';
import { generateUUID } from './utils';

// 本地存储键名
const CHAT_HISTORY_KEY = 'ai-chatbot-history';
const CHAT_MESSAGES_KEY_PREFIX = 'ai-chatbot-messages-';
const CURRENT_CHAT_ID_KEY = 'ai-chatbot-current-chat';

// 本地存储聊天历史记录类型
export interface LocalChatHistory {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  modelId: string;
}

/**
 * 获取本地存储的聊天历史列表
 */
export function getLocalChatHistory(): LocalChatHistory[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const history = localStorage.getItem(CHAT_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('获取本地聊天历史失败:', error);
    return [];
  }
}

/**
 * 保存聊天历史到本地存储
 */
export function saveLocalChatHistory(history: LocalChatHistory[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('保存本地聊天历史失败:', error);
  }
}

/**
 * 创建新的聊天会话
 */
export function createLocalChat(title: string, modelId: string): string {
  const id = generateUUID();
  const now = new Date().toISOString();
  
  const newChat: LocalChatHistory = {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    modelId
  };
  
  const history = getLocalChatHistory();
  saveLocalChatHistory([newChat, ...history]);
  
  // 保存当前聊天ID
  setCurrentChatId(id);
  
  return id;
}

/**
 * 更新聊天会话信息
 */
export function updateLocalChat(id: string, updates: Partial<LocalChatHistory>): void {
  const history = getLocalChatHistory();
  const chatExists = history.some(chat => chat.id === id);
  
  if (!chatExists) {
    // 如果聊天不存在，创建一个新的
    const now = new Date().toISOString();
    const newChat: LocalChatHistory = {
      id,
      title: updates.title || generateDefaultTitle(),
      createdAt: now,
      updatedAt: now,
      modelId: updates.modelId || 'gpt-3.5-turbo',
      ...updates
    };
    
    saveLocalChatHistory([newChat, ...history]);
    return;
  }
  
  const updatedHistory = history.map(chat => 
    chat.id === id 
      ? { ...chat, ...updates, updatedAt: new Date().toISOString() }
      : chat
  );
  
  saveLocalChatHistory(updatedHistory);
}

/**
 * 删除聊天会话
 */
export function deleteLocalChat(id: string): void {
  const history = getLocalChatHistory();
  const filteredHistory = history.filter(chat => chat.id !== id);
  
  saveLocalChatHistory(filteredHistory);
  
  // 删除相关消息
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${CHAT_MESSAGES_KEY_PREFIX}${id}`);
    
    // 如果删除的是当前聊天，清除当前聊天ID
    if (getCurrentChatId() === id) {
      clearCurrentChatId();
    }
  }
}

/**
 * 获取聊天消息
 */
export function getLocalChatMessages(chatId: string): Message[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const messages = localStorage.getItem(`${CHAT_MESSAGES_KEY_PREFIX}${chatId}`);
    return messages ? JSON.parse(messages) : [];
  } catch (error) {
    console.error('获取本地聊天消息失败:', error);
    return [];
  }
}

/**
 * 保存聊天消息
 */
export function saveLocalChatMessages(chatId: string, messages: Message[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(`${CHAT_MESSAGES_KEY_PREFIX}${chatId}`, JSON.stringify(messages));
    
    // 更新聊天历史的更新时间和标题
    const history = getLocalChatHistory();
    const chat = history.find(c => c.id === chatId);
    
    if (chat) {
      // 如果聊天已存在，只更新时间
      updateLocalChat(chatId, {});
    } else if (messages.length > 0) {
      // 如果聊天不存在但有消息，创建新聊天
      // 使用第一条用户消息作为标题
      const firstUserMessage = messages.find(m => m.role === 'user');
      const title = firstUserMessage 
        ? firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '')
        : generateDefaultTitle();
      
      updateLocalChat(chatId, { title });
    }
    
    // 保存当前聊天ID
    setCurrentChatId(chatId);
  } catch (error) {
    console.error('保存本地聊天消息失败:', error);
  }
}

/**
 * 检查用户是否已登录
 */
export function isUserLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  
  // 这里需要根据项目的认证机制来实现
  // 例如，检查是否存在认证令牌或会话cookie
  return document.cookie.includes('next-auth.session-token');
}

/**
 * 生成默认的聊天标题
 */
export function generateDefaultTitle(): string {
  const now = new Date();
  return `新对话 ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
}

/**
 * 设置当前聊天ID
 */
export function setCurrentChatId(id: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CURRENT_CHAT_ID_KEY, id);
  } catch (error) {
    console.error('保存当前聊天ID失败:', error);
  }
}

/**
 * 获取当前聊天ID
 */
export function getCurrentChatId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(CURRENT_CHAT_ID_KEY);
  } catch (error) {
    console.error('获取当前聊天ID失败:', error);
    return null;
  }
}

/**
 * 清除当前聊天ID
 */
export function clearCurrentChatId(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CURRENT_CHAT_ID_KEY);
  } catch (error) {
    console.error('清除当前聊天ID失败:', error);
  }
}

/**
 * 检查聊天是否存在
 */
export function localChatExists(id: string): boolean {
  const history = getLocalChatHistory();
  return history.some(chat => chat.id === id);
}

/**
 * 获取聊天信息
 */
export function getLocalChat(id: string): LocalChatHistory | null {
  const history = getLocalChatHistory();
  return history.find(chat => chat.id === id) || null;
}
