'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { memo } from 'react';

interface SuggestedActionsProps {
  messages: Message[];
  setInput: (input: string) => void;
  isLoggedIn?: boolean;
}

function PureSuggestedActions({ messages, setInput, isLoggedIn = false }: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: '备课助手',
      label: '帮我设计一节关于光合作用的课程',
      action: '帮我设计一节关于光合作用的课程，包括教学目标、重点难点和教学流程',
    },
    {
      title: '作业批改',
      label: '分析这篇学生作文的优缺点',
      action: '请帮我分析这篇学生作文的优缺点，并给出修改建议',
    },
    {
      title: '知识解答',
      label: '解释牛顿第二定律及其应用',
      action: '请详细解释牛顿第二定律的含义及其在日常生活中的应用例子',
    },
    {
      title: '教学素材',
      label: '生成有关环保的课堂讨论话题',
      action: '请为高中生生成5个有关环境保护的课堂讨论话题，要有深度且能引发思考',
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 gap-2 w-full">
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={() => {
              setInput(suggestedAction.action);
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
          >
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
