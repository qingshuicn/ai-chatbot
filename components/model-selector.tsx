'use client';

import { startTransition, useMemo, useState, useEffect } from 'react';

import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { chatModels } from '@/lib/ai/models';
import { cn } from '@/lib/utils';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

export function ModelSelector({
  selectedModelId,
  className,
  onChange,
  ...props
}: {
  selectedModelId: string;
  onChange?: (modelId: string) => void;
} & Omit<React.ComponentProps<typeof Button>, 'onChange'>) {
  const [open, setOpen] = useState(false);
  const [localModelId, setLocalModelId] = useState(selectedModelId);
  
  // 使用 useEffect 同步外部 selectedModelId 和内部状态
  useEffect(() => {
    setLocalModelId(selectedModelId);
  }, [selectedModelId]);

  const selectedChatModel = useMemo(
    () => chatModels.find((chatModel) => chatModel.id === localModelId),
    [localModelId],
  );

  const handleModelSelect = async (id: string) => {
    setLocalModelId(id);
    setOpen(false);
    
    // 调用外部回调
    if (onChange) {
      onChange(id);
    }
    
    // 保存到 cookie
    await saveChatModelAsCookie(id);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent/20 data-[state=open]:text-accent',
          className,
        )}
      >
        <Button 
          variant="outline" 
          className={cn("flex items-center gap-1 text-sm px-2 h-8 border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80", className)}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          {...props}
        >
          <span className="truncate">{selectedChatModel?.name || '选择模型'}</span>
          <ChevronDownIcon className="h-4 w-4 opacity-70 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="min-w-[300px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {chatModels.map((chatModel) => {
          const { id } = chatModel;

          return (
            <DropdownMenuItem
              key={id}
              onSelect={(e) => {
                e.preventDefault();
                handleModelSelect(id);
              }}
              className="gap-4 group/item flex flex-row justify-between items-center hover:bg-primary/10 dark:hover:bg-primary/20"
              data-active={id === localModelId}
            >
              <div className="flex flex-col gap-1 items-start">
                <div className="font-medium">{chatModel.name}</div>
                <div className="text-xs text-muted-foreground">
                  {chatModel.description}
                </div>
              </div>

              <div className="text-primary dark:text-primary opacity-0 group-data-[active=true]/item:opacity-100">
                <CheckCircleFillIcon />
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
