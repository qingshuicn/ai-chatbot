// 测试百炼模型的最终响应
// 使用方法: node test-stream-final.js

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

async function testBailianModel() {
  try {
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
      },
    };

    console.log('开始测试百炼模型最终响应...');
    console.log('模型: qwen-max');
    console.log('请求参数:', JSON.stringify(params, null, 2));

    // 调用 API
    const response = await dashscope.generation.call(params);
    
    // 打印完整的响应数据
    console.log('响应数据:', JSON.stringify(response, null, 2));
    
    // 提取生成的文本
    if (response && response.output && response.output.text) {
      console.log('生成的文本:', response.output.text);
    } else {
      console.error('无效的响应格式');
    }
  } catch (error) {
    console.error('测试百炼模型时出错:', error);
  }
}

testBailianModel();
