// src/components/TabNavigation.tsx
"use client";

import { WorkspaceTab } from "@/types/workspace";
import { MessageSquare, BarChart3, LayoutDashboard } from "lucide-react";

interface TabNavigationProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  disabled?: boolean;
}

const TABS: { id: WorkspaceTab; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: "chat",
    label: "Explore",
    icon: <MessageSquare className="w-4 h-4" />,
    description: "Ask questions"
  },
  {
    id: "profile",
    label: "Profile",
    icon: <BarChart3 className="w-4 h-4" />,
    description: "Data stats"
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
    description: "Visualize"
  },
];

export function TabNavigation({ activeTab, onTabChange, disabled }: TabNavigationProps) {
  return (
    <nav className="flex items-center">
      {/* Background track */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl"
        style={{
          backgroundColor: 'rgba(33, 38, 45, 0.5)',
          border: '1px solid rgba(240, 243, 246, 0.1)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              disabled={disabled}
              title={tab.description}
              className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-out"
              style={{
                color: isActive ? '#0f1419' : '#9198a1',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
              }}
            >
              {/* Active background */}
              {isActive && (
                <span
                  className="absolute inset-0 rounded-lg"
                  style={{
                    backgroundColor: '#f0b429',
                    zIndex: 0,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                  }}
                />
              )}

              {/* Icon */}
              <span
                className="relative z-10"
                style={{ color: isActive ? '#0f1419' : '#9198a1' }}
              >
                {tab.icon}
              </span>

              {/* Label */}
              <span className="relative z-10 hidden sm:inline">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
