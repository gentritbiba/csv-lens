// src/components/MobileDrawer.tsx
"use client";

import { useEffect, useRef } from "react";
import { LoadedFile } from "@/types/workspace";
import {
  X,
  Database,
  Table2,
  Plus,
  Settings,
  ChevronRight,
  Sparkles,
  Pin,
  PinOff,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "./brand";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  files: LoadedFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileRemove: (fileId: string) => void;
  onAddFile: () => void;
  onPinFile?: (fileId: string) => void;
}

export function MobileDrawer({
  isOpen,
  onClose,
  files,
  activeFileId,
  onFileSelect,
  onFileRemove,
  onAddFile,
  onPinFile,
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 z-50 w-[85%] max-w-[360px] flex flex-col transition-transform duration-300 ease-out md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          backgroundColor: "#0d1117",
          borderRight: "1px solid rgba(240, 243, 246, 0.08)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "rgba(240, 243, 246, 0.08)" }}
        >
          <Logo size="md" showText />
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors active:scale-95"
            style={{ backgroundColor: "rgba(240, 243, 246, 0.05)" }}
          >
            <X className="w-5 h-5" style={{ color: "#9198a1" }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Datasets Section */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4" style={{ color: "#58a6ff" }} />
              <span
                className="text-sm font-semibold"
                style={{ color: "#f0f3f6" }}
              >
                Datasets
              </span>
              <span
                className="ml-auto text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: "rgba(88, 166, 255, 0.15)",
                  color: "#58a6ff",
                }}
              >
                {files.length}/5
              </span>
            </div>

            {/* Empty state */}
            {files.length === 0 && (
              <div
                className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl text-center"
                style={{
                  backgroundColor: "rgba(240, 243, 246, 0.02)",
                  border: "1px dashed rgba(240, 243, 246, 0.1)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(240, 180, 41, 0.1)" }}
                >
                  <Sparkles className="w-7 h-7" style={{ color: "#f0b429" }} />
                </div>
                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: "#f0f3f6" }}
                >
                  No datasets loaded
                </p>
                <p className="text-xs mb-4" style={{ color: "#656d76" }}>
                  Add a CSV file to start exploring
                </p>
                <button
                  onClick={() => {
                    onAddFile();
                    onClose();
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95"
                  style={{
                    backgroundColor: "#f0b429",
                    color: "#0f1419",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Dataset
                </button>
              </div>
            )}

            {/* File list */}
            <div className="space-y-2">
              {files.map((file) => {
                const isActive = file.id === activeFileId;

                return (
                  <div
                    key={file.id}
                    className="rounded-xl transition-all duration-200 active:scale-[0.98]"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(240, 180, 41, 0.08)"
                        : "rgba(240, 243, 246, 0.03)",
                      border: isActive
                        ? "1px solid rgba(240, 180, 41, 0.3)"
                        : "1px solid rgba(240, 243, 246, 0.06)",
                    }}
                    onClick={() => {
                      onFileSelect(file.id);
                      onClose();
                    }}
                  >
                    <div className="p-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                          style={{
                            backgroundColor: isActive
                              ? "rgba(240, 180, 41, 0.15)"
                              : "rgba(240, 243, 246, 0.05)",
                          }}
                        >
                          <Table2
                            className="w-5 h-5"
                            style={{ color: isActive ? "#f0b429" : "#9198a1" }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: isActive ? "#f0b429" : "#f0f3f6" }}
                          >
                            {file.name.replace(/\.csv$/i, "")}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-[11px] font-mono"
                              style={{ color: "#3fb950" }}
                            >
                              {formatNumber(file.schema.rowCount)} rows
                            </span>
                            <span style={{ color: "#656d76" }}>·</span>
                            <span
                              className="text-[11px] font-mono"
                              style={{ color: "#58a6ff" }}
                            >
                              {file.schema.columns.length} cols
                            </span>
                            <span style={{ color: "#656d76" }}>·</span>
                            <span
                              className="text-[11px] font-mono"
                              style={{ color: "#a371f7" }}
                            >
                              {formatBytes(file.size)}
                            </span>
                          </div>
                        </div>
                        {isActive && (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
                            style={{
                              backgroundColor: "rgba(240, 180, 41, 0.2)",
                              color: "#f0b429",
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div
                      className="flex border-t"
                      style={{ borderColor: "rgba(240, 243, 246, 0.06)" }}
                    >
                      {/* Pin button */}
                      {onPinFile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPinFile(file.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors"
                          style={{
                            color: file.isPinned ? "#f0b429" : "#656d76",
                            backgroundColor: file.isPinned
                              ? "rgba(240, 180, 41, 0.08)"
                              : "transparent",
                            borderRight: "1px solid rgba(240, 243, 246, 0.06)",
                          }}
                        >
                          {file.isPinned ? (
                            <>
                              <Pin className="w-3.5 h-3.5" />
                              Pinned
                            </>
                          ) : (
                            <>
                              <PinOff className="w-3.5 h-3.5" />
                              Pin to save
                            </>
                          )}
                        </button>
                      )}
                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFileRemove(file.id);
                        }}
                        className="flex-1 py-2 text-[11px] font-medium transition-colors"
                        style={{ color: "#656d76" }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add more button */}
            {files.length > 0 && files.length < 5 && (
              <button
                onClick={() => {
                  onAddFile();
                  onClose();
                }}
                className="flex items-center justify-center gap-2 w-full mt-3 py-3 rounded-xl transition-all active:scale-[0.98]"
                style={{
                  border: "2px dashed rgba(88, 166, 255, 0.3)",
                  color: "#58a6ff",
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add another dataset</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom section */}
        <div
          className="p-4 border-t"
          style={{ borderColor: "rgba(240, 243, 246, 0.08)" }}
        >
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center justify-between w-full p-3 rounded-xl transition-colors active:scale-[0.98]"
            style={{ backgroundColor: "rgba(240, 243, 246, 0.03)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(240, 243, 246, 0.05)" }}
              >
                <Settings className="w-5 h-5" style={{ color: "#9198a1" }} />
              </div>
              <span className="text-sm font-medium" style={{ color: "#f0f3f6" }}>
                Settings
              </span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "#656d76" }} />
          </Link>
        </div>
      </div>
    </>
  );
}
