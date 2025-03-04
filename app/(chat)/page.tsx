'use client';

import { useState, useEffect } from 'react';
import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { isUserLoggedIn, getCurrentChatId, setCurrentChatId, updateLocalChat, generateDefaultTitle, localChatExists } from '@/lib/local-storage';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function Page() {
  const [id, setId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_CHAT_MODEL);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // 添加一个key来强制重新渲染组件
  const [renderKey, setRenderKey] = useState(Date.now());

  useEffect(() => {
    // 每当路径或搜索参数变化时，重置renderKey以强制重新渲染
    setRenderKey(Date.now());
  }, [pathname, searchParams]);

  useEffect(() => {
    // 检查用户是否登录
    const loggedIn = !!session?.user;
    setIsLoggedIn(loggedIn);
    
    // 生成新的聊天ID或使用当前的聊天ID
    let chatId;
    if (!loggedIn) {
      // 对于未登录用户，尝试获取当前聊天ID
      const currentChatId = getCurrentChatId();
      if (currentChatId) {
        chatId = currentChatId;
      } else {
        // 如果没有当前聊天ID，生成一个新的，并设置为当前聊天ID
        chatId = generateUUID();
        setCurrentChatId(chatId);
      }
      
      // 如果URL中有时间戳参数，说明是新建聊天，需要清除URL参数
      if (searchParams.has('t')) {
        router.replace('/', { scroll: false });
      }
    } else {
      // 对于已登录用户，总是生成新的聊天ID
      chatId = generateUUID();
    }
    
    setId(chatId);
    
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
  }, [session, renderKey, searchParams, router]);
  
  if (isLoading || !id) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  return (
    <>
      <Chat
        key={`${id}-${renderKey}`}
        id={id}
        initialMessages={[]}
        selectedChatModel={selectedModel}
        isReadonly={false}
        isLoggedIn={isLoggedIn}
        onCreateChat={() => {
          // 只有在未登录状态下，且本地不存在该聊天记录时，才创建新的聊天记录
          if (!isLoggedIn && !localChatExists(id)) {
            // 创建新的聊天记录，使用当前ID
            updateLocalChat(id, {
              title: generateDefaultTitle(),
              modelId: selectedModel
            });
          }
        }}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
