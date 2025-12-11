"use client";

import { ReactNode } from "react";

interface ChatTabProps {
  children: ReactNode;
}

export function ChatTab({ children }: ChatTabProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-start px-6 pt-12 pb-24 min-h-[calc(100vh-4rem)]">
      {children}
    </div>
  );
}
