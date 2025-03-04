import { auth } from '@/app/(auth)/auth';
import { getVotesByChatId, voteMessage } from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new Response('需要提供聊天ID', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    // 未登录用户返回空数组而不是401错误
    return Response.json([], { status: 200 });
  }

  const votes = await getVotesByChatId({ id: chatId });

  return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
  const {
    chatId,
    messageId,
    type,
  }: { chatId: string; messageId: string; type: 'up' | 'down' } =
    await request.json();

  if (!chatId || !messageId || !type) {
    return new Response('需要提供消息ID和类型', { status: 400 });
  }

  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    // 未登录用户返回成功但不执行任何操作
    return new Response('未登录用户无法投票', { status: 200 });
  }

  await voteMessage({
    chatId,
    messageId,
    type: type,
  });

  return new Response('消息已投票', { status: 200 });
}
