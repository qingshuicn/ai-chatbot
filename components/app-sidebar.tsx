'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';

import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Button } from './ui/button';
import { PlusIcon } from 'lucide-react';
import { createLocalChat, generateDefaultTitle, CHAT_MESSAGES_KEY_PREFIX } from '@/lib/local-storage';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const handleNewChat = () => {
    // 创建新的本地聊天记录
    const newChatId = createLocalChat(generateDefaultTitle(), 'gpt-3.5-turbo');
    
    // 清除当前会话的消息
    localStorage.removeItem(`${CHAT_MESSAGES_KEY_PREFIX}${newChatId}`);
    
    // 导航到聊天页面
    router.push(`/chat/${newChatId}`);
    setOpenMobile(false);
  };

  return (
    <Sidebar className="group-data-[side=left]:border-r-0 flex flex-col">
      <SidebarHeader className="flex-shrink-0 h-[52px] flex items-center">
        <SidebarMenu className="px-2 w-full">
          <div className="flex flex-row justify-center items-center">
            <Button
              variant="default"
              size="sm"
              className="w-full flex items-center gap-2 mt-2"
              onClick={handleNewChat}
            >
              <PlusIcon />
              <span>新建聊天</span>
            </Button>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <SidebarContent className="flex-1">
          <SidebarHistory user={user} />
        </SidebarContent>
      </div>
      <SidebarFooter className="flex-shrink-0">{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
