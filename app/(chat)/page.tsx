'use client';

import { useState, useEffect } from 'react';
import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { isUserLoggedIn, createLocalChat, generateDefaultTitle } from '@/lib/local-storage';

export default function Page() {
  const [id, setId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_CHAT_MODEL);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 生成新的聊天ID
    const chatId = generateUUID();
    setId(chatId);
    
    // 检查用户是否登录
    const loggedIn = isUserLoggedIn();
    setIsLoggedIn(loggedIn);
    
    // 如果未登录，创建本地聊天记录
    if (!loggedIn) {
      createLocalChat(generateDefaultTitle(), DEFAULT_CHAT_MODEL);
    }
    
    // 获取选择的模型
    const getChatModel = () => {
      const modelCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('chat-model='));
      
      if (modelCookie) {
        setSelectedModel(modelCookie.split('=')[1]);
      }
    };
    
    getChatModel();
    setIsLoading(false);
  }, []);
  
  if (isLoading || !id) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        selectedChatModel={selectedModel}
        isReadonly={false}
        isLoggedIn={isLoggedIn}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
