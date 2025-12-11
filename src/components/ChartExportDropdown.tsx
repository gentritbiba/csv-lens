"use client";

import { useState } from "react";
import { useChartExport } from "@/hooks/useChartExport";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Image as ImageIcon, Clipboard, Check, Loader2 } from "lucide-react";

interface ChartExportDropdownProps {
  chartRef: React.RefObject<HTMLDivElement | null>;
  filename?: string;
}

export function ChartExportDropdown({ chartRef, filename = "chart" }: ChartExportDropdownProps) {
  const { exportToPng, copyToClipboard, isExporting } = useChartExport();
  const [copied, setCopied] = useState(false);

  const handleExportPng = async () => {
    if (chartRef.current) {
      await exportToPng(chartRef.current, { filename });
    }
  };

  const handleCopyToClipboard = async () => {
    if (chartRef.current) {
      await copyToClipboard(chartRef.current);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPng}>
          <ImageIcon className="h-4 w-4 mr-2" aria-hidden="true" />
          Download PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyToClipboard}>
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Clipboard className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
