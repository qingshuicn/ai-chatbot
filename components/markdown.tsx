'use client';

import Link from 'next/link';
import React, { memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { CheckIcon, CopyIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';

// 内联代码组件
const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code className="text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md">
    {children}
  </code>
);

// 代码块组件（带复制功能）
const CodeBlockWithCopy = ({ language, value }: { language: string; value: string }) => {
  const [copied, setCopied] = React.useState(false);
  
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-zinc-700/50 hover:bg-zinc-700 text-zinc-100"
          onClick={copyToClipboard}
          aria-label="复制代码"
        >
          {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0.75rem',
          padding: '1rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          backgroundColor: 'rgb(24 24 27)',
        }}
        wrapLongLines={true}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

// 检查代码是否应该作为内联代码显示
const shouldRenderAsInline = (value: string): boolean => {
  // 如果代码只有一行且字符数少于15，或者只是一个单词，则作为内联代码显示
  const trimmedValue = value.trim();
  const lines = trimmedValue.split('\n');
  
  return (
    lines.length === 1 && 
    (trimmedValue.length < 15 || !trimmedValue.includes(' '))
  );
};

// 主要的Markdown组件
const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  // 预处理Markdown内容，为代码块处理做准备
  const processedContent = React.useMemo(() => {
    return children
      .replace(/```([\s\S]*?)```/g, (match) => {
        // 确保代码块前后有足够的换行符
        return '\n\n' + match + '\n\n';
      })
      .replace(/\n\n\n+/g, '\n\n'); // 规范化多余的换行符
  }, [children]);
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSanitize]}
      components={{
        // 链接
        a: ({ node, href, children }) => (
          <Link
            href={href || '#'}
            className="text-blue-500 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {children}
          </Link>
        ),
        
        // 代码（内联和代码块）
        code: ({ node, inline, className, children }) => {
          // 处理内联代码
          if (inline) {
            return <InlineCode>{children}</InlineCode>;
          }
          
          // 提取语言
          const match = /language-(\w+)/.exec(className || '');
          const lang = match && match[1] ? match[1].toLowerCase() : '';
          const value = String(children).replace(/\n$/, '');
          
          // 检查是否应该作为内联代码显示
          if (shouldRenderAsInline(value)) {
            return <InlineCode>{value}</InlineCode>;
          }
          
          // 渲染代码块
          return (
            <div className="not-prose my-4">
              <CodeBlockWithCopy language={lang} value={value} />
            </div>
          );
        },
        
        // 将pre标签设为透明传递，让code组件完全处理代码块
        pre: ({ children }) => <>{children}</>,
        
        // 其他基本元素
        p: ({ children }) => <p className="mb-4">{children}</p>,
        h1: ({ children }) => <h1 className="text-3xl font-semibold mt-6 mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-2xl font-semibold mt-6 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xl font-semibold mt-6 mb-2">{children}</h3>,
        h4: ({ children }) => <h4 className="text-lg font-semibold mt-6 mb-2">{children}</h4>,
        h5: ({ children }) => <h5 className="text-base font-semibold mt-6 mb-2">{children}</h5>,
        h6: ({ children }) => <h6 className="text-sm font-semibold mt-6 mb-2">{children}</h6>,
        ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-4">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-4">{children}</ol>,
        li: ({ children }) => <li className="py-1">{children}</li>,
        strong: ({ children }) => <span className="font-semibold">{children}</span>,
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
};

// 使用memo优化渲染性能
export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children
);
