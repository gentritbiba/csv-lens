"use client";

import { useState } from "react";
import { Chart } from "./Chart";
import { ChartErrorBoundary } from "./ErrorBoundary";
import { X, Pin, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VisualizationPanelProps {
  data: unknown[] | null;
  chartType: "bar" | "line" | "pie" | "scatter" | "table";
  xAxis?: string;
  yAxis?: string;
  sql?: string;
  onClear: () => void;
  onPinToDashboard?: (config: {
    sql: string;
    chartType: string;
    xAxis?: string;
    yAxis?: string;
  }) => void;
}

export function VisualizationPanel({
  data,
  chartType,
  xAxis,
  yAxis,
  sql,
  onClear,
  onPinToDashboard,
}: VisualizationPanelProps) {
  const [isPinned, setIsPinned] = useState(false);

  const handlePin = () => {
    if (onPinToDashboard && sql) {
      onPinToDashboard({
        sql,
        chartType,
        xAxis,
        yAxis,
      });
      setIsPinned(true);
      // Reset the pinned state after a brief moment
      setTimeout(() => setIsPinned(false), 2000);
    }
  };

  return (
    <Card className="h-full flex flex-col rounded-none border-0">
      <CardHeader className="py-2.5 px-3 border-b flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Results
        </CardTitle>
        {data && (
          <div className="flex items-center gap-1">
            {onPinToDashboard && sql && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePin}
                      disabled={isPinned}
                      className="h-7 w-7"
                    >
                      {isPinned ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Pin className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isPinned ? "Pinned to Dashboard!" : "Pin to Dashboard"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button variant="ghost" size="icon" onClick={onClear} className="h-7 w-7">
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-3 min-h-0">
        {data ? (
          <ChartErrorBoundary chartType={chartType}>
            <Chart
              data={data}
              chartType={chartType}
              xAxis={xAxis}
              yAxis={yAxis}
            />
          </ChartErrorBoundary>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Ask a question to see results
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
