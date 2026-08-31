import React, { useState } from "react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile, X } from "lucide-react";

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal px-3 h-10">
            <div className="flex items-center gap-2">
              {value ? (
                <span className="text-lg leading-none">{value}</span>
              ) : (
                <Smile className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="truncate">{value ? "Change Emoji" : "Select Emoji..."}</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-none shadow-none" align="start">
          <EmojiPicker
            onEmojiClick={(emojiData: EmojiClickData) => {
              onChange(emojiData.emoji);
              setOpen(false);
            }}
            theme={Theme.AUTO}
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          variant="ghost"
          type="button"
          size="icon"
          onClick={() => onChange("")}
          className="size-10 shrink-0 text-muted-foreground hover:text-destructive"
          title="Remove icon"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
