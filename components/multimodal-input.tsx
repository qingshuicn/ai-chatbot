'use client';

import type {
  Attachment,
  Message,
} from 'ai';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { sanitizeUIMessages } from '@/lib/utils';

import { ArrowUpIcon, PaperclipIcon, StopIcon } from './icons';
import { ModelSelector } from './model-selector';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { SuggestedActions } from './suggested-actions';
import equal from 'fast-deep-equal';

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
    'chat-model-default',
  );
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
                type: type,
                url: url,
              });
            } catch (error) {
              console.error('上传文件失败:', error);
              toast.error(`上传 ${file.name} 失败`);
            }
          } else {
            // 未登录用户使用本地 URL
            const url = URL.createObjectURL(file);
            const type = file.type.startsWith('image/') ? 'image' : 'file';
            
            newAttachments.push({
              name: file.name,
              type: type,
              url: url,
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
            className="pr-12 resize-none bg-background leading-tight h-[44px] max-h-[200px] overflow-y-auto"
            rows={1}
          />
          <div className="absolute right-2 bottom-1 flex items-center">
            <AttachmentsButton
              fileInputRef={fileInputRef}
              isLoading={isLoading || isUploading}
            />
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
        {!isMobile && (
          <ModelSelector
            selectedModelId={selectedModelId}
            setSelectedModelId={setSelectedModelId}
            isLoggedIn={isLoggedIn}
          />
        )}
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

function PureAttachmentsButton({
  fileInputRef,
  isLoading,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isLoading: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      disabled={isLoading}
      onClick={() => fileInputRef.current?.click()}
      className="h-8 w-8 mr-1"
    >
      <PaperclipIcon className="h-5 w-5" />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

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
      <StopIcon className="h-5 w-5" />
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
      variant="ghost"
      size="icon"
      disabled={input.trim().length === 0 || uploadQueue.length > 0}
      onClick={submitForm}
      className="h-8 w-8"
    >
      <ArrowUpIcon className="h-5 w-5" />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
