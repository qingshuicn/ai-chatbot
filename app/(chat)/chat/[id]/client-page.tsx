'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Message } from 'ai';
import { useSession } from 'next-auth/react';

import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { getLocalChatMessages, isUserLoggedIn, localChatExists } from '@/lib/local-storage';

type ChatPageProps = {
  id: string;
};

export function ChatPage({ id }: ChatPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_CHAT_MODEL);
  const [isReadonly, setIsReadonly] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // 检查用户是否登录
      const loggedIn = !!session?.user;
      setIsLoggedIn(loggedIn);
      
      if (loggedIn) {
        // 已登录用户：从API获取聊天记录
        try {
          const chatResponse = await fetch(`/api/chat/index?id=${id}`);
          
          if (!chatResponse.ok) {
            // 如果聊天不存在，跳转到首页
            if (chatResponse.status === 404) {
              router.push('/');
              return;
            }
          }
          
          const messagesResponse = await fetch(`/api/chat/messages?id=${id}`);
          if (messagesResponse.ok) {
            const data = await messagesResponse.json();
            setMessages(data);
          }
          
          // 获取选择的模型
          const modelCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('chat-model='));
          
          if (modelCookie) {
            setSelectedModel(modelCookie.split('=')[1]);
          }
        } catch (error) {
          console.error('获取聊天记录失败:', error);
        }
      } else {
        // 未登录用户：从本地存储获取聊天记录
        const localMessages = getLocalChatMessages(id);
        if (localMessages.length > 0) {
          setMessages(localMessages);
        } else if (!localChatExists(id)) {
          // 如果本地没有找到聊天记录，创建一个新的空聊天
          // 这里不跳转，而是允许用户使用当前ID开始新对话
        }
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [id, router, session]);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }
  
  return (
    <>
      <Chat
        id={id}
        initialMessages={messages}
        selectedChatModel={selectedModel}
        isReadonly={isReadonly}
        isLoggedIn={isLoggedIn}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
