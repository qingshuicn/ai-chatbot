# 阿里百炼模型集成指南

本文档介绍了如何在 AI 聊天机器人项目中集成和使用阿里百炼模型。

## 已集成的百炼模型

项目已集成以下百炼模型：

1. **通义千问** (`bailian-qwen`): 基于 qwen-max 模型
2. **通义千问长文本** (`bailian-qwen-long`): 基于 qwen-max-longcontext 模型，支持更长的上下文

## 环境变量配置

要使用百炼模型，需要在 `.env.local` 文件中设置以下环境变量：

```bash
# 阿里云 DashScope 访问令牌
DASHSCOPE_TOKEN=你的阿里云DashScope访问令牌
```

访问令牌可以在阿里云 DashScope 控制台获取：https://dashscope.console.aliyun.com/apiKey

## 使用百炼模型

1. **在聊天界面中选择模型**：
   在聊天界面顶部的模型选择器中，可以选择 "通义千问" 或 "通义千问长文本" 模型。

2. **自动生成对话标题**：
   项目已配置为优先使用百炼模型生成对话标题，如果百炼模型不可用，会回退到 OpenAI 模型。

## 测试百炼模型

项目提供了两个测试脚本，用于测试百炼模型的响应：

1. **测试流式响应**：
   ```bash
   node test-stream-detailed.js
   ```

2. **测试最终响应**：
   ```bash
   node test-stream-final.js
   ```

## 技术实现

百炼模型的集成主要涉及以下文件：

1. **`lib/ai/providers/bailian.ts`**：
   实现了百炼模型的提供商适配器，包括文本生成和流式响应处理。

2. **`lib/ai/models.ts`**：
   将百炼模型添加到自定义提供商中，并在模型列表中注册。

3. **`app/(chat)/actions.ts`**：
   修改了标题生成功能，优先使用百炼模型生成对话标题。

## 流式响应处理

百炼模型的流式响应结构为 `value.data.output.text`，与 OpenAI 的响应结构不同。为了正确处理流式响应，实现了以下逻辑：

```typescript
let text = null;

if (value?.data?.output?.text !== undefined) {
  text = value.data.output.text;
} else if (value?.output?.text !== undefined) {
  text = value.output.text;
} else if (typeof value === 'string') {
  text = value;
}

if (text !== null) {
  fullText += text;
  onToken(text);
}
```

## 错误处理

为了提高系统的稳定性，添加了全面的错误处理：

1. 在标题生成时，如果百炼模型调用失败，会回退到 OpenAI 模型。
2. 如果所有模型都调用失败，会返回默认标题 "新对话"。
3. 在流式响应处理中，添加了详细的错误日志记录。

## 依赖包

百炼模型集成依赖于 `dashscope-node` 包，该包提供了与阿里云 DashScope API 交互的功能。
