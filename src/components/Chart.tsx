"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

interface ChartProps {
  data: unknown[];
  chartType: "bar" | "line" | "pie" | "scatter" | "table";
  xAxis?: string;
  yAxis?: string;
}

export function Chart({ data, chartType, xAxis, yAxis }: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[--foreground-subtle] text-sm">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[--background-subtle] flex items-center justify-center">
            <svg className="w-6 h-6 text-[--foreground-subtle]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p>No data to display</p>
        </div>
      </div>
    );
  }

  const typedData = data as Record<string, unknown>[];
  const keys = Object.keys(typedData[0]);
  const effectiveXAxis = xAxis || keys[0];
  const effectiveYAxis = yAxis || keys[1] || keys[0];

  const tooltipStyle = {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    fontSize: "12px",
    padding: "10px 14px",
    boxShadow: "var(--shadow-md)",
    color: "var(--foreground)",
  };

  const tooltipLabelStyle = {
    color: "var(--foreground)",
    fontWeight: 500,
    marginBottom: "4px",
  };

  const tooltipItemStyle = {
    color: "var(--foreground-muted)",
  };

  // Table view
  if (chartType === "table") {
    return (
      <ScrollArea className="h-full w-full rounded-xl border border-[--border] bg-[--background-subtle]/30">
        <div className="min-w-max">
          <Table>
            <TableHeader>
              <TableRow className="border-[--border] hover:bg-transparent">
                {keys.map((key) => (
                  <TableHead
                    key={key}
                    className="text-xs font-semibold h-10 whitespace-nowrap text-[--foreground-muted] bg-[--background-subtle] first:rounded-tl-xl last:rounded-tr-xl"
                  >
                    {key}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {typedData.slice(0, 100).map((row, i) => (
                <TableRow
                  key={i}
                  className="border-[--border] hover:bg-[--background-muted]/50 transition-colors"
                >
                  {keys.map((key) => (
                    <TableCell
                      key={key}
                      className="py-2.5 text-xs font-mono whitespace-nowrap text-[--foreground]"
                    >
                      {row[key] === null || row[key] === undefined ? (
                        <span className="text-[--foreground-subtle]">null</span>
                      ) : (
                        String(row[key])
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {typedData.length > 100 && (
            <div className="flex justify-center py-3 bg-[--background-subtle] border-t border-[--border]">
              <span className="text-xs text-[--foreground-subtle] px-3 py-1 rounded-full bg-[--background-muted]">
                Showing 100 of {typedData.length} rows
              </span>
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  // Pie chart
  if (chartType === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={typedData}
            dataKey={effectiveYAxis}
            nameKey={effectiveXAxis}
            cx="50%"
            cy="50%"
            outerRadius="75%"
            innerRadius="40%"
            paddingAngle={2}
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={{
              stroke: "var(--foreground-subtle)",
              strokeWidth: 1,
              strokeDasharray: "2 2"
            }}
          >
            {typedData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                strokeWidth={0}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
          <Legend
            wrapperStyle={{
              fontSize: "12px",
              color: "var(--foreground-muted)",
            }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // Scatter chart
  if (chartType === "scatter") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey={effectiveXAxis}
            stroke="var(--foreground-subtle)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--foreground-muted)" }}
          />
          <YAxis
            dataKey={effectiveYAxis}
            stroke="var(--foreground-subtle)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--foreground-muted)" }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            cursor={{ stroke: "var(--primary)", strokeDasharray: "3 3" }}
          />
          <Scatter
            data={typedData}
            fill="var(--chart-1)"
          >
            {typedData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[0]}
                fillOpacity={0.7}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // Line chart
  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={typedData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey={effectiveXAxis}
            stroke="var(--foreground-subtle)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--foreground-muted)" }}
          />
          <YAxis
            stroke="var(--foreground-subtle)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--foreground-muted)" }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            cursor={{ stroke: "var(--border)" }}
          />
          <Legend
            wrapperStyle={{
              fontSize: "12px",
              color: "var(--foreground-muted)",
            }}
            iconType="plainline"
          />
          <Line
            type="monotone"
            dataKey={effectiveYAxis}
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            dot={{
              fill: "var(--chart-1)",
              r: 4,
              strokeWidth: 2,
              stroke: "var(--card)"
            }}
            activeDot={{
              r: 6,
              fill: "var(--chart-1)",
              stroke: "var(--card)",
              strokeWidth: 2
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar chart
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={typedData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.5}
          vertical={false}
        />
        <XAxis
          dataKey={effectiveXAxis}
          stroke="var(--foreground-subtle)"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tick={{ fill: "var(--foreground-muted)" }}
        />
        <YAxis
          stroke="var(--foreground-subtle)"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tick={{ fill: "var(--foreground-muted)" }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ fill: "var(--background-muted)", opacity: 0.3 }}
        />
        <Legend
          wrapperStyle={{
            fontSize: "12px",
            color: "var(--foreground-muted)",
          }}
          iconType="rect"
          iconSize={10}
        />
        <Bar
          dataKey={effectiveYAxis}
          fill="url(#barGradient)"
          radius={[6, 6, 0, 0]}
          maxBarSize={60}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
