'use client';

import {
  Attachment,
  Message,
} from 'ai';
import { useChat, useCompletion } from 'ai/react';
import cx from 'classnames';
import type React from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUpIcon, PaperclipIcon, StopIcon } from './icons';
import { ModelSelector } from './model-selector';
import { PreviewAttachment } from './preview-attachment';
import { SuggestedActions } from './suggested-actions';
import equal from 'fast-deep-equal';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';

function PureMultimodalInput({
  input,
  setInput,
  isLoading,
  stop,
  attachments,
  setAttachments,
  messages,
  reload,
  className,
  isLoggedIn,
}: {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<Message>;
  reload?: () => void;
  className?: string;
  isLoggedIn?: boolean;
}) {
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useLocalStorage(
    'chat-model',
    'deepseek-v3',
  );
  
  // 添加模型选择器更新函数
  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    // 如果需要进一步处理，可以在这里添加
  }, [setSelectedModelId]);
  
  const windowSize = useWindowSize();
  const isMobile = windowSize.width < 640;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const form = e.currentTarget.form;
        if (form) {
          form.dispatchEvent(
            new Event('submit', { cancelable: true, bubbles: true }),
          );
        }
      }
    },
    [],
  );

  const submitForm = useCallback(() => {
    if (isLoading) return;
    const form = textAreaRef.current?.form;
    if (form) {
      form.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true }),
      );
    }
  }, [isLoading]);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;

      const files = Array.from(e.target.files);
      const uploadIds = files.map(() => Math.random().toString());
      setUploadQueue(uploadIds);
      setIsUploading(true);

      try {
        const newAttachments: Attachment[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const formData = new FormData();
          formData.append('file', file);

          // 只有登录用户才能上传文件到服务器
          if (isLoggedIn) {
            try {
              const response = await fetch('/api/files', {
                method: 'POST',
                body: formData,
              });

              if (!response.ok) {
                throw new Error('上传失败');
              }

              const { url, type } = await response.json();

              newAttachments.push({
                name: file.name,
                url: url,
                contentType: type,
              });
            } catch (error) {
              console.error('上传文件失败:', error);
              toast.error(`上传 ${file.name} 失败`);
            }
          } else {
            // 未登录用户使用本地 URL
            const url = URL.createObjectURL(file);
            const fileType = file.type.startsWith('image/') ? 'image' : 'file';
            
            newAttachments.push({
              name: file.name,
              url: url,
              contentType: file.type
            });
            
            toast.warning('您未登录，附件仅在本次会话有效');
          }

          // 移除当前文件的上传ID
          setUploadQueue((prev) => {
            const newQueue = [...prev];
            newQueue.splice(newQueue.indexOf(uploadIds[i]), 1);
            return newQueue;
          });
        }

        setAttachments((prev) => [...prev, ...newAttachments]);
      } catch (error) {
        console.error('处理文件失败:', error);
        toast.error('处理文件失败');
        setUploadQueue([]);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [setAttachments, isLoggedIn],
  );

  const removeAttachment = useCallback(
    (index: number) => {
      setAttachments((prev) => {
        const newAttachments = [...prev];
        newAttachments.splice(index, 1);
        return newAttachments;
      });
    },
    [setAttachments],
  );

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className={cx('relative', className)}>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((attachment, index) => (
            <PreviewAttachment
              key={index}
              attachment={attachment}
              isUploading={false}
              onRemove={() => removeAttachment(index)}
            />
          ))}
        </div>
      )}

      {messages.length === 0 && (
        <SuggestedActions
          messages={messages}
          setInput={setInput}
          isLoggedIn={isLoggedIn}
        />
      )}

      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textAreaRef}
            tabIndex={0}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="发送消息..."
            spellCheck={false}
            className="pr-24 resize-none bg-background leading-tight h-[44px] max-h-[200px] overflow-y-auto"
            rows={1}
          />
          <div className="absolute right-2 bottom-1 flex items-center z-10">
            <ModelSelector
              selectedModelId={selectedModelId}
              className="mr-1"
              onChange={handleModelChange}
            />
            {/* 移除附件按钮 */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,.pdf"
            />
            {isLoading ? (
              <StopButton stop={stop} />
            ) : (
              <SendButton
                submitForm={submitForm}
                input={input}
                uploadQueue={uploadQueue}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (!equal(prevProps.messages, nextProps.messages)) return false;
    return true;
  },
);

function PureStopButton({
  stop,
}: {
  stop: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onClick={() => {
        stop();
      }}
      className="h-8 w-8"
    >
      <StopIcon size={20} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={input.trim().length === 0 || uploadQueue.length > 0}
      onClick={submitForm}
      className="h-8 px-3"
    >
      发送
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
