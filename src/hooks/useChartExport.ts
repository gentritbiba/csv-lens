"use client";

import { useCallback, useState } from "react";
import html2canvas from "html2canvas";

export interface ExportOptions {
  filename?: string;
  scale?: number;
  backgroundColor?: string;
}

export function useChartExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Export element as PNG image
   */
  const exportToPng = useCallback(async (
    element: HTMLElement,
    options: ExportOptions = {}
  ): Promise<void> => {
    setIsExporting(true);
    setError(null);

    try {
      const canvas = await html2canvas(element, {
        scale: options.scale || 2, // 2x for high resolution
        backgroundColor: options.backgroundColor || "#ffffff",
        logging: false,
        useCORS: true,
      });

      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${options.filename || "chart"}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      setError(message);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  /**
   * Copy chart as PNG to clipboard
   */
  const copyToClipboard = useCallback(async (
    element: HTMLElement,
    options: ExportOptions = {}
  ): Promise<void> => {
    setIsExporting(true);
    setError(null);

    try {
      const canvas = await html2canvas(element, {
        scale: options.scale || 2,
        backgroundColor: options.backgroundColor || "#ffffff",
        logging: false,
        useCORS: true,
      });

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob from canvas"));
          }
        }, "image/png");
      });

      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Copy failed";
      setError(message);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportToPng,
    copyToClipboard,
    isExporting,
    error,
  };
}
