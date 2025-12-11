"use client";

import { ReactNode } from "react";

interface SimpleTooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom";
  className?: string;
}

export function SimpleTooltip({ content, children, position = "top", className = "" }: SimpleTooltipProps) {
  const isTop = position === "top";

  return (
    <div className={`relative group/tooltip ${className}`}>
      {children}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap
          opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none z-50
          ${isTop ? "bottom-full mb-2" : "top-full mt-2"}
        `}
        style={{
          backgroundColor: '#f0f3f6',
          color: '#161b22',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {content}
        {/* Arrow */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${isTop ? "top-full" : "bottom-full"}`}
          style={{
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            ...(isTop
              ? { borderTop: '5px solid #f0f3f6' }
              : { borderBottom: '5px solid #f0f3f6' }
            ),
          }}
        />
      </div>
    </div>
  );
}
