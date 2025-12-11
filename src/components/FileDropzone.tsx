"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, Loader2, HardDrive } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  currentFile: File | null;
}

export function FileDropzone({
  onFileSelect,
  isLoading,
  currentFile,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
    disabled: isLoading,
  });

  return (
    <Card
      {...getRootProps()}
      className={`
        p-4 cursor-pointer transition-all duration-200 border-dashed
        ${isDragActive ? "border-primary bg-primary/5 border-solid" : "hover:border-primary/50 hover:bg-accent/50"}
        ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />

      {isLoading ? (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Loading CSV...</p>
            <p className="text-xs text-muted-foreground">Processing data</p>
          </div>
        </div>
      ) : currentFile ? (
        <div className="flex items-center gap-3 py-2">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(currentFile.size)} · Drop to replace
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 py-2">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${isDragActive ? "bg-primary/20" : "bg-muted"}`}>
            <Upload className={`w-4 h-4 transition-colors ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {isDragActive ? "Drop CSV here" : "Drop CSV or click"}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              Processed locally
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
