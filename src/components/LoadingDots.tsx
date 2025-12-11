"use client";

export function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" />
    </div>
  );
}
