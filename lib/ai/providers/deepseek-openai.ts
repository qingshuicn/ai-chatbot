import {
  customProvider,
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1StreamPart,
  Message
} from 'ai';

// 在文档中添加 LanguageModelV1FinishReason 类型
// 这个类型来自 @ai-sdk/provider 包的一部分
type LanguageModelV1FinishReason = 'stop' | 'length' | 'content-filter' | 'tool-calls';

/**
 * 创建DeepSeek模型提供商（使用OpenAI兼容API）
 * @param model 模型名称，例如 'deepseek-r1'
 * @returns LanguageModelV1 语言模型实例
 */
export function deepseekOpenAI(model: string): LanguageModelV1 {
  return {
    provider: 'deepseek',
    modelId: model,
    specificationVersion: 'v1',
    defaultObjectGenerationMode: 'json',
    
    // 实现 doGenerate 方法用于文本生成
    async doGenerate(options: LanguageModelV1CallOptions) {
      // 准备请求
      const fetchOptions = await prepareOpenAIRequest(options, model, false);
      
      try {
        // 发送请求到兼容API
        const response = await fetch(
          'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
          fetchOptions
        );
        
        // 检查响应状态
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`DeepSeek API错误: ${response.status} ${JSON.stringify(errorData)}`);
        }
        
        // 解析响应
        const data = await response.json();
        
        // 提取回复内容和思考过程
        const content = data.choices[0]?.message?.content || '';
        const reasoningContent = data.choices[0]?.message?.reasoning_content || '';
        
        // 记录调试信息
        console.log('DeepSeek API响应:', {
          model: data.model,
          content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          reasoningContent: reasoningContent.substring(0, 50) + (reasoningContent.length > 50 ? '...' : ''),
          usage: data.usage
        });
        
        // 返回符合 LanguageModelV1 接口的响应格式
        return {
          text: content,
          finishReason: convertFinishReason(data.choices[0]?.finish_reason),
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
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
          },
          // 使用 reasoning 而不是 additionalData
          reasoning: reasoningContent
        };
      } catch (error) {
        console.error('DeepSeek API调用失败:', error);
        throw error;
      }
    },
    
    // 实现 doStream 方法用于流式生成
    async doStream(options: LanguageModelV1CallOptions) {
      // 准备请求
      const fetchOptions = await prepareOpenAIRequest(options, model, true);
      
      // 创建一个 ReadableStream 来返回
      const stream = new ReadableStream<LanguageModelV1StreamPart>({
        async start(controller) {
          try {
            // 发送请求到兼容API
            const response = await fetch(
              'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
              fetchOptions
            );
            
            // 检查响应状态
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`DeepSeek API流式调用错误: ${response.status} ${JSON.stringify(errorData)}`);
            }
            
            // 获取API返回的流
            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('无法获取响应流');
            }
            
            // 生成唯一ID用于思考块
            const thinkingBlockId = `thinking-block-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            
            // 记录思考开始时间
            const reasoningStartTime = Date.now();
            
            // 记录状态
            let reasoningStarted = false;
            let contentStarted = false;
            let fullContent = '';
            let fullReasoning = '';
            
            // 处理流数据
            const decoder = new TextDecoder();
            
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                // 如果思考过程已开始但内容尚未开始，添加思考块结束标记
                if (reasoningStarted && !contentStarted) {
                  const reasoningEndTime = Date.now();
                  const reasoningSeconds = Math.floor((reasoningEndTime - reasoningStartTime) / 1000);
                  
                  controller.enqueue({
                    type: 'text-delta',
                    textDelta: `\n</div>\n</div>\n\n`
                  });
                  
                  // 添加最终的思考时间更新
                  controller.enqueue({
                    type: 'text-delta',
                    textDelta: `<script>
                      (function() {
                        const timeElement = document.getElementById('${thinkingBlockId}-time');
                        if (timeElement) {
                          timeElement.textContent = '${reasoningSeconds}';
                          const labelElement = timeElement.previousElementSibling;
                          if (labelElement && labelElement.classList.contains('thinking-time-label')) {
                            labelElement.textContent = '用时';
                          }
                        }
                      })();
                    </script>`
                  });
                }
                
                // 估算token数量
                const promptTokens = estimateTokens(JSON.stringify(options.prompt));
                const completionTokens = estimateTokens(fullContent) + estimateTokens(fullReasoning);
                
                // 发送完成事件
                controller.enqueue({
                  type: 'finish',
                  finishReason: 'stop',
                  usage: {
                    promptTokens,
                    completionTokens,
                  }
                });
                
                controller.close();
                break;
              }
              
              // 解码数据
              const text = decoder.decode(value, { stream: true });
              
              // 处理SSE格式的数据
              const lines = text
                .split('\n')
                .filter(line => line.trim() !== '')
                .map(line => line.replace(/^data: /, ''));
              
              for (const line of lines) {
                if (line === '[DONE]') continue;
                
                try {
                  const parsedLine = JSON.parse(line);
                  
                  // 处理思考过程 (reasoning_content)
                  const reasoningDelta = parsedLine.choices?.[0]?.delta?.reasoning_content;
                  if (reasoningDelta) {
                    fullReasoning += reasoningDelta;
                    
                    // 计算当前思考时间
                    const currentTime = Math.floor((Date.now() - reasoningStartTime) / 1000);
                    
                    // 第一次收到思考过程时，发送思考开始标记
                    if (!reasoningStarted) {
                      reasoningStarted = true;
                      controller.enqueue({
                        type: 'text-delta',
                        textDelta: `\n\n<div class="thinking-block" id="${thinkingBlockId}">\n<div class="thinking-header" onclick="document.getElementById('${thinkingBlockId}').classList.toggle('collapsed')">\n  <span class="thinking-icon">💭</span>\n  <span class="thinking-title">思考过程 <span class="thinking-time-label">用时</span> <span class="thinking-time" id="${thinkingBlockId}-time">0</span> 秒</span>\n  <span class="thinking-expand-icon">▼</span>\n</div>\n<div class="thinking-content">\n`
                      });
                    }
                    
                    // 将思考过程作为普通文本发送到前端
                    controller.enqueue({
                      type: 'text-delta',
                      textDelta: reasoningDelta
                    });
                    
                    // 每秒更新一次思考时间
                    if (currentTime % 1 === 0 && currentTime > 0) {
                      controller.enqueue({
                        type: 'text-delta',
                        textDelta: `<script>
                          (function() {
                            const timeElement = document.getElementById('${thinkingBlockId}-time');
                            if (timeElement) timeElement.textContent = '${currentTime}';
                          })();
                        </script>`
                      });
                    }
                  }
                  
                  // 处理回复内容 (content)
                  const contentDelta = parsedLine.choices?.[0]?.delta?.content;
                  if (contentDelta) {
                    fullContent += contentDelta;
                    
                    // 第一次收到内容时，如果有思考过程，则先添加分隔标记
                    if (reasoningStarted && !contentStarted) {
                      contentStarted = true;
                      const reasoningEndTime = Date.now();
                      const reasoningSeconds = Math.floor((reasoningEndTime - reasoningStartTime) / 1000);
                      
                      controller.enqueue({
                        type: 'text-delta',
                        textDelta: `\n</div>\n</div>\n\n`
                      });
                      
                      // 添加最终的思考时间更新
                      controller.enqueue({
                        type: 'text-delta',
                        textDelta: `<script>
                          (function() {
                            const timeElement = document.getElementById('${thinkingBlockId}-time');
                            if (timeElement) {
                              timeElement.textContent = '${reasoningSeconds}';
                              const labelElement = timeElement.previousElementSibling;
                              if (labelElement && labelElement.classList.contains('thinking-time-label')) {
                                labelElement.textContent = '用时';
                              }
                            }
                          })();
                        </script>`
                      });
                    }
                    
                    // 将内容作为普通文本发送到前端
                    controller.enqueue({
                      type: 'text-delta',
                      textDelta: contentDelta
                    });
                  }
                } catch (error) {
                  console.error('解析流数据时出错:', error);
                  // 继续处理下一行，不中断流
                }
              }
            }
          } catch (error) {
            console.error('流式响应初始化错误:', error);
            controller.error(error);
          }
        }
      });
      
      // 返回符合 LanguageModelV1 接口的响应格式
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

// 准备OpenAI兼容的API请求
async function prepareOpenAIRequest(
  options: LanguageModelV1CallOptions,
  model: string,
  stream: boolean
) {
  // 获取API密钥
  const apiKey = process.env.DASHSCOPE_TOKEN;
  if (!apiKey) {
    throw new Error('缺少DASHSCOPE_TOKEN环境变量');
  }
  
  // 准备消息
  const messages = prepareMessages(options.prompt);
  
  // 准备请求选项
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.95,
      max_tokens: options.maxTokens,
      stream: stream
    })
  };
}

// 将提示转换为消息格式
function prepareMessages(prompt: any): Array<{role: string, content: string}> {
  if (Array.isArray(prompt)) {
    return prompt.map(message => {
      if (typeof message === 'string') {
        return { role: 'user', content: message };
      } else if (message.role && message.content) {
        return { role: message.role, content: message.content };
      } else {
        throw new Error('无效的消息格式');
      }
    });
  } else if (typeof prompt === 'string') {
    return [{ role: 'user', content: prompt }];
  } else {
    throw new Error('无效的提示格式');
  }
}

// 转换finish_reason为LanguageModelV1FinishReason
function convertFinishReason(reason?: string): LanguageModelV1FinishReason {
  switch (reason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'content_filter':
      return 'content-filter';
    case 'tool_calls':
      return 'tool-calls';
    default:
      return 'stop';
  }
}

// 估算token数量（简易版）
function estimateTokens(text: string): number {
  if (!text) return 0;
  // 简单估算：英文按照单词数量，中文按照字符数量
  return Math.ceil(text.length / 4);
}

// 使用DeepSeek生成标题
export async function generateTitleWithDeepSeek({
  message,
  model = 'deepseek-r1',
}: {
  message: Message;
  model?: string;
}) {
  try {
    // 获取API密钥
    const apiKey = process.env.DASHSCOPE_TOKEN;
    if (!apiKey) {
      throw new Error('缺少DASHSCOPE_TOKEN环境变量');
    }
    
    // 准备提示词
    const prompt = `请为以下对话生成一个简短的标题（不超过6个字）：\n\n${message.content}`;
    
    // 准备请求选项
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        top_p: 0.95,
        max_tokens: 50
      })
    };
    
    // 发送请求
    const response = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      fetchOptions
    );
    
    // 检查响应状态
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`DeepSeek API标题生成错误: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    // 解析响应
    const data = await response.json();
    
    // 提取标题
    const title = data.choices[0]?.message?.content?.trim() || '新对话';
    
    return title;
  } catch (error) {
    console.error('DeepSeek标题生成失败:', error);
    return '新对话';
  }
}
