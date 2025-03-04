import { ChatRequestOptions, Message } from 'ai';
import { PreviewMessage, ThinkingMessage } from './message';
import { useScrollToBottom } from './use-scroll-to-bottom';
import { Overview } from './overview';
import { memo } from 'react';
import { Vote } from '@/lib/db/schema';
import equal from 'fast-deep-equal';

interface MessagesProps {
  chatId: string;
  isLoading: boolean;
  messages: Array<Message>;
  votes?: Array<Vote>;
  isLoggedIn?: boolean;
  setMessages: (messages: Message[] | ((messages: Message[]) => Message[])) => void;
  reload: (chatRequestOptions?: ChatRequestOptions) => Promise<string | null | undefined>;
}

export function MessagesComponent({
  chatId,
  isLoading,
  messages,
  votes = [],
  isLoggedIn = false,
  setMessages,
  reload,
}: MessagesProps) {
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-8 flex-1 overflow-y-scroll pt-6 pb-4 bg-transparent"
    >
      {messages.length === 0 && <Overview />}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          message={message}
          isLoading={isLoading && messages.length - 1 === index}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === message.id)
              : undefined
          }
          setMessages={setMessages}
          reload={reload}
          isReadonly={false}
          isLoggedIn={isLoggedIn}
        />
      ))}

      {isLoading && messages.length === 0 && <ThinkingMessage />}
      <div ref={messagesEndRef} />
    </div>
  );
}

export const Messages = memo(MessagesComponent, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isLoading && nextProps.isLoading) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;
  if (prevProps.isLoggedIn !== nextProps.isLoggedIn) return false;

  return true;
});
