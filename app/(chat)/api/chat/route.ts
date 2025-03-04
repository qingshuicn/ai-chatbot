import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';

import { auth } from '@/app/(auth)/auth';
import { myProvider } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';

export const maxDuration = 60;

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedChatModel,
  }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json();

  const session = await auth();
  const isLoggedIn = !!(session && session.user && session.user.id);

  // 确保 session 不为 null，为工具函数创建一个安全的 session 对象
  const safeSession = session || {
    user: { id: 'anonymous', name: 'Anonymous', email: '' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const userMessage = getMostRecentUserMessage(messages);

  if (!userMessage) {
    return new Response('未找到用户消息', { status: 400 });
  }

  // 只有登录用户才保存聊天记录到数据库
  if (isLoggedIn) {
    const chat = await getChatById({ id });
    
    // 确保 session.user.id 存在
    const userId = session?.user?.id;
    if (!userId) {
      return new Response('用户ID不存在', { status: 400 });
    }

    if (!chat) {
      const title = await generateTitleFromUserMessage({ message: userMessage });
      await saveChat({ id, userId, title });
    }

    await saveMessages({
      messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
    });
  }

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt({ selectedChatModel }),
        messages,
        maxSteps: 5,
        experimental_activeTools:
          selectedChatModel === 'chat-model-reasoning'
            ? []
            : [
                'getWeather',
                'createDocument',
                'updateDocument',
                'requestSuggestions',
              ],
        experimental_transform: smoothStream({ chunking: 'word' }),
        experimental_generateMessageId: generateUUID,
        tools: {
          getWeather,
          createDocument: createDocument({ session: safeSession, dataStream }),
          updateDocument: updateDocument({ session: safeSession, dataStream }),
          requestSuggestions: requestSuggestions({
            session: safeSession,
            dataStream,
          }),
        },
        onFinish: async ({ response, reasoning }) => {
          if (isLoggedIn) {
            try {
              const sanitizedResponseMessages = sanitizeResponseMessages({
                messages: response.messages,
                reasoning,
              });

              await saveMessages({
                messages: sanitizedResponseMessages.map((message) => {
                  return {
                    id: message.id,
                    chatId: id,
                    role: message.role,
                    content: message.content,
                    createdAt: new Date(),
                  };
                }),
              });
            } catch (error) {
              console.error('Failed to save chat');
            }
          }
        },
        experimental_telemetry: {
          isEnabled: true,
          functionId: 'stream-text',
        },
      });

      result.consumeStream();

      result.mergeIntoDataStream(dataStream, {
        sendReasoning: true,
      });
    },
    onError: () => {
      return 'Oops, an error occured!';
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('未找到', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('未授权', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('未授权', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('聊天已删除', { status: 200 });
  } catch (error) {
    return new Response('处理请求时发生错误', {
      status: 500,
    });
  }
}
