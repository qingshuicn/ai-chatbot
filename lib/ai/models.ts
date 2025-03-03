import { customProvider } from 'ai';
import { bailian } from './providers/bailian';
import { deepseekOpenAI } from './providers/deepseek-openai';

export const DEFAULT_CHAT_MODEL: string = 'bailian-qwen';

export const myProvider = customProvider({
  languageModels: {
    'bailian-qwen': bailian('qwen-max'),
    'bailian-qwen-long': bailian('qwen-max-longcontext'),
    'deepseek-r1': deepseekOpenAI('deepseek-r1'),
    'deepseek-v3': deepseekOpenAI('deepseek-v3'),
    'title-model': bailian('qwen-max'),
  },
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'bailian-qwen',
    name: '通义千问',
    description: '阿里百炼通义千问大模型',
  },
  {
    id: 'bailian-qwen-long',
    name: '通义千问长文本',
    description: '阿里百炼通义千问长文本大模型，支持更长的上下文',
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    description: '阿里百炼 DeepSeek R1 大模型，支持思考过程',
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    description: '阿里百炼 DeepSeek V3 大模型',
  },
];
