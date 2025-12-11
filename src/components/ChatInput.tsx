"use client";

import { useState, FormEvent, KeyboardEvent } from "react";
import { Send, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel?: () => void;
  isLoading: boolean;
  disabled: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onCancel,
  isLoading,
  disabled,
  placeholder = "Ask about your data...",
}: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        rows={1}
        className="min-h-[36px] max-h-[100px] resize-none text-sm py-2"
      />
      {isLoading && onCancel ? (
        <Button
          type="button"
          size="icon"
          variant="destructive"
          onClick={onCancel}
          className="h-9 w-9 flex-shrink-0"
          title="Stop generation"
        >
          <Square className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          disabled={disabled || isLoading || !input.trim()}
          className="h-9 w-9 flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      )}
    </form>
  );
}
