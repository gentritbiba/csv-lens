"use client";

import { useState } from "react";
import { ColumnProfile } from "@/hooks/useProfile";
import {
  ChevronDown,
  Hash,
  Type,
  Calendar,
  FileText,
  ToggleLeft,
  HelpCircle,
  Mail,
  Link,
  Phone,
  CalendarDays,
  Binary,
  FileQuestion,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from "recharts";

interface ColumnCardProps {
  column: ColumnProfile;
}

const TYPE_CONFIG: Record<
  ColumnProfile["type"],
  { icon: React.ReactNode; color: string; label: string }
> = {
  numeric: {
    icon: <Hash className="w-3.5 h-3.5" />,
    color: "#3fb950",
    label: "Numeric",
  },
  categorical: {
    icon: <Type className="w-3.5 h-3.5" />,
    color: "#f0b429",
    label: "Categorical",
  },
  datetime: {
    icon: <Calendar className="w-3.5 h-3.5" />,
    color: "#f778ba",
    label: "Date/Time",
  },
  text: {
    icon: <FileText className="w-3.5 h-3.5" />,
    color: "#79c0ff",
    label: "Text",
  },
  boolean: {
    icon: <ToggleLeft className="w-3.5 h-3.5" />,
    color: "#a371f7",
    label: "Boolean",
  },
  unknown: {
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    color: "#656d76",
    label: "Unknown",
  },
};

const CHART_COLORS = [
  "#58a6ff",
  "#a371f7",
  "#f0b429",
  "#3fb950",
  "#f778ba",
];

function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return "-";
  if (Number.isInteger(num)) return num.toLocaleString();
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div
      className="p-3 rounded-lg"
      style={{ backgroundColor: '#161b22' }}
    >
      <p
        className="text-[10px] font-medium uppercase tracking-wider mb-1"
        style={{ color: '#656d76' }}
      >
        {label}
      </p>
      <p
        className="font-mono text-sm font-medium"
        style={{ color: color || '#f0f3f6' }}
      >
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
    </div>
  );
}

export function ColumnCard({ column }: ColumnCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const typeConfig = TYPE_CONFIG[column.type];
  const completeness = 100 - column.nullPercent;

  const completenessColor =
    completeness >= 95 ? "#3fb950" : completeness >= 80 ? "#f0b429" : "#f85149";

  // Calculate IQR for outlier detection display
  const hasQuartiles = column.q1 !== undefined && column.q3 !== undefined;
  const iqr = hasQuartiles ? (column.q3! - column.q1!) : 0;
  const lowerBound = hasQuartiles ? column.q1! - 1.5 * iqr : undefined;
  const upperBound = hasQuartiles ? column.q3! + 1.5 * iqr : undefined;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: '#0d1117',
        border: '1px solid rgba(240, 243, 246, 0.08)',
      }}
    >
      {/* Header - Clickable */}
      <button
        className="w-full cursor-pointer select-none p-4 text-left bg-transparent border-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ChevronDown
              className="w-4 h-4 transition-transform shrink-0"
              style={{
                color: '#656d76',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
            <span
              className="font-semibold truncate"
              style={{ color: '#f0f3f6' }}
            >
              {column.name}
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium shrink-0"
              style={{
                backgroundColor: `${typeConfig.color}15`,
                color: typeConfig.color,
              }}
            >
              {typeConfig.icon}
              {typeConfig.label}
            </span>
          </div>

          <div
            className="flex items-center gap-4 text-sm shrink-0"
            style={{ color: '#656d76' }}
          >
            <span>{formatNumber(column.distinctCount)} distinct</span>
            <span style={{ color: column.nullPercent > 20 ? '#f0b429' : '#656d76' }}>
              {column.nullPercent.toFixed(1)}% null
            </span>
          </div>
        </div>

        {/* Completeness bar */}
        <div className="mt-3 ml-7">
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: '#21262d' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${completeness}%`,
                backgroundColor: completenessColor,
                boxShadow: `0 0 8px ${completenessColor}40`,
              }}
            />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className="px-4 pb-4 animate-fade-in"
          style={{ borderTop: '1px solid rgba(240, 243, 246, 0.06)' }}
        >
          <div className="ml-7 pt-4 space-y-5">
            {/* Numeric stats with histogram */}
            {column.type === "numeric" && (
              <>
                {/* Stats grid */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  <StatBox label="Min" value={column.min ?? '-'} />
                  <StatBox label="Max" value={column.max ?? '-'} />
                  <StatBox label="Mean" value={column.mean ?? '-'} />
                  <StatBox label="Median" value={column.median ?? '-'} />
                  <StatBox label="Std Dev" value={column.stdDev ?? '-'} />
                  <StatBox label="IQR" value={iqr || '-'} />
                </div>

                {/* Quartile info */}
                {hasQuartiles && (
                  <div
                    className="flex items-center gap-4 p-3 rounded-lg text-xs"
                    style={{
                      backgroundColor: 'rgba(88, 166, 255, 0.08)',
                      border: '1px solid rgba(88, 166, 255, 0.15)',
                    }}
                  >
                    <span style={{ color: '#656d76' }}>Quartiles:</span>
                    <span style={{ color: '#f0f3f6' }}>
                      Q1: <span className="font-mono">{formatNumber(column.q1)}</span>
                    </span>
                    <span style={{ color: '#f0f3f6' }}>
                      Q3: <span className="font-mono">{formatNumber(column.q3)}</span>
                    </span>
                    <span style={{ color: '#656d76' }}>|</span>
                    <span style={{ color: '#656d76' }}>
                      Outlier bounds: <span className="font-mono text-[#79c0ff]">[{formatNumber(lowerBound)}, {formatNumber(upperBound)}]</span>
                    </span>
                  </div>
                )}

                {/* Histogram */}
                {column.histogram && column.histogram.length > 0 && (
                  <div>
                    <p
                      className="text-xs font-medium uppercase tracking-wider mb-3"
                      style={{ color: '#656d76' }}
                    >
                      Distribution
                    </p>
                    <div
                      className="h-40 p-3 rounded-xl"
                      style={{ backgroundColor: '#161b22' }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={column.histogram}
                          margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                        >
                          <defs>
                            <linearGradient id={`gradient-${column.name}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3fb950" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#3fb950" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="bucket"
                            stroke="#656d76"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            stroke="#656d76"
                            fontSize={9}
                            tickLine={false}
                            axisLine={false}
                            width={40}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#161b22',
                              border: '1px solid rgba(240, 243, 246, 0.1)',
                              borderRadius: '8px',
                              fontSize: '11px',
                              padding: '8px 12px',
                              color: '#f0f3f6',
                            }}
                            formatter={(value: number) => [value.toLocaleString(), 'Count']}
                            labelFormatter={(label) => `Range: ${label}`}
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#3fb950"
                            strokeWidth={2}
                            fill={`url(#gradient-${column.name})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Text stats with patterns */}
            {column.type === "text" && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <StatBox label="Avg Length" value={column.avgLength ?? '-'} />
                  <StatBox label="Min Length" value={column.minLength ?? '-'} />
                  <StatBox label="Max Length" value={column.maxLength ?? '-'} />
                </div>

                {/* Pattern Detection */}
                {column.patterns && (
                  <div>
                    <p
                      className="text-xs font-medium uppercase tracking-wider mb-3"
                      style={{ color: '#656d76' }}
                    >
                      Detected Patterns
                    </p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {[
                        { key: 'emails', label: 'Emails', icon: <Mail className="w-3.5 h-3.5" />, color: '#58a6ff' },
                        { key: 'urls', label: 'URLs', icon: <Link className="w-3.5 h-3.5" />, color: '#a371f7' },
                        { key: 'phones', label: 'Phones', icon: <Phone className="w-3.5 h-3.5" />, color: '#3fb950' },
                        { key: 'dates', label: 'Dates', icon: <CalendarDays className="w-3.5 h-3.5" />, color: '#f778ba' },
                        { key: 'numbers', label: 'Numbers', icon: <Binary className="w-3.5 h-3.5" />, color: '#f0b429' },
                        { key: 'empty', label: 'Empty', icon: <FileQuestion className="w-3.5 h-3.5" />, color: '#656d76' },
                      ].map(({ key, label, icon, color }) => {
                        const count = column.patterns?.[key as keyof typeof column.patterns] || 0;
                        const hasValues = count > 0;
                        return (
                          <div
                            key={key}
                            className="p-3 rounded-lg flex items-center gap-2"
                            style={{
                              backgroundColor: hasValues ? `${color}10` : '#161b22',
                              border: `1px solid ${hasValues ? `${color}20` : 'transparent'}`,
                            }}
                          >
                            <span style={{ color: hasValues ? color : '#484f58' }}>{icon}</span>
                            <div>
                              <p className="text-xs font-mono font-medium" style={{ color: hasValues ? '#f0f3f6' : '#484f58' }}>
                                {count.toLocaleString()}
                              </p>
                              <p className="text-[9px] uppercase tracking-wider" style={{ color: '#656d76' }}>
                                {label}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Date/Time stats */}
            {column.type === "datetime" && column.minDate && column.maxDate && (
              <div className="grid grid-cols-2 gap-2">
                <StatBox label="Earliest" value={column.minDate} />
                <StatBox label="Latest" value={column.maxDate} />
              </div>
            )}

            {/* Top values chart for categorical */}
            {column.topValues && column.topValues.length > 0 && (
              <div>
                <p
                  className="text-xs font-medium uppercase tracking-wider mb-3"
                  style={{ color: '#656d76' }}
                >
                  Top Values
                </p>
                <div
                  className="h-44 p-3 rounded-xl"
                  style={{ backgroundColor: '#161b22' }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={column.topValues.slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 0, right: 20, bottom: 0, left: 80 }}
                    >
                      <XAxis
                        type="number"
                        stroke="#656d76"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="value"
                        stroke="#656d76"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={75}
                        tickFormatter={(value: string) =>
                          value.length > 12 ? `${value.slice(0, 12)}...` : value
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#161b22',
                          border: '1px solid rgba(240, 243, 246, 0.1)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          padding: '8px 12px',
                          color: '#f0f3f6',
                        }}
                        formatter={(value, _name, props) => {
                          const payload = props?.payload as { percent?: number } | undefined;
                          const percent = payload?.percent;
                          const formattedValue = typeof value === "number" ? value.toLocaleString() : String(value);
                          return [
                            percent !== undefined
                              ? `${formattedValue} (${percent.toFixed(1)}%)`
                              : formattedValue,
                            "Count",
                          ];
                        }}
                        cursor={{ fill: 'rgba(88, 166, 255, 0.1)' }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {column.topValues.slice(0, 8).map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
