'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import type { User } from 'next-auth';
import { memo, useEffect, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { generateUUID } from '@/lib/utils';
import { getLocalChatHistory, deleteLocalChat, setCurrentChatId, createLocalChat, generateDefaultTitle, LocalChatHistory, CHAT_MESSAGES_KEY_PREFIX } from '@/lib/local-storage';

import {
  CheckCircleFillIcon,
  GlobeIcon,
  LockIcon,
  MoreHorizontalIcon,
  PlusIcon,
  ShareIcon,
  TrashIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import type { Chat } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { useChatVisibility } from '@/hooks/use-chat-visibility';

type GroupedChats = {
  today: (Chat | LocalChatHistory)[];
  yesterday: (Chat | LocalChatHistory)[];
  lastWeek: (Chat | LocalChatHistory)[];
  lastMonth: (Chat | LocalChatHistory)[];
  older: (Chat | LocalChatHistory)[];
};

const groupChatsByDate = (chats: (Chat | LocalChatHistory)[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats,
  );
};

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
  isLocalChat = false,
}: {
  chat: Chat | LocalChatHistory;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
  isLocalChat?: boolean;
}) => {
  // 只有在非本地聊天时才使用可见性功能
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
    initialVisibility: 'chat' in chat ? chat.visibility : 'private',
  });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={`/chat/${chat.id}`} onClick={() => setOpenMobile(false)}>
          <span>{chat.title}</span>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mr-0.5"
            showOnHover={!isActive}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">更多</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="end">
          {!isLocalChat && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <ShareIcon />
                <span>分享</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    className="cursor-pointer flex-row justify-between"
                    onClick={() => {
                      setVisibilityType('private');
                    }}
                  >
                    <div className="flex flex-row gap-2 items-center">
                      <LockIcon size={12} />
                      <span>私有</span>
                    </div>
                    {visibilityType === 'private' ? (
                      <CheckCircleFillIcon />
                    ) : null}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer flex-row justify-between"
                    onClick={() => {
                      setVisibilityType('public');
                    }}
                  >
                    <div className="flex flex-row gap-2 items-center">
                      <GlobeIcon />
                      <span>公开</span>
                    </div>
                    {visibilityType === 'public' ? <CheckCircleFillIcon /> : null}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}

          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
            onSelect={() => onDelete(chat.id)}
          >
            <TrashIcon />
            <span>删除</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) return false;
  return true;
});

export function SidebarHistory({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const { id } = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const {
    data: history,
    isLoading,
    mutate,
  } = useSWR<Array<Chat>>(user ? '/api/history' : null, fetcher, {
    fallbackData: [],
  });

  // 本地聊天历史
  const [localHistory, setLocalHistory] = useState<LocalChatHistory[]>([]);
  
  // 加载本地聊天历史
  useEffect(() => {
    if (!user) {
      setLocalHistory(getLocalChatHistory());
    }
  }, [user, pathname]);

  useEffect(() => {
    mutate();
  }, [pathname, mutate]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLocalDelete, setIsLocalDelete] = useState(false);
  
  const handleDelete = async () => {
    if (isLocalDelete) {
      // 删除本地聊天
      deleteLocalChat(deleteId!);
      setLocalHistory(getLocalChatHistory());
      toast.success('聊天已成功删除');
      
      if (deleteId === id) {
        router.push('/');
      }
    } else {
      // 删除服务器聊天
      const deletePromise = fetch(`/api/chat?id=${deleteId}`, {
        method: 'DELETE',
      });

      toast.promise(deletePromise, {
        loading: '正在删除聊天...',
        success: () => {
          mutate((history) => {
            if (history) {
              return history.filter((h) => h.id !== id);
            }
          });
          return '聊天已成功删除';
        },
        error: '删除聊天失败',
      });

      if (deleteId === id) {
        router.push('/');
      }
    }
    
    setShowDeleteDialog(false);
  };

  const onDeleteChat = (chatId: string, isLocal = false) => {
    setDeleteId(chatId);
    setIsLocalDelete(isLocal);
    setShowDeleteDialog(true);
  };

  if (!user) {
    return (
      <div className="flex flex-col h-full">
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="px-2 py-4 flex flex-col gap-4">
              <div className="text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
                登录以保存和重访之前的聊天！
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {localHistory.length > 0 && (
          <SidebarGroup>
            <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
              本地聊天记录
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {(() => {
                  const groupedChats = groupChatsByDate(localHistory);
                  
                  return (
                    <>
                      {groupedChats.today.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                            今天
                          </div>
                          {groupedChats.today.map((chat) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={chat.id === id}
                              onDelete={(chatId) => onDeleteChat(chatId, true)}
                              setOpenMobile={setOpenMobile}
                              isLocalChat={true}
                            />
                          ))}
                        </>
                      )}
                      
                      {groupedChats.yesterday.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                            昨天
                          </div>
                          {groupedChats.yesterday.map((chat) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={chat.id === id}
                              onDelete={(chatId) => onDeleteChat(chatId, true)}
                              setOpenMobile={setOpenMobile}
                              isLocalChat={true}
                            />
                          ))}
                        </>
                      )}
                      
                      {groupedChats.lastWeek.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                            上周
                          </div>
                          {groupedChats.lastWeek.map((chat) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={chat.id === id}
                              onDelete={(chatId) => onDeleteChat(chatId, true)}
                              setOpenMobile={setOpenMobile}
                              isLocalChat={true}
                            />
                          ))}
                        </>
                      )}
                      
                      {groupedChats.lastMonth.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                            上个月
                          </div>
                          {groupedChats.lastMonth.map((chat) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={chat.id === id}
                              onDelete={(chatId) => onDeleteChat(chatId, true)}
                              setOpenMobile={setOpenMobile}
                              isLocalChat={true}
                            />
                          ))}
                        </>
                      )}
                      
                      {groupedChats.older.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                            更早
                          </div>
                          {groupedChats.older.map((chat) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={chat.id === id}
                              onDelete={(chatId) => onDeleteChat(chatId, true)}
                              setOpenMobile={setOpenMobile}
                              isLocalChat={true}
                            />
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                您确定要删除这个聊天吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <SidebarGroup>
          <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
            今天
          </div>
          <SidebarGroupContent>
            <div className="flex flex-col">
              {[44, 32, 28, 64, 52].map((item) => (
                <div
                  key={item}
                  className="rounded-md h-8 flex gap-2 px-2 items-center"
                >
                  <div
                    className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                    style={
                      {
                        '--skeleton-width': `${item}%`,
                      } as React.CSSProperties
                    }
                  />
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    );
  }

  if (history?.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="px-2 py-4 flex flex-col gap-4">
              <div className="text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
                开始聊天后，您的对话将显示在这里！
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 py-2">
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
      
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {history &&
              (() => {
                const groupedChats = groupChatsByDate(history);

                return (
                  <>
                    {groupedChats.today.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
                          今天
                        </div>
                        {groupedChats.today.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={(chatId) => onDeleteChat(chatId)}
                            setOpenMobile={setOpenMobile}
                          />
                        ))}
                      </>
                    )}

                    {groupedChats.yesterday.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-sidebar-foreground/50 mt-6">
                          昨天
                        </div>
                        {groupedChats.yesterday.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={(chatId) => onDeleteChat(chatId)}
                            setOpenMobile={setOpenMobile}
                          />
                        ))}
                      </>
                    )}

                    {groupedChats.lastWeek.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-sidebar-foreground/50 mt-6">
                          最近 7 天
                        </div>
                        {groupedChats.lastWeek.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={(chatId) => onDeleteChat(chatId)}
                            setOpenMobile={setOpenMobile}
                          />
                        ))}
                      </>
                    )}

                    {groupedChats.lastMonth.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-sidebar-foreground/50 mt-6">
                          最近 30 天
                        </div>
                        {groupedChats.lastMonth.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={(chatId) => onDeleteChat(chatId)}
                            setOpenMobile={setOpenMobile}
                          />
                        ))}
                      </>
                    )}

                    {groupedChats.older.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-sidebar-foreground/50 mt-6">
                          更早
                        </div>
                        {groupedChats.older.map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={(chatId) => onDeleteChat(chatId)}
                            setOpenMobile={setOpenMobile}
                          />
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>您确定吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。它将永久删除您的聊天并从我们的服务器中删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              继续
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
