'use server';

import { Message } from 'ai';
import { cookies } from 'next/headers';

import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
import { VisibilityType } from '@/components/visibility-selector';
import { generateTitleWithBailian } from '@/lib/ai/providers/bailian';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  try {
    // 使用百炼模型生成标题
    if (!process.env.DASHSCOPE_TOKEN) {
      console.error('缺少 DASHSCOPE_TOKEN 环境变量');
      return '新对话';
    }
    
    const title = await generateTitleWithBailian({ message });
    return title;
  } catch (error) {
    console.error('生成标题时出错:', error);
    return '新对话';
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const messages = await getMessageById({ id });
  if (!messages || messages.length === 0) return;
  const message = messages[0];

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({
    chatId,
    visibility,
  });
}
