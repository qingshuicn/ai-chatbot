import { customProvider, LanguageModelV1, LanguageModelV1CallOptions, LanguageModelV1StreamPart, Message } from 'ai';

// 这里需要安装 dashscope-node 包
// npm install dashscope-node
type DashScopeOptions = {
  apiKey?: string;
  model: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
};

// 定义百炼API的消息类型
type BailianMessage = {
  role: 'user' | 'system' | 'assistant' | 'tool';
  content: string;
};

/**
 * 创建阿里百炼模型提供商
 * @param model 模型名称，例如 'qwen-max'
 * @param options 选项
 * @returns LanguageModelV1 语言模型实例
 */
export function bailian(
  model: string,
  options: Omit<DashScopeOptions, 'model'> = {}
): LanguageModelV1 {
  // 使用正确的 API 创建自定义语言模型
  return {
    provider: 'bailian',
    modelId: model,
    specificationVersion: 'v1',
    defaultObjectGenerationMode: 'json',
    
    // 实现 doGenerate 方法用于文本生成
    async doGenerate(options: LanguageModelV1CallOptions) {
      // 这里将在实际调用时导入 dashscope-node，避免在服务器端渲染时出错
      const dashscope = await importDashScope();
      
      // 获取环境变量中的 API 密钥
      const apiKey = process.env.DASHSCOPE_TOKEN;
      
      if (!apiKey) {
        throw new Error('缺少 DASHSCOPE_TOKEN 环境变量');
      }
      
      // 准备消息
      const messages = prepareMessages(options.prompt);
      
      // 准备请求参数
      const params: any = {
        model: model,
        input: {
          messages: messages,
        },
        parameters: {
          temperature: options.temperature ?? 0.7,
          top_p: options.topP ?? 0.8,
          max_tokens: options.maxTokens ?? 1500,
        },
      };
      
      // 调用 API
      const response = await dashscope.chat.completion.request(params);
      
      // 处理响应
      if (response && response.output && response.output.text) {
        // 返回符合 LanguageModelV1 接口的响应格式
        return {
          text: response.output.text,
          finishReason: 'stop',
          // 添加其他必要的字段
          rawCall: {
            rawPrompt: options.prompt,
            rawSettings: {
              temperature: options.temperature,
              topP: options.topP,
              maxTokens: options.maxTokens,
            },
          },
          usage: {
            promptTokens: response.usage?.input_tokens || 0,
            completionTokens: response.usage?.output_tokens || 0,
          },
        };
      } else {
        throw new Error('无效的响应格式');
      }
    },
    
    // 实现 doStream 方法用于流式生成
    async doStream(options: LanguageModelV1CallOptions) {
      // 导入 dashscope-node
      const dashscope = await importDashScope();
      
      // 获取环境变量中的 API 密钥
      const apiKey = process.env.DASHSCOPE_TOKEN;
      
      if (!apiKey) {
        throw new Error('缺少 DASHSCOPE_TOKEN 环境变量');
      }
      
      // 准备消息
      const messages = prepareMessages(options.prompt);
      
      // 准备请求参数
      const params: any = {
        model: model,
        input: {
          messages: messages,
        },
        parameters: {
          temperature: options.temperature ?? 0.7,
          top_p: options.topP ?? 0.8,
          max_tokens: options.maxTokens ?? 1500,
          incremental_output: true,
        },
      };
      
      // 创建一个 ReadableStream 来返回
      const stream = new ReadableStream<LanguageModelV1StreamPart>({
        async start(controller) {
          try {
            // 调用流式 API
            const result = await dashscope.chat.streamCompletion.request(params);
            
            let fullText = '';
            
            while (true) {
              try {
                const { done, value } = await result.read();
                
                if (done) {
                  console.log('流式响应结束，累计生成文本:', fullText);
                  
                  // 估算token数量，用于usage统计
                  const promptTokens = estimateTokens(JSON.stringify(messages));
                  const completionTokens = estimateTokens(fullText);
                  
                  // 发送完成事件，包含usage信息
                  controller.enqueue({
                    type: 'finish',
                    finishReason: 'stop',
                    usage: {
                      promptTokens,
                      completionTokens
                    }
                  });
                  
                  controller.close();
                  break;
                }
                
                // 处理流式响应
                let text = null;
                
                if (value?.data?.output?.text !== undefined) {
                  text = value.data.output.text;
                  console.log(`结构1生成文本: ${text}`);
                } else if (value?.data?.output !== undefined) {
                  text = value.data.output;
                  console.log(`结构2生成文本: ${text}`);
                } else if (typeof value === 'string') {
                  text = value;
                  console.log(`结构3生成文本: ${text}`);
                } else if (value && 'output' in value) {
                  text = (value as any).output;
                  console.log(`结构4生成文本: ${text}`);
                }
                
                if (text !== null && text !== '') {
                  fullText += text;
                  
                  // 将文本块发送到流，使用正确的类型 'text-delta' 和属性名 'textDelta'
                  controller.enqueue({
                    type: 'text-delta',
                    textDelta: text,
                  });
                }
              } catch (error) {
                console.error('处理流式响应时出错:', error);
                controller.error(error);
                break;
              }
            }
          } catch (error) {
            console.error('流式响应初始化错误:', error);
            controller.error(error);
          }
        },
      });
      
      // 返回符合 LanguageModelV1 接口的响应格式，不包含usage
      // usage将在流完成时通过finish事件提供
      return {
        stream,
        rawCall: {
          rawPrompt: options.prompt,
          rawSettings: {
            temperature: options.temperature,
            topP: options.topP,
            maxTokens: options.maxTokens,
          },
        },
      };
    },
  };
}

// 辅助函数：准备消息
function prepareMessages(prompt: LanguageModelV1CallOptions['prompt']): BailianMessage[] {
  if (typeof prompt === 'string') {
    return [{ role: 'user', content: prompt }];
  } else if (Array.isArray(prompt)) {
    return prompt.map((message) => {
      // 确保内容是字符串类型
      let content = message.content;
      if (typeof content !== 'string') {
        // 如果内容不是字符串，尝试将其转换为字符串
        if (Array.isArray(content)) {
          // 如果是数组，尝试提取文本部分
          content = content
            .filter(part => typeof part === 'object' && part.type === 'text')
            .map(part => (part as any).text || '')
            .join('');
        } else {
          // 默认转换为空字符串
          content = '';
        }
      }
      
      // 确保角色是有效的
      let role = message.role;
      if (role !== 'user' && role !== 'system' && role !== 'assistant' && role !== 'tool') {
        // 如果角色无效，默认为用户
        role = 'user';
      }
      
      return {
        role,
        content,
      } as BailianMessage;
    });
  } else {
    return [];
  }
}

// 辅助函数：导入 DashScope 并创建实例
async function importDashScope() {
  try {
    // 动态导入 dashscope-node
    const dashscopeModule = await import('dashscope-node');
    
    // 获取环境变量中的 API 密钥
    const apiKey = process.env.DASHSCOPE_TOKEN;
    
    if (!apiKey) {
      throw new Error('缺少 DASHSCOPE_TOKEN 环境变量');
    }
    
    // 创建 DashScope 实例，使用正确的 createSDK 方法
    return dashscopeModule.createSDK({
      accessToken: apiKey,
    });
  } catch (error) {
    console.error('导入或初始化 DashScope 失败:', error);
    throw error;
  }
}

// 辅助函数：估算token数量
function estimateTokens(text: string): number {
  // 简单估算：中文每个字约1.5个token，英文每个单词约1.3个token
  // 这只是一个粗略估计，实际token数量取决于模型的分词器
  const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWordCount = (text.match(/[a-zA-Z]+/g) || []).length;
  const otherCharCount = text.length - chineseCharCount - englishWordCount;
  
  return Math.ceil(chineseCharCount * 1.5 + englishWordCount * 1.3 + otherCharCount * 0.5);
}

/**
 * 从用户消息生成标题
 * @param message 用户消息
 * @param model 模型名称
 * @returns 生成的标题
 */
export async function generateTitleWithBailian({
  message,
  model = 'qwen-max',
}: {
  message: Message;
  model?: string;
}) {
  try {
    // 使用辅助函数导入 DashScope 并创建实例
    const dashscope = await importDashScope();
    
    // 准备系统提示词
    const system = `
    - 你将根据用户的第一条消息生成一个简短的标题
    - 确保标题不超过80个字符
    - 标题应该是用户消息的摘要
    - 不要使用引号或冒号`;
    
    // 准备请求参数
    const params: any = {
      model: model,
      input: {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: typeof message === 'string' ? message : message.content },
        ],
      },
      parameters: {
        temperature: 0.5,
        top_p: 0.8,
        max_tokens: 100,
      },
    };
    
    // 调用 API
    const response = await dashscope.chat.completion.request(params);
    
    // 处理响应
    if (response && response.output && response.output.text) {
      return response.output.text.trim();
    } else {
      console.error('生成标题失败，返回默认标题');
      return '新对话';
    }
  } catch (error) {
    console.error('生成标题时出错:', error);
    return '新对话';
  }
}
