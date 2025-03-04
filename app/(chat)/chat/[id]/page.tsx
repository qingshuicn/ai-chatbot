import { Suspense } from 'react';
import { ChatPage } from './client-page';

export default async function Page({ params }: {
  params: Promise<{ id: string }>
}) {
  // 等待 params 解析
  const resolvedParams = await params;
  
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <ChatPage id={resolvedParams.id} />
    </Suspense>
  );
}
