"use client";

import { TableSchema } from "@/hooks/useDuckDB";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database, Rows3 } from "lucide-react";

interface SchemaDisplayProps {
  schema: TableSchema;
}

export function SchemaDisplay({ schema }: SchemaDisplayProps) {
  return (
    <div className="mt-4 space-y-3">
      {/* Stats row */}
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="secondary" className="gap-1 font-normal">
          <Database className="w-3 h-3" />
          {schema.tableName}
        </Badge>
        <Badge variant="outline" className="gap-1 font-normal">
          <Rows3 className="w-3 h-3" />
          {schema.rowCount.toLocaleString()} rows
        </Badge>
        <Badge variant="outline" className="font-normal">
          {schema.columns.length} cols
        </Badge>
      </div>

      {/* Columns */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
          Columns
        </p>
        <div className="flex flex-wrap gap-1">
          {schema.columns.map((col) => (
            <Badge
              key={col}
              variant="secondary"
              className="text-[11px] font-mono font-normal px-1.5 py-0"
            >
              {col}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sample data */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
          Sample
        </p>
        <ScrollArea className="h-[120px] rounded border bg-muted/30">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                {schema.columns.map((col) => (
                  <TableHead
                    key={col}
                    className="h-7 text-[10px] font-medium whitespace-nowrap px-2"
                  >
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {schema.sampleRows.slice(0, 3).map((row, i) => (
                <TableRow key={i} className="border-b border-border/30">
                  {schema.columns.map((col) => (
                    <TableCell
                      key={col}
                      className="py-1 px-2 text-[11px] font-mono truncate max-w-[100px]"
                    >
                      {String((row as Record<string, unknown>)[col] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
