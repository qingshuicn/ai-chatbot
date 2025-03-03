// 测试百炼模型API调用
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

    console.log('调用聊天API...');
    // 正确的请求参数格式
    const params = {
      model: 'qwen-max',
      input: {
        messages: [
          { role: 'user', content: '你好，请生成一个简短的标题' },
        ],
      },
      parameters: {
        temperature: 0.5,
        top_p: 0.8,
        max_tokens: 100,
      },
    };

    console.log('发送请求...');
    // 不要传递空对象作为第一个参数
    const response = await dashscope.chat.completion.request(params);
    
    console.log('响应结果:');
    console.log(JSON.stringify(response, null, 2));
    
    if (response && response.output && response.output.text) {
      console.log('生成的文本:', response.output.text.trim());
    } else {
      console.error('无效的响应格式');
    }
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

main();
