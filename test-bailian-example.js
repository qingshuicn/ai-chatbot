// 百炼模型使用示例
// 使用方法: node test-bailian-example.js

require('dotenv').config({ path: '.env.local' });
const { DashScope } = require('dashscope-node');

// 检查环境变量
const apiKey = process.env.DASHSCOPE_TOKEN;
if (!apiKey) {
  console.error('错误: 缺少 DASHSCOPE_TOKEN 环境变量');
  console.error('请在 .env.local 文件中设置 DASHSCOPE_TOKEN=你的阿里云DashScope访问令牌');
  process.exit(1);
}

// 创建 DashScope 实例
const dashscope = new DashScope(apiKey);

// 示例 1: 基本聊天
async function basicChat() {
  console.log('示例 1: 基本聊天');
  
  const params = {
    model: 'qwen-max',
    input: {
      messages: [
        { role: 'system', content: '你是一个有用的AI助手' },
        { role: 'user', content: '什么是人工智能？请简要介绍' },
      ],
    },
    parameters: {
      temperature: 0.7,
      top_p: 0.8,
      max_tokens: 500,
    },
  };
  
  try {
    const response = await dashscope.generation.call(params);
    console.log('AI 回复:', response.output.text);
    console.log('-'.repeat(50));
  } catch (error) {
    console.error('错误:', error);
  }
}

// 示例 2: 生成标题
async function generateTitle() {
  console.log('示例 2: 生成标题');
  
  const params = {
    model: 'qwen-max',
    input: {
      messages: [
        { 
          role: 'system', 
          content: `
          - 你将根据用户的第一条消息生成一个简短的标题
          - 确保标题不超过80个字符
          - 标题应该是用户消息的摘要
          - 不要使用引号或冒号`
        },
        { 
          role: 'user', 
          content: '我想了解一下如何使用 React 和 Next.js 构建一个现代化的网站，包括服务器端渲染、API 路由和数据获取等方面的最佳实践。' 
        },
      ],
    },
    parameters: {
      temperature: 0.5,
      top_p: 0.8,
      max_tokens: 100,
    },
  };
  
  try {
    const response = await dashscope.generation.call(params);
    console.log('生成的标题:', response.output.text);
    console.log('-'.repeat(50));
  } catch (error) {
    console.error('错误:', error);
  }
}

// 示例 3: 流式响应
async function streamResponse() {
  console.log('示例 3: 流式响应');
  
  const params = {
    model: 'qwen-max',
    input: {
      messages: [
        { role: 'system', content: '你是一个有用的AI助手' },
        { role: 'user', content: '请写一首关于春天的短诗' },
      ],
    },
    parameters: {
      temperature: 0.7,
      top_p: 0.8,
      max_tokens: 300,
      stream: true,
    },
  };
  
  let fullText = '';
  
  try {
    await dashscope.generation.call(params, {
      onStreamData: (data) => {
        const text = data.data?.output?.text;
        if (text) {
          process.stdout.write(text);
          fullText += text;
        }
      },
      onStreamEnd: () => {
        console.log('\n\n完整文本:', fullText);
        console.log('-'.repeat(50));
      },
      onStreamError: (error) => {
        console.error('流式响应错误:', error);
      },
    });
  } catch (error) {
    console.error('错误:', error);
  }
}

// 运行所有示例
async function runAllExamples() {
  await basicChat();
  await generateTitle();
  await streamResponse();
}

runAllExamples();
