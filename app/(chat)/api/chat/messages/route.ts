import { auth } from '@/app/(auth)/auth';
import { getMessagesByChatId } from '@/lib/db/queries';
import { convertToUIMessages } from '@/lib/utils';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('聊天ID是必需的', { status: 400 });
  }

  const session = await auth();
  
  // 如果用户未登录，返回空数组
  if (!session?.user) {
    return NextResponse.json([]);
  }

  try {
    const messages = await getMessagesByChatId({ id });
    return NextResponse.json(convertToUIMessages(messages));
  } catch (error) {
    console.error('获取聊天消息失败:', error);
    return new NextResponse('获取聊天消息失败', { status: 500 });
  }
}
