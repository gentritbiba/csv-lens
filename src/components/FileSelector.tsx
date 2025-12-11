// src/components/FileSelector.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { LoadedFile } from "@/types/workspace";
import { ChevronDown, Database, X, Plus, Table2, Pin, PinOff } from "lucide-react";
import { COLORS } from "@/lib/design-tokens";
import { formatBytes, formatNumber } from "@/lib/style-utils";
import { SimpleTooltip } from "@/components/ui/SimpleTooltip";

interface FileSelectorProps {
  files: LoadedFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileRemove: (fileId: string) => void;
  onAddFile: () => void;
  onPinFile?: (fileId: string) => void;
  disabled?: boolean;
}

export function FileSelector({
  files,
  activeFileId,
  onFileSelect,
  onFileRemove,
  onAddFile,
  onPinFile,
  disabled,
}: FileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeFile = files.find((f) => f.id === activeFileId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Empty state - prominent add button
  if (files.length === 0) {
    return (
      <button
        onClick={onAddFile}
        disabled={disabled}
        className={`
          group flex items-center gap-2.5 px-4 py-2.5 rounded-xl
          bg-[--primary-muted] text-[--primary] border border-[--primary]/20
          transition-all duration-200
          hover:bg-[--primary]/20 hover:border-[--primary]/30
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
        <span className="text-sm font-medium">Load Dataset</span>
      </button>
    );
  }

  const isPinned = activeFile?.isPinned ?? false;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button - Integrated nav style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          group flex items-center gap-3 px-4 py-3
          transition-all duration-200
          ${disabled
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer"
          }
        `}
        style={{
          backgroundColor: isOpen ? COLORS.primarySubtle : COLORS.borderMuted,
          borderLeft: `1px solid ${COLORS.border}`,
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.backgroundColor = COLORS.primarySubtle;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.backgroundColor = COLORS.borderMuted;
          }
        }}
      >
        {/* Icon with pin indicator */}
        <div className="relative flex items-center justify-center w-7 h-7 rounded-md" style={{ backgroundColor: COLORS.primaryMuted }}>
          <Database className="w-3.5 h-3.5" style={{ color: COLORS.primary }} />
          {/* Pin status indicator */}
          {activeFile && isPinned && (
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2"
              style={{
                backgroundColor: COLORS.success,
                borderColor: COLORS.bgElevated,
                boxShadow: `0 0 4px ${COLORS.success}`,
              }}
            />
          )}
        </div>

        {/* File Info */}
        <div className="text-left min-w-0">
          <p className="text-sm font-medium truncate max-w-[160px]" style={{ color: COLORS.foreground }}>
            {activeFile?.name.replace(/\.csv$/i, '') ?? "Select dataset"}
          </p>
          {activeFile && (
            <p className="text-[11px] font-mono" style={{ color: COLORS.foregroundMuted }}>
              {formatNumber(activeFile.schema.rowCount)} rows
              <span className="mx-1.5 opacity-40">·</span>
              {activeFile.schema.columns.length} cols
            </p>
          )}
        </div>

        {/* Pin Button - Inline */}
        {activeFile && onPinFile && (
          <SimpleTooltip content={isPinned ? "Saved · Click to unpin" : "Pin to save for next session"} position="bottom">
            <div
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onPinFile(activeFile.id);
              }}
              className={`
                flex items-center justify-center w-7 h-7 rounded-md ml-1
                transition-all duration-200
                ${!isPinned ? 'animate-pin-hint opacity-60 group-hover:opacity-100' : ''}
              `}
              style={{
                backgroundColor: isPinned ? COLORS.primaryMuted : 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.primaryMuted;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isPinned ? COLORS.primaryMuted : 'transparent';
              }}
            >
              <Pin
                className="w-3.5 h-3.5 transition-all duration-200"
                style={{
                  color: isPinned ? COLORS.primary : COLORS.foregroundSubtle,
                }}
              />
            </div>
          </SimpleTooltip>
        )}

        {/* Chevron */}
        <ChevronDown
          className={`
            w-4 h-4 ml-1
            transition-transform duration-200
            ${isOpen ? "rotate-180" : ""}
          `}
          style={{ color: COLORS.foregroundSubtle }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 w-[420px] rounded-2xl border shadow-2xl overflow-hidden animate-fade-in z-50"
          style={{
            backgroundColor: COLORS.bgElevated,
            borderColor: COLORS.borderStrong,
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 border-b"
            style={{
              borderColor: COLORS.border,
              background: `linear-gradient(135deg, ${COLORS.accentSubtle} 0%, ${COLORS.primarySubtle} 100%)`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" style={{ color: COLORS.accent }} />
                <span className="text-sm font-semibold" style={{ color: COLORS.foreground }}>
                  Datasets
                </span>
              </div>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: COLORS.accentMuted,
                  color: COLORS.accent,
                }}
              >
                {files.length} of 5
              </span>
            </div>
          </div>

          {/* File List */}
          <div className="p-3 space-y-2">
            {files.map((file, index) => {
              const isActive = file.id === activeFileId;

              return (
                <div
                  key={file.id}
                  className="group relative rounded-xl transition-all duration-200 cursor-pointer animate-fade-in overflow-hidden"
                  style={{
                    backgroundColor: isActive ? 'rgba(240, 180, 41, 0.08)' : '#1c2128',
                    border: isActive ? '1px solid rgba(240, 180, 41, 0.3)' : '1px solid transparent',
                    animationDelay: `${index * 50}ms`,
                  }}
                  onClick={() => {
                    onFileSelect(file.id);
                    setIsOpen(false);
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#21262d';
                      e.currentTarget.style.border = '1px solid rgba(240, 243, 246, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#1c2128';
                      e.currentTarget.style.border = '1px solid transparent';
                    }
                  }}
                >
                  <div className="p-4">
                    {/* Top row: Name + Remove button */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                          style={{
                            backgroundColor: isActive ? 'rgba(240, 180, 41, 0.15)' : '#21262d',
                          }}
                        >
                          <Table2
                            className="w-5 h-5"
                            style={{ color: isActive ? '#f0b429' : '#9198a1' }}
                          />
                        </div>
                        <div>
                          <span
                            className="text-sm font-semibold block"
                            style={{ color: isActive ? '#f0b429' : '#f0f3f6' }}
                          >
                            {file.name.replace(/\.csv$/i, '')}
                          </span>
                          {isActive && (
                            <span
                              className="text-[10px] font-medium uppercase tracking-wider"
                              style={{ color: '#f0b429' }}
                            >
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Pin button */}
                        {onPinFile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPinFile(file.id);
                            }}
                            className={`p-2 rounded-lg transition-all duration-150 ${
                              file.isPinned
                                ? 'opacity-100'
                                : 'opacity-40 group-hover:opacity-100 animate-pin-hint'
                            }`}
                            style={{
                              color: file.isPinned ? '#f0b429' : '#656d76',
                              backgroundColor: file.isPinned ? 'rgba(240, 180, 41, 0.1)' : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              if (!file.isPinned) {
                                e.currentTarget.style.color = '#f0b429';
                                e.currentTarget.style.backgroundColor = 'rgba(240, 180, 41, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!file.isPinned) {
                                e.currentTarget.style.color = '#656d76';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                            title={file.isPinned ? "Unpin (remove from saved)" : "Pin to save for next session"}
                          >
                            {file.isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                          </button>
                        )}
                        {/* Remove button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFileRemove(file.id);
                          }}
                          className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150"
                          style={{ color: '#656d76' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#f85149';
                            e.currentTarget.style.backgroundColor = 'rgba(248, 81, 73, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#656d76';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="Remove dataset"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4">
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: 'rgba(63, 185, 80, 0.1)' }}
                      >
                        <span className="text-xs font-mono font-medium" style={{ color: '#3fb950' }}>
                          {formatNumber(file.schema.rowCount)}
                        </span>
                        <span className="text-[10px] uppercase" style={{ color: '#656d76' }}>rows</span>
                      </div>
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: 'rgba(88, 166, 255, 0.1)' }}
                      >
                        <span className="text-xs font-mono font-medium" style={{ color: '#58a6ff' }}>
                          {file.schema.columns.length}
                        </span>
                        <span className="text-[10px] uppercase" style={{ color: '#656d76' }}>cols</span>
                      </div>
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: 'rgba(163, 113, 247, 0.1)' }}
                      >
                        <span className="text-xs font-mono font-medium" style={{ color: '#a371f7' }}>
                          {formatBytes(file.size)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add More */}
          {files.length < 5 && (
            <div className="p-3 pt-0">
              <button
                onClick={() => {
                  onAddFile();
                  setIsOpen(false);
                }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl transition-all duration-200"
                style={{
                  backgroundColor: 'transparent',
                  border: '2px dashed rgba(88, 166, 255, 0.3)',
                  color: '#58a6ff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(88, 166, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(88, 166, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(88, 166, 255, 0.3)';
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add dataset</span>
              </button>
            </div>
          )}

          {/* Max reached */}
          {files.length >= 5 && (
            <div className="px-5 py-3 border-t" style={{ borderColor: 'rgba(240, 243, 246, 0.08)' }}>
              <p className="text-xs text-center" style={{ color: '#656d76' }}>
                Maximum capacity reached
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
