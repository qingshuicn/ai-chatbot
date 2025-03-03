// 测试百炼模型流式API调用
require('dotenv').config({ path: '.env.local' });
const { createSDK } = require("dashscope-node");

async function main() {
  try {
    // 获取API密钥
    const apiKey = process.env.DASHSCOPE_TOKEN;
    if (!apiKey) {
      console.error('缺少 DASHSCOPE_TOKEN 环境变量');
      return;
    }

    console.log('创建DashScope SDK...');
    const dashscope = createSDK({
      accessToken: apiKey,
    });

    console.log('调用流式聊天API...');
    // 正确的请求参数格式
    const params = {
      model: 'qwen-max',
      input: {
        messages: [
          { role: 'user', content: '请简要介绍一下通义千问大模型' },
        ],
      },
      parameters: {
        temperature: 0.7,
        top_p: 0.8,
        max_tokens: 100,
        incremental_output: true,
      },
    };

    console.log('发送流式请求...');
    const result = await dashscope.chat.streamCompletion.request(params);
    
    let fullText = '';
    
    while (true) {
      const { done, value } = await result.read();
      
      if (done) {
        console.log('流式响应结束');
        break;
      }
      
      if (value?.data?.output?.text) {
        process.stdout.write(value.data.output.text);
        fullText += value.data.output.text;
      }
    }
    
    console.log('\n\n完整响应:', fullText);
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

main();
