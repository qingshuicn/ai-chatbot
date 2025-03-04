'use client';

import type { Attachment, Message } from 'ai';
import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { 
  getLocalChatMessages, 
  saveLocalChatMessages, 
  isUserLoggedIn 
} from '@/lib/local-storage';

import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { LogIn } from 'lucide-react';

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  isReadonly,
  isLoggedIn: propIsLoggedIn,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  isReadonly: boolean;
  isLoggedIn?: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [isLoggedIn, setIsLoggedIn] = useState(propIsLoggedIn ?? false);
  
  // 初始化消息，优先使用服务器提供的初始消息，如果没有则尝试从本地存储加载
  const [initialMessagesState, setInitialMessagesState] = useState<Array<Message>>(
    initialMessages.length > 0 ? initialMessages : []
  );

  useEffect(() => {
    // 如果没有传入登录状态，则检查用户是否已登录
    if (propIsLoggedIn === undefined) {
      setIsLoggedIn(isUserLoggedIn());
    } else {
      setIsLoggedIn(propIsLoggedIn);
    }
    
    // 如果没有初始消息且未登录，尝试从本地存储加载
    if (initialMessages.length === 0 && !isLoggedIn) {
      const localMessages = getLocalChatMessages(id);
      if (localMessages.length > 0) {
        setInitialMessagesState(localMessages);
      }
    }
  }, [id, initialMessages, isLoggedIn, propIsLoggedIn]);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages: initialMessagesState,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      // 如果用户已登录，更新历史记录
      if (isLoggedIn) {
        mutate('/api/history');
      } else {
        // 如果用户未登录，保存到本地存储
        saveLocalChatMessages(id, messages);
      }
    },
    onError: (error) => {
      console.error('聊天错误:', error);
      const errorMessage = error && error.message ? error.message : '发生错误，请重试！';
      toast.error(errorMessage);
    },
  });

  // 当消息更新时，如果用户未登录，保存到本地存储
  useEffect(() => {
    if (!isLoggedIn && messages.length > 0) {
      saveLocalChatMessages(id, messages);
    }
  }, [messages, id, isLoggedIn]);

  const { data: votes } = useSWR<Array<Vote>>(
    isLoggedIn ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-gradient-to-br from-primary/5 via-background to-secondary/5 gradient-animate dark:from-primary/10 dark:via-background dark:to-secondary/10">
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
          <ChatHeader
            chatId={id}
            selectedModelId={selectedChatModel}
            isReadonly={isReadonly}
          />
        </div>

        {!isLoggedIn && (
          <div className="flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-600 dark:text-blue-300 mr-2">
              您当前未登录，聊天记录仅保存在本地浏览器中
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/login'}
              className="flex items-center gap-1 text-xs"
            >
              <LogIn className="h-3 w-3" />
              登录
            </Button>
          </div>
        )}

        <Messages
          chatId={id}
          isLoading={isLoading}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
          isLoggedIn={isLoggedIn}
        />

        <form className="flex mx-auto px-4 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm py-4 md:py-6 gap-2 w-full md:max-w-3xl rounded-t-xl shadow-lg border-t border-zinc-200 dark:border-zinc-700">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
              selectedModelId={selectedChatModel}
              isLoggedIn={isLoggedIn}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        isLoggedIn={isLoggedIn}
      />
    </>
  );
}
