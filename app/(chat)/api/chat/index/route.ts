import { auth } from '@/app/(auth)/auth';
import { getChatById } from '@/lib/db/queries';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('聊天ID是必需的', { status: 400 });
  }

  const session = await auth();
  
  // 如果用户未登录，返回空对象
  if (!session?.user) {
    return NextResponse.json({});
  }

  try {
    const chat = await getChatById({ id });
    
    if (!chat) {
      return new NextResponse('聊天不存在', { status: 404 });
    }
    
    // 检查权限
    if (chat.userId !== session.user.id && chat.visibility !== 'public') {
      return new NextResponse('无权访问此聊天', { status: 403 });
    }
    
    return NextResponse.json(chat);
  } catch (error) {
    console.error('获取聊天信息失败:', error);
    return new NextResponse('获取聊天信息失败', { status: 500 });
  }
}
