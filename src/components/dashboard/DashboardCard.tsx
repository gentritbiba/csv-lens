"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardCard as DashboardCardType } from "@/types/workspace";
import { Chart } from "@/components/Chart";
import { ChartErrorBoundary } from "@/components/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RefreshCw,
  MoreVertical,
  Trash2,
  Code2,
  Pencil,
  X,
  Loader2,
  AlertCircle,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartExportDropdown } from "@/components/ChartExportDropdown";
import { SimpleTooltip } from "@/components/ui/SimpleTooltip";

interface DashboardCardProps {
  card: DashboardCardType;
  runQuery: (sql: string) => Promise<unknown[]>;
  onRemove: (cardId: string) => void;
  onUpdate: (cardId: string, updates: Partial<DashboardCardType>) => void;
}

export function DashboardCardComponent({
  card,
  runQuery,
  onRemove,
  onUpdate,
}: DashboardCardProps) {
  const [data, setData] = useState<unknown[] | null>(null);
  const [isLoading, setIsLoading] = useState(!card.staticData);
  const [error, setError] = useState<string | null>(null);
  const [showSQL, setShowSQL] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Check if this card uses static data (from agentic analysis)
  const isStaticData = !!card.staticData;

  const executeQuery = useCallback(async () => {
    // If static data, don't execute query
    if (isStaticData) {
      setData(card.staticData || null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await runQuery(card.sql);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [card.sql, runQuery, isStaticData, card.staticData]);

  // Execute query on mount and when SQL changes (or set static data)
  useEffect(() => {
    if (isStaticData) {
      setData(card.staticData || null);
      setIsLoading(false);
    } else {
      executeQuery();
    }
  }, [executeQuery, isStaticData, card.staticData]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== card.title) {
      onUpdate(card.id, { title: editTitle.trim() });
    } else {
      setEditTitle(card.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      setEditTitle(card.title);
      setIsEditing(false);
    }
  };

  return (
    <Card className={`h-full flex flex-col ${card.chartType === "pie" ? "" : "overflow-hidden"}`}>
      <CardHeader className="flex-shrink-0 py-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={handleKeyDown}
                  className="flex-1 text-sm font-semibold bg-transparent border-b border-primary outline-none"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setEditTitle(card.title);
                    setIsEditing(false);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div>
                <CardTitle
                  className="text-sm font-semibold truncate cursor-pointer hover:text-primary"
                  onClick={() => setIsEditing(true)}
                  title="Click to edit title"
                >
                  {card.title}
                </CardTitle>
                {/* Source dataset info */}
                {card.sourceDataset && (
                  <SimpleTooltip content={card.sourceDataset} position="top">
                    <div className="flex items-center gap-1.5 mt-1 cursor-default">
                      <Database className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                        {card.sourceDataset}
                      </span>
                    </div>
                  </SimpleTooltip>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {card.chartType !== "table" && (
              <ChartExportDropdown
                chartRef={chartRef}
                filename={card.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}
              />
            )}
            {!isStaticData && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={executeQuery}
                disabled={isLoading}
                title="Refresh"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Title
                </DropdownMenuItem>
                {!isStaticData && (
                  <DropdownMenuItem onClick={() => setShowSQL(!showSQL)}>
                    <Code2 className="h-4 w-4 mr-2" />
                    {showSQL ? "Hide SQL" : "View SQL"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onRemove(card.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {showSQL && (
          <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
            <code className="whitespace-pre-wrap break-all">{card.sql}</code>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-2 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-destructive gap-2 p-4">
            <AlertCircle className="h-6 w-6" />
            <p className="text-xs text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={executeQuery}>
              Retry
            </Button>
          </div>
        ) : data && data.length > 0 ? (
          <div ref={chartRef} className={`h-full ${card.chartType === "pie" ? "overflow-visible" : ""}`}>
            <ChartErrorBoundary chartType={card.chartType}>
              <Chart
                data={data}
                chartType={card.chartType as "bar" | "line" | "pie" | "scatter" | "table"}
                xAxis={card.xAxis}
                yAxis={card.yAxis}
              />
            </ChartErrorBoundary>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No data
          </div>
        )}
      </CardContent>
    </Card>
  );
}
