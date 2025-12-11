"use client";

import { DataQualityAlert } from "@/hooks/useProfile";
import {
  AlertTriangle,
  AlertCircle,
  Copy,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

interface AlertsPanelProps {
  alerts: DataQualityAlert[];
}

const ALERT_ICONS: Record<DataQualityAlert["type"], React.ReactNode> = {
  high_nulls: <AlertCircle className="w-4 h-4" />,
  potential_duplicates: <Copy className="w-4 h-4" />,
  outliers: <AlertTriangle className="w-4 h-4" />,
  mixed_types: <AlertCircle className="w-4 h-4" />,
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  // No alerts - success state
  if (alerts.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          backgroundColor: '#0d1117',
          border: '1px solid rgba(63, 185, 80, 0.2)',
        }}
      >
        {/* Success glow */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle at top left, #3fb950, transparent 60%)',
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="p-2 rounded-lg"
              style={{
                backgroundColor: 'rgba(63, 185, 80, 0.15)',
                color: '#3fb950',
              }}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2
              className="text-lg font-semibold"
              style={{ color: '#f0f3f6' }}
            >
              Data Quality
            </h2>
          </div>

          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{
              backgroundColor: 'rgba(63, 185, 80, 0.08)',
              border: '1px solid rgba(63, 185, 80, 0.15)',
            }}
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: '#3fb950' }} />
            <span
              className="font-medium"
              style={{ color: '#3fb950' }}
            >
              No data quality issues found
            </span>
          </div>
        </div>
      </div>
    );
  }

  const errorCount = alerts.filter((a) => a.severity === "error").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div
      className="rounded-2xl p-6 relative overflow-hidden"
      style={{
        backgroundColor: '#0d1117',
        border: '1px solid rgba(240, 243, 246, 0.08)',
      }}
    >
      {/* Warning glow */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          background: 'radial-gradient(circle at top left, #f0b429, transparent 60%)',
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{
                backgroundColor: 'rgba(240, 180, 41, 0.15)',
                color: '#f0b429',
              }}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2
              className="text-lg font-semibold"
              style={{ color: '#f0f3f6' }}
            >
              Data Quality Alerts
            </h2>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {errorCount > 0 && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'rgba(248, 81, 73, 0.15)',
                  color: '#f85149',
                }}
              >
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </span>
            )}
            {warningCount > 0 && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'rgba(240, 180, 41, 0.15)',
                  color: '#f0b429',
                }}
              >
                {warningCount} warning{warningCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-2">
          {alerts.map((alert, index) => {
            const isError = alert.severity === "error";
            const accentColor = isError ? '#f85149' : '#f0b429';

            return (
              <div
                key={`${alert.type}-${alert.column ?? "global"}-${index}`}
                className="flex items-start gap-3 p-4 rounded-xl transition-colors"
                style={{
                  backgroundColor: `${accentColor}08`,
                  border: `1px solid ${accentColor}20`,
                }}
              >
                <div
                  className="shrink-0 mt-0.5"
                  style={{ color: accentColor }}
                >
                  {ALERT_ICONS[alert.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium"
                    style={{ color: '#f0f3f6' }}
                  >
                    {alert.message}
                  </p>
                  {alert.column && (
                    <p
                      className="text-xs mt-1.5"
                      style={{ color: '#656d76' }}
                    >
                      Column:{" "}
                      <code
                        className="px-1.5 py-0.5 rounded text-xs font-mono"
                        style={{
                          backgroundColor: '#21262d',
                          color: accentColor,
                        }}
                      >
                        {alert.column}
                      </code>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
