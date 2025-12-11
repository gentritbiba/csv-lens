// src/components/WorkspaceLayout.tsx
"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { Settings, Menu } from "lucide-react";
import { TabNavigation } from "./TabNavigation";
import { FileSelector } from "./FileSelector";
import { Logo } from "./brand";
import { MobileBottomNav } from "./MobileNav";
import { MobileDrawer } from "./MobileDrawer";
import { WorkspaceTab, LoadedFile } from "@/types/workspace";

interface WorkspaceLayoutProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  files: LoadedFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileRemove: (fileId: string) => void;
  onAddFile: () => void;
  onPinFile?: (fileId: string) => void;
  children: ReactNode;
  isLoading?: boolean;
}

export function WorkspaceLayout({
  activeTab,
  onTabChange,
  files,
  activeFileId,
  onFileSelect,
  onFileRemove,
  onAddFile,
  onPinFile,
  children,
  isLoading,
}: WorkspaceLayoutProps) {
  const hasFiles = files.length > 0;
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[--background] flex flex-col">
      {/* Desktop Header - Hidden on mobile */}
      <header className="sticky top-0 z-40 glass border-b border-[--border] hidden md:block">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Logo & Tabs */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Logo size="md" showText={true} />
              {hasFiles && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full ml-1"
                  style={{
                    backgroundColor: 'rgba(240, 180, 41, 0.15)',
                    color: '#f0b429',
                  }}
                >
                  {files.length} dataset{files.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Tab Navigation */}
            <TabNavigation
              activeTab={activeTab}
              onTabChange={onTabChange}
              disabled={!hasFiles || isLoading}
            />
          </div>

          {/* Right: File Selector + User Menu */}
          <div className="flex items-center gap-4">
            <FileSelector
              files={files}
              activeFileId={activeFileId}
              onFileSelect={onFileSelect}
              onFileRemove={onFileRemove}
              onAddFile={onAddFile}
              onPinFile={onPinFile}
              disabled={isLoading}
            />

            {/* Settings Button */}
            <Link
              href="/settings"
              target="_blank"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[--background-subtle] transition-colors"
              title="Account Settings"
            >
              <Settings className="w-5 h-5 text-[--foreground-muted]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Header - Minimal, clean */}
      <header
        className="sticky top-0 z-40 md:hidden"
        style={{
          backgroundColor: "rgba(8, 11, 16, 0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(240, 243, 246, 0.08)",
        }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          {/* Menu button */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors active:scale-95"
            style={{ backgroundColor: "rgba(240, 243, 246, 0.05)" }}
          >
            <Menu className="w-5 h-5" style={{ color: "#9198a1" }} />
          </button>

          {/* Center: Logo or Active file name */}
          <div className="flex items-center gap-2">
            {hasFiles ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-semibold truncate max-w-[160px]"
                  style={{ color: "#f0f3f6" }}
                >
                  {files.find((f) => f.id === activeFileId)?.name.replace(/\.csv$/i, "") || "Select"}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                  style={{
                    backgroundColor: "rgba(240, 180, 41, 0.15)",
                    color: "#f0b429",
                  }}
                >
                  {files.length}
                </span>
              </div>
            ) : (
              <Logo size="sm" showText />
            )}
          </div>

          {/* Settings */}
          <Link
            href="/settings"
            target="_blank"
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors active:scale-95"
            style={{ backgroundColor: "rgba(240, 243, 246, 0.05)" }}
          >
            <Settings className="w-5 h-5" style={{ color: "#9198a1" }} />
          </Link>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        files={files}
        activeFileId={activeFileId}
        onFileSelect={onFileSelect}
        onFileRemove={onFileRemove}
        onAddFile={onAddFile}
        onPinFile={onPinFile}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto data-grid-bg pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        disabled={!hasFiles || isLoading}
        onMenuOpen={() => setIsMobileDrawerOpen(true)}
        hasFiles={hasFiles}
      />

      {/* Ambient glow at bottom - hidden on mobile to not interfere with nav */}
      <div className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none bg-gradient-to-t from-[--primary]/5 to-transparent hidden md:block" />
    </div>
  );
}
