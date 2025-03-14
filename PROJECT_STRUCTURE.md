# AI 聊天机器人项目结构和框架

## 项目概述

这是一个基于 Next.js 和 Vercel AI SDK 构建的 AI 聊天机器人项目。项目支持多种 AI 模型，提供了丰富的聊天功能和内容创建工具。

## 技术栈

- **前端框架**：Next.js App Router
- **AI 框架**：Vercel AI SDK
- **UI 组件**：shadcn/ui + Tailwind CSS
- **数据存储**：Vercel Postgres
- **认证**：NextAuth.js
- **部署**：Vercel

## 项目结构

```
ai-chatbot/
├── app/                       # Next.js App Router 目录
│   ├── (auth)/                # 认证相关页面和API
│   ├── (chat)/                # 聊天相关页面和API
│   │   ├── actions.ts         # 服务器端操作函数
│   │   ├── api/               # API 路由
│   │   │   ├── chat/          # 聊天API
│   │   │   │   └── route.ts   # 聊天API路由处理
│   │   │   ├── document/      # 文档API
│   │   │   ├── files/         # 文件API
│   │   │   ├── history/       # 历史记录API
│   │   │   ├── suggestions/   # 建议API
│   │   │   └── vote/          # 投票API
│   │   ├── chat/              # 聊天页面
│   │   ├── layout.tsx         # 聊天布局
│   │   └── page.tsx           # 聊天主页面
│   ├── favicon.ico            # 网站图标
│   ├── globals.css            # 全局CSS
│   └── layout.tsx             # 根布局
├── artifacts/                 # 内容创建工具
├── components/                # UI组件
│   ├── chat.tsx               # 聊天组件
│   ├── message.tsx            # 消息组件
│   ├── model-selector.tsx     # 模型选择器
│   ├── multimodal-input.tsx   # 多模态输入组件
│   └── ui/                    # UI基础组件
├── hooks/                     # React钩子
├── lib/                       # 核心功能库
│   ├── ai/                    # AI相关功能
│   │   ├── models.ts          # 模型配置
│   │   ├── prompts.ts         # 提示词配置
│   │   └── tools/             # AI工具
│   ├── db/                    # 数据库操作
│   ├── editor/                # 编辑器功能
│   └── utils.ts               # 工具函数
├── public/                    # 静态资源
├── .env.example               # 环境变量示例
├── package.json               # 项目依赖
└── next.config.ts             # Next.js配置
```

## 大模型请求流程

1. **前端请求**：
   - 用户在前端通过 `useChat` hook 发送消息
   - 消息通过 POST 请求发送到 `/api/chat` 端点

2. **后端处理**：
   - `app/(chat)/api/chat/route.ts` 接收请求
   - 验证用户身份和消息内容
   - 使用 `streamText` 函数调用 AI 模型
   - 返回流式响应

3. **模型配置**：
   - 在 `lib/ai/models.ts` 中定义模型提供者
   - 使用 `customProvider` 配置不同的模型
   - 当前支持 OpenAI 和 Fireworks 两家提供商

4. **系统提示词**：
   - 在 `lib/ai/prompts.ts` 中定义系统提示词
   - 根据不同模型和任务提供不同的提示词

5. **工具调用**：
   - 在 `lib/ai/tools/` 目录中定义各种工具
   - 通过 `experimental_activeTools` 参数启用工具
   - 支持天气查询、文档创建等功能

6. **数据存储**：
   - 聊天记录保存在 Vercel Postgres 数据库中
   - 通过 `lib/db/queries.ts` 进行数据库操作

## 环境变量

项目需要以下环境变量：
- `OPENAI_API_KEY`：OpenAI API密钥
- `FIREWORKS_API_KEY`：Fireworks API密钥
- `AUTH_SECRET`：认证密钥
- `BLOB_READ_WRITE_TOKEN`：Vercel Blob存储令牌
- `POSTGRES_URL`：Postgres数据库URL
