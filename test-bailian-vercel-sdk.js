// 测试百炼模型与Vercel AI SDK的集成
require('dotenv').config({ path: '.env.local' });

// 导入自定义提供者
const { bailian } = require('./lib/ai/providers/bailian');
const { streamText } = require('ai');

async function main() {
  try {
    console.log('初始化百炼模型...');
    const model = bailian('qwen-max');
    
    console.log('调用streamText函数...');
    const result = streamText({
      model,
      prompt: '请简要介绍一下通义千问大模型',
      temperature: 0.7,
      maxTokens: 100,
      onError: (error) => {
        console.error('流式响应错误:', error);
      },
      onChunk: ({ chunk }) => {
        if (chunk.type === 'text') {
          process.stdout.write(chunk.text);
        }
      },
      onFinish: ({ text, finishReason }) => {
        console.log('\n\n完成原因:', finishReason);
        console.log('完整响应:', text);
      }
    });
    
    // 等待流式响应完成
    await result.text;
    console.log('测试完成');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

main();
