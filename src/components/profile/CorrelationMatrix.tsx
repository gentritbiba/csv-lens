"use client";

import { useMemo } from "react";
import { ProfileData } from "@/hooks/useProfile";

interface CorrelationMatrixProps {
  correlations: ProfileData["correlations"];
  columns: string[];
}

export function CorrelationMatrix({ correlations, columns }: CorrelationMatrixProps) {
  // Build matrix data
  const matrixData = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};

    // Initialize matrix with 1s on diagonal
    columns.forEach((col) => {
      matrix[col] = {};
      columns.forEach((col2) => {
        matrix[col][col2] = col === col2 ? 1 : 0;
      });
    });

    // Fill in correlations
    correlations.forEach(({ col1, col2, correlation }) => {
      if (matrix[col1] && matrix[col2]) {
        matrix[col1][col2] = correlation;
        matrix[col2][col1] = correlation;
      }
    });

    return matrix;
  }, [correlations, columns]);

  // Get color for correlation value
  const getColor = (value: number) => {
    if (value === 1) return '#21262d'; // Diagonal
    const absValue = Math.abs(value);
    if (absValue >= 0.8) return value > 0 ? '#238636' : '#da3633';
    if (absValue >= 0.6) return value > 0 ? '#2ea043' : '#f85149';
    if (absValue >= 0.4) return value > 0 ? '#3fb950' : '#ff7b72';
    if (absValue >= 0.2) return value > 0 ? 'rgba(63, 185, 80, 0.4)' : 'rgba(248, 81, 73, 0.4)';
    return '#161b22';
  };

  const getTextColor = (value: number) => {
    const absValue = Math.abs(value);
    if (value === 1) return '#484f58';
    if (absValue >= 0.4) return '#f0f3f6';
    return '#656d76';
  };

  if (columns.length < 2) {
    return null;
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        backgroundColor: '#0d1117',
        border: '1px solid rgba(240, 243, 246, 0.08)',
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#f0f3f6' }}>
            Correlation Matrix
          </h2>
          <p className="text-sm mt-1" style={{ color: '#656d76' }}>
            Pearson correlation between numeric columns
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs" style={{ color: '#656d76' }}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#238636' }} />
            <span>Strong +</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#161b22' }} />
            <span>None</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#da3633' }} />
            <span>Strong −</span>
          </div>
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2" />
              {columns.map((col) => (
                <th
                  key={col}
                  className="p-2 text-xs font-medium text-left truncate max-w-[100px]"
                  style={{ color: '#656d76' }}
                  title={col}
                >
                  {col.length > 10 ? col.slice(0, 10) + '...' : col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((rowCol) => (
              <tr key={rowCol}>
                <td
                  className="p-2 text-xs font-medium truncate max-w-[100px]"
                  style={{ color: '#656d76' }}
                  title={rowCol}
                >
                  {rowCol.length > 10 ? rowCol.slice(0, 10) + '...' : rowCol}
                </td>
                {columns.map((colCol) => {
                  const value = matrixData[rowCol]?.[colCol] ?? 0;
                  return (
                    <td key={colCol} className="p-1">
                      <div
                        className="w-full h-10 rounded-lg flex items-center justify-center text-xs font-mono font-medium transition-all duration-200 hover:scale-105"
                        style={{
                          backgroundColor: getColor(value),
                          color: getTextColor(value),
                          border: '1px solid rgba(240, 243, 246, 0.05)',
                        }}
                        title={`${rowCol} × ${colCol}: ${value.toFixed(3)}`}
                      >
                        {value === 1 ? '—' : value.toFixed(2)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notable correlations */}
      {correlations.length > 0 && (
        <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(240, 243, 246, 0.08)' }}>
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#656d76' }}>
            Notable Correlations
          </p>
          <div className="flex flex-wrap gap-2">
            {correlations
              .filter((c) => Math.abs(c.correlation) >= 0.5)
              .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
              .slice(0, 5)
              .map(({ col1, col2, correlation }) => (
                <div
                  key={`${col1}-${col2}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{
                    backgroundColor: correlation > 0 ? 'rgba(63, 185, 80, 0.1)' : 'rgba(248, 81, 73, 0.1)',
                    border: `1px solid ${correlation > 0 ? 'rgba(63, 185, 80, 0.2)' : 'rgba(248, 81, 73, 0.2)'}`,
                  }}
                >
                  <span style={{ color: '#f0f3f6' }}>{col1}</span>
                  <span style={{ color: '#484f58' }}>↔</span>
                  <span style={{ color: '#f0f3f6' }}>{col2}</span>
                  <span
                    className="font-mono font-medium"
                    style={{ color: correlation > 0 ? '#3fb950' : '#f85149' }}
                  >
                    {correlation > 0 ? '+' : ''}{correlation.toFixed(2)}
                  </span>
                </div>
              ))}
            {correlations.filter((c) => Math.abs(c.correlation) >= 0.5).length === 0 && (
              <span className="text-xs" style={{ color: '#484f58' }}>
                No strong correlations found (|r| ≥ 0.5)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
