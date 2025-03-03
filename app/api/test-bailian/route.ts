import { NextResponse } from 'next/server';
import { bailian } from '@/lib/ai/providers/bailian';

// 设置为公共路由，不需要身份验证
export const dynamic = 'force-dynamic';
// 使用 Node.js 运行时而不是 Edge 运行时
export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('调用百炼模型测试...');
    
    // 直接使用 bailian 函数创建模型
    const model = bailian('qwen-max');
    
    // 直接调用 doStream 方法
    const { stream } = await model.doStream({
      prompt: '请简要介绍一下通义千问大模型',
      temperature: 0.7,
      maxTokens: 100,
    });
    
    // 创建一个纯文本流
    const textStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              controller.close();
              break;
            }
            
            // 根据不同的消息类型处理
            if (value.type === 'text-delta') {
              // 只输出文本部分
              controller.enqueue(new TextEncoder().encode(value.textDelta));
            }
          }
        } catch (error) {
          console.error('处理流时出错:', error);
          controller.error(error);
        }
      }
    });
    
    // 返回纯文本流
    return new Response(textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('测试过程中出错:', error);
    return NextResponse.json(
      { error: '测试过程中出错', message: (error as Error).message },
      { status: 500 }
    );
  }
}
