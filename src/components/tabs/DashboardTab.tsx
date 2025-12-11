"use client";

import { useState, useCallback } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import { DashboardCard } from "@/types/workspace";
import { DashboardCardComponent, AddCardModal } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Plus, Trash2, Bookmark, ArrowRight } from "lucide-react";

// Import react-grid-layout styles
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

interface DashboardTabProps {
  cards: DashboardCard[];
  onAddCard: (card: DashboardCard) => void;
  onRemoveCard: (cardId: string) => void;
  onUpdateCard: (cardId: string, updates: Partial<DashboardCard>) => void;
  runQuery: (sql: string) => Promise<unknown[]>;
}

const GRID_COLS = 12;
const ROW_HEIGHT = 80;

export function DashboardTab({
  cards,
  onAddCard,
  onRemoveCard,
  onUpdateCard,
  runQuery,
}: DashboardTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);

  // Convert cards to layout format
  const layout: Layout[] = cards.map((card) => ({
    i: card.id,
    x: card.position.x,
    y: card.position.y,
    w: card.size.w,
    h: card.size.h,
    minW: 3,
    minH: 2,
  }));

  // Handle layout changes (drag/resize)
  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      newLayout.forEach((item) => {
        const card = cards.find((c) => c.id === item.i);
        if (card) {
          const posChanged = card.position.x !== item.x || card.position.y !== item.y;
          const sizeChanged = card.size.w !== item.w || card.size.h !== item.h;
          if (posChanged || sizeChanged) {
            onUpdateCard(card.id, {
              position: { x: item.x, y: item.y },
              size: { w: item.w, h: item.h },
            });
          }
        }
      });
    },
    [cards, onUpdateCard]
  );

  // Measure container width
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(node);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Empty state
  if (cards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[--primary-muted] to-[--accent-muted] flex items-center justify-center">
            <LayoutDashboard className="w-10 h-10 text-[--primary]" />
          </div>
          <h2 className="text-xl font-semibold text-[--foreground] mb-2">Your Dashboard</h2>
          <p className="text-[--foreground-muted] mb-8">
            Save your favorite insights here for quick access
          </p>

          {/* Pin instruction */}
          <div className="mb-8 p-4 rounded-xl bg-[--background-subtle] border border-[--border]">
            <div className="flex items-center gap-3 text-left">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-[--primary-muted] flex items-center justify-center">
                <Bookmark className="w-5 h-5 text-[--primary]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[--foreground]">
                  Pin from Explore
                </p>
                <p className="text-xs text-[--foreground-muted] mt-0.5">
                  Run a query, then click <span className="text-[--primary] font-medium">Pin to Dashboard</span> to save it here
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[--foreground-subtle]" />
            </div>
          </div>

          <div className="flex items-center gap-3 justify-center text-xs text-[--foreground-subtle]">
            <span>or</span>
          </div>

          <Button
            onClick={() => setShowAddModal(true)}
            variant="outline"
            className="mt-4 bg-[--background-subtle] border-[--border] text-[--foreground-muted] hover:text-[--foreground] hover:border-[--primary]/30"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create custom chart
          </Button>

          {showAddModal && (
            <AddCardModal
              onAdd={onAddCard}
              onClose={() => setShowAddModal(false)}
              runQuery={runQuery}
              existingCardsCount={cards.length}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto pb-24">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[--foreground]">Dashboard</h1>
            <p className="text-sm text-[--foreground-muted] mt-1">
              {cards.length} chart{cards.length !== 1 ? "s" : ""}
              <span className="mx-2 opacity-40">·</span>
              Drag to rearrange
            </p>
          </div>
          <div className="flex gap-2">
            {cards.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Remove all cards from the dashboard?")) {
                    cards.forEach((card) => onRemoveCard(card.id));
                  }
                }}
                className="bg-[--background-subtle] border-[--border] text-[--foreground-muted] hover:text-[--destructive] hover:border-[--destructive]/30 hover:bg-[--destructive]/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="bg-[--primary] text-[--primary-foreground] hover:bg-[--primary]/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Chart
            </Button>
          </div>
        </div>

        {/* Grid Layout */}
        <div ref={containerRef} className="w-full">
          <GridLayout
            className="layout"
            layout={layout}
            cols={GRID_COLS}
            rowHeight={ROW_HEIGHT}
            width={containerWidth}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".card-drag-handle"
            margin={[16, 16]}
            containerPadding={[0, 0]}
            isResizable={true}
            isDraggable={true}
            useCSSTransforms={true}
          >
            {cards.map((card) => (
              <div key={card.id} className="card-drag-handle cursor-move">
                <DashboardCardComponent
                  card={card}
                  runQuery={runQuery}
                  onRemove={onRemoveCard}
                  onUpdate={onUpdateCard}
                />
              </div>
            ))}
          </GridLayout>
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddModal && (
        <AddCardModal
          onAdd={onAddCard}
          onClose={() => setShowAddModal(false)}
          runQuery={runQuery}
          existingCardsCount={cards.length}
        />
      )}
    </div>
  );
}
