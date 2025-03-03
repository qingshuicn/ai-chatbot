// 测试百炼模型的流式响应
// 使用方法: node test-stream-detailed.js

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

// 准备请求参数
const params = {
  model: 'qwen-max',
  input: {
    messages: [
      { role: 'system', content: '你是一个有用的AI助手' },
      { role: 'user', content: '用中文介绍一下你自己' },
    ],
  },
  parameters: {
    temperature: 0.7,
    top_p: 0.8,
    max_tokens: 1500,
    stream: true,
  },
};

console.log('开始测试百炼模型流式响应...');
console.log('模型: qwen-max');
console.log('请求参数:', JSON.stringify(params, null, 2));

let fullText = '';

// 调用流式 API
dashscope.generation.call(params, {
  onStreamData: (data) => {
    try {
      // 打印完整的响应数据
      console.log('流式响应数据:', JSON.stringify(data));
      
      // 处理流式响应
      const value = data;
      let text = null;
      
      if (value?.data?.output?.text !== undefined) {
        text = value.data.output.text;
        console.log(`结构1生成文本: ${text}`);
      } else if (value?.output?.text !== undefined) {
        text = value.output.text;
        console.log(`结构2生成文本: ${text}`);
      } else if (typeof value === 'string') {
        text = value;
        console.log(`结构3生成文本: ${text}`);
      }
      
      if (text !== null) {
        fullText += text;
      }
    } catch (error) {
      console.error('处理流式响应时出错:', error);
    }
  },
  onStreamError: (error) => {
    console.error('流式响应错误:', error);
  },
  onStreamEnd: () => {
    console.log('流式响应结束');
    console.log('累计生成文本:', fullText);
  },
});
