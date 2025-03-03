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

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar className="group-data-[side=left]:border-r-0 flex flex-col">
      <SidebarHeader className="flex-shrink-0 h-[52px] flex items-center">
        <SidebarMenu className="px-2 w-full">
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                聊天机器人
              </span>
            </Link>
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
