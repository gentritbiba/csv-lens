// src/components/PinHint.tsx
"use client";

import { useState, useEffect } from "react";
import { Pin, X } from "lucide-react";

const STORAGE_KEY = "csvlens-pin-hint-dismissed";

interface PinHintProps {
  show: boolean;
}

export function PinHint({ show }: PinHintProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    // Check localStorage on initial render (SSR-safe)
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) === "true";
    }
    return true;
  });

  useEffect(() => {
    // Show hint after a short delay when triggered
    if (show && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [show, dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border"
        style={{
          backgroundColor: "rgba(22, 27, 34, 0.95)",
          borderColor: "rgba(240, 180, 41, 0.3)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "rgba(240, 180, 41, 0.15)" }}
        >
          <Pin className="w-4 h-4" style={{ color: "#f0b429" }} />
        </div>
        <p className="text-sm" style={{ color: "#f0f3f6" }}>
          <span className="font-medium" style={{ color: "#f0b429" }}>Tip:</span>{" "}
          Pin your dataset to save it for your next session
        </p>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: "#656d76" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
