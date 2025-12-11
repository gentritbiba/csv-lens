"use client";

import { ProfileData } from "@/hooks/useProfile";
import {
  Hash,
  Type,
  Calendar,
  FileText,
  Rows3,
  Columns3,
  HardDrive,
  Copy,
} from "lucide-react";

interface ProfileOverviewProps {
  overview: ProfileData["overview"];
}

interface StatItemProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accentColor: string;
  subtitle?: string;
}

function StatItem({ label, value, icon, accentColor, subtitle }: StatItemProps) {
  return (
    <div
      className="relative p-4 rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02]"
      style={{
        backgroundColor: '#161b22',
        border: '1px solid rgba(240, 243, 246, 0.08)',
      }}
    >
      {/* Subtle glow effect */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          background: `radial-gradient(circle at top right, ${accentColor}, transparent 70%)`,
        }}
      />

      <div className="relative flex items-center gap-3">
        <div
          className="p-2.5 rounded-lg"
          style={{
            backgroundColor: `${accentColor}15`,
            color: accentColor,
          }}
        >
          {icon}
        </div>
        <div>
          <p
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#f0f3f6' }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          <p
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: '#656d76' }}
          >
            {label}
          </p>
          {subtitle && (
            <p className="text-[10px] mt-0.5" style={{ color: '#484f58' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreGauge({ score, label, color }: { score: number; label: string; color: string }) {
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        {/* Background circle */}
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="36"
            stroke="#21262d"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="48"
            cy="48"
            r="36"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 1s ease-out',
              filter: `drop-shadow(0 0 8px ${color}40)`,
            }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color: '#f0f3f6' }}>
            {score.toFixed(0)}
          </span>
        </div>
      </div>
      <p className="text-xs font-medium mt-2 uppercase tracking-wider" style={{ color: '#656d76' }}>
        {label}
      </p>
    </div>
  );
}

export function ProfileOverview({ overview }: ProfileOverviewProps) {
  const completenessColor =
    overview.completenessScore >= 95
      ? "#3fb950"
      : overview.completenessScore >= 80
        ? "#f0b429"
        : "#f85149";

  const qualityColor =
    overview.qualityScore >= 80
      ? "#3fb950"
      : overview.qualityScore >= 60
        ? "#f0b429"
        : "#f85149";

  // Format memory size
  const formatMemory = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        backgroundColor: '#0d1117',
        border: '1px solid rgba(240, 243, 246, 0.08)',
      }}
    >
      {/* Header with Score Gauges */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#f0f3f6' }}>
            Dataset Overview
          </h2>
          <p className="text-sm mt-1" style={{ color: '#656d76' }}>
            {overview.rowCount.toLocaleString()} rows × {overview.columnCount} columns
          </p>
        </div>

        {/* Score Gauges */}
        <div className="flex items-center gap-6">
          <ScoreGauge
            score={overview.qualityScore}
            label="Quality Score"
            color={qualityColor}
          />
          <ScoreGauge
            score={overview.completenessScore}
            label="Completeness"
            color={completenessColor}
          />
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatItem
          label="Total Rows"
          value={overview.rowCount}
          icon={<Rows3 className="w-5 h-5" />}
          accentColor="#58a6ff"
        />
        <StatItem
          label="Total Columns"
          value={overview.columnCount}
          icon={<Columns3 className="w-5 h-5" />}
          accentColor="#a371f7"
        />
        <StatItem
          label="Memory Est."
          value={formatMemory(overview.estimatedMemoryMB)}
          icon={<HardDrive className="w-5 h-5" />}
          accentColor="#79c0ff"
          subtitle="in-memory size"
        />
        <StatItem
          label="Duplicates"
          value={overview.duplicateRows}
          icon={<Copy className="w-5 h-5" />}
          accentColor={overview.duplicateRows > 0 ? "#f0b429" : "#3fb950"}
          subtitle={overview.duplicateRows > 0 ? "duplicate groups" : "no duplicates"}
        />
      </div>

      {/* Column Type Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatItem
          label="Numeric"
          value={overview.numericColumns}
          icon={<Hash className="w-5 h-5" />}
          accentColor="#3fb950"
        />
        <StatItem
          label="Categorical"
          value={overview.categoricalColumns}
          icon={<Type className="w-5 h-5" />}
          accentColor="#f0b429"
        />
        <StatItem
          label="Date/Time"
          value={overview.dateColumns}
          icon={<Calendar className="w-5 h-5" />}
          accentColor="#f778ba"
        />
        <StatItem
          label="Text"
          value={overview.textColumns}
          icon={<FileText className="w-5 h-5" />}
          accentColor="#79c0ff"
        />
      </div>
    </div>
  );
}
