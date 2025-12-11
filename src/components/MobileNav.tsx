// src/components/MobileNav.tsx
"use client";

import { WorkspaceTab } from "@/types/workspace";
import { MessageSquare, BarChart3, LayoutDashboard, Database, Menu } from "lucide-react";

interface MobileNavProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  disabled?: boolean;
  onMenuOpen: () => void;
  hasFiles: boolean;
}

const TABS: { id: WorkspaceTab; label: string; icon: typeof MessageSquare }[] = [
  { id: "chat", label: "Explore", icon: MessageSquare },
  { id: "profile", label: "Profile", icon: BarChart3 },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function MobileBottomNav({
  activeTab,
  onTabChange,
  disabled,
  onMenuOpen,
  hasFiles,
}: MobileNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Blur backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(8, 11, 16, 0.85)",
          borderTop: "1px solid rgba(240, 243, 246, 0.08)",
        }}
      />

      {/* Nav items */}
      <div className="relative flex items-center justify-around px-2 py-2">
        {/* Menu button */}
        <button
          onClick={onMenuOpen}
          className="flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 active:scale-95"
          style={{ minWidth: "64px" }}
        >
          <div
            className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200"
            style={{
              backgroundColor: hasFiles ? "rgba(88, 166, 255, 0.15)" : "transparent",
            }}
          >
            {hasFiles ? (
              <Database className="w-5 h-5" style={{ color: "#58a6ff" }} />
            ) : (
              <Menu className="w-5 h-5" style={{ color: "#9198a1" }} />
            )}
            {hasFiles && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold rounded-full"
                style={{
                  backgroundColor: "#f0b429",
                  color: "#0f1419",
                }}
              >
                {/* File count badge handled in parent */}
              </span>
            )}
          </div>
          <span
            className="text-[10px] font-medium"
            style={{ color: hasFiles ? "#58a6ff" : "#656d76" }}
          >
            {hasFiles ? "Data" : "Menu"}
          </span>
        </button>

        {/* Main tabs */}
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => !disabled && onTabChange(tab.id)}
              disabled={disabled}
              className="flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 active:scale-95"
              style={{
                minWidth: "64px",
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <div
                className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300"
                style={{
                  backgroundColor: isActive ? "rgba(240, 180, 41, 0.15)" : "transparent",
                  transform: isActive ? "translateY(-2px)" : "translateY(0)",
                }}
              >
                <Icon
                  className="w-5 h-5 transition-all duration-200"
                  style={{
                    color: isActive ? "#f0b429" : "#656d76",
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                  }}
                />
                {/* Active indicator dot */}
                {isActive && (
                  <span
                    className="absolute -bottom-1 w-1 h-1 rounded-full"
                    style={{ backgroundColor: "#f0b429" }}
                  />
                )}
              </div>
              <span
                className="text-[10px] font-medium transition-colors duration-200"
                style={{ color: isActive ? "#f0b429" : "#656d76" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
