"use client";

import { useState } from "react";
import { DashboardCard } from "@/types/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  LineChart,
  PieChart,
  ScatterChart,
  Table,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AddCardModalProps {
  onAdd: (card: DashboardCard) => void;
  onClose: () => void;
  runQuery: (sql: string) => Promise<unknown[]>;
  existingCardsCount: number;
}

type ChartType = "bar" | "line" | "pie" | "scatter" | "table";

const CHART_OPTIONS: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: "bar", label: "Bar", icon: <BarChart3 className="h-5 w-5" /> },
  { type: "line", label: "Line", icon: <LineChart className="h-5 w-5" /> },
  { type: "pie", label: "Pie", icon: <PieChart className="h-5 w-5" /> },
  { type: "scatter", label: "Scatter", icon: <ScatterChart className="h-5 w-5" /> },
  { type: "table", label: "Table", icon: <Table className="h-5 w-5" /> },
];

export function AddCardModal({
  onAdd,
  onClose,
  runQuery,
  existingCardsCount,
}: AddCardModalProps) {
  const [title, setTitle] = useState("");
  const [sql, setSql] = useState("");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sql.trim()) {
      setError("Please enter a SQL query");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Validate the query
      const result = await runQuery(sql);
      if (result.length === 0) {
        setError("Query returned no results");
        setIsValidating(false);
        return;
      }

      // Generate position based on existing cards
      const row = Math.floor(existingCardsCount / 2);
      const col = existingCardsCount % 2;

      const newCard: DashboardCard = {
        id: `card-${Date.now()}`,
        title: title.trim() || `Chart ${existingCardsCount + 1}`,
        sql: sql.trim(),
        chartType,
        xAxis: xAxis || undefined,
        yAxis: yAxis || undefined,
        position: { x: col * 6, y: row * 4 },
        size: { w: 6, h: 4 },
      };

      onAdd(newCard);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid query");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Add Dashboard Card</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Title (optional)
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Chart title..."
                className="mt-1"
              />
            </div>

            {/* SQL Query */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                SQL Query *
              </label>
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder="SELECT category, COUNT(*) as count FROM data GROUP BY category"
                className="mt-1 w-full h-24 px-3 py-2 text-sm font-mono bg-muted border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Chart Type */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Chart Type
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CHART_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => setChartType(option.type)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md border transition-colors",
                      chartType === option.type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    )}
                  >
                    {option.icon}
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Axis Configuration */}
            {chartType !== "table" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    X Axis (optional)
                  </label>
                  <Input
                    value={xAxis}
                    onChange={(e) => setXAxis(e.target.value)}
                    placeholder="Column name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Y Axis (optional)
                  </label>
                  <Input
                    value={yAxis}
                    onChange={(e) => setYAxis(e.target.value)}
                    placeholder="Column name"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isValidating || !sql.trim()}>
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Card
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
