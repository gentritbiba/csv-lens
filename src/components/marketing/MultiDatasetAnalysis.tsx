"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { FileSpreadsheet, Link2, Sparkles, Database, Table2, Send } from "lucide-react";

// Stacked bar data for segment + category breakdown
const segmentData = [
  { segment: "Enterprise", software: 485000, hardware: 312000, services: 198000 },
  { segment: "SMB", software: 234000, hardware: 156000, services: 89000 },
  { segment: "Startup", software: 112000, hardware: 67000, services: 45000 },
];

const datasets = [
  { name: "customers.csv", rows: "1,247", color: "#58a6ff" },
  { name: "orders.csv", rows: "15,832", color: "#f0b429" },
  { name: "products.csv", rows: "89", color: "#a371f7" },
];

export function MultiDatasetAnalysis() {
  return (
    <div className="w-full h-full bg-[#0f1419] flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-[rgba(240,243,246,0.08)] bg-[#0f1419] flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(240,243,246,0.08)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(240,180,41,0.15)] flex items-center justify-center">
              <Database className="w-4 h-4 text-[#f0b429]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#f0f3f6]">Multi-Dataset Mode</h2>
              <p className="text-xs text-[#656d76]">3 files loaded</p>
            </div>
          </div>
        </div>

        {/* Datasets List */}
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#9198a1] uppercase tracking-wider">
              Active Datasets
            </span>
            <button className="text-xs text-[#f0b429] hover:text-[#ffd866]">+ Add</button>
          </div>

          <div className="space-y-2">
            {datasets.map((ds) => (
              <div
                key={ds.name}
                className="p-3 rounded-lg bg-[#161b22] border border-[rgba(240,243,246,0.08)] hover:border-[rgba(240,243,246,0.15)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" style={{ color: ds.color }} />
                  <span className="text-sm font-medium text-[#f0f3f6]">{ds.name}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Table2 className="w-3 h-3 text-[#656d76]" />
                  <span className="text-xs text-[#656d76]">{ds.rows} rows</span>
                </div>
              </div>
            ))}
          </div>

          {/* Join Indicator */}
          <div className="mt-6 p-3 rounded-lg bg-[rgba(63,185,80,0.1)] border border-[rgba(63,185,80,0.2)]">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-[#3fb950]" />
              <span className="text-sm font-medium text-[#3fb950]">Auto-Join Enabled</span>
            </div>
            <p className="text-xs text-[#9198a1] leading-relaxed">
              AI detects relationships and joins tables automatically based on your query.
            </p>
          </div>
        </div>

        {/* Schema Preview */}
        <div className="p-4 border-t border-[rgba(240,243,246,0.08)]">
          <span className="text-xs font-semibold text-[#9198a1] uppercase tracking-wider">
            Detected Keys
          </span>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-[#58a6ff]" />
              <span className="text-[#9198a1]">customers</span>
              <span className="text-[#656d76]">→</span>
              <span className="font-mono text-[#f0f3f6]">customer_id</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-[#f0b429]" />
              <span className="text-[#9198a1]">orders</span>
              <span className="text-[#656d76]">→</span>
              <span className="font-mono text-[#f0f3f6]">customer_id, product_id</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-[#a371f7]" />
              <span className="text-[#9198a1]">products</span>
              <span className="text-[#656d76]">→</span>
              <span className="font-mono text-[#f0f3f6]">product_id</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Query Bar */}
        <div className="p-6 border-b border-[rgba(240,243,246,0.08)]">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#161b22] border border-[rgba(240,243,246,0.1)]">
            <input
              type="text"
              value="Show total revenue by customer segment, including product category breakdown"
              readOnly
              className="flex-1 bg-transparent text-[#f0f3f6] text-sm outline-none"
            />
            <button className="p-2 rounded-lg bg-[#f0b429] hover:bg-[#ffd866] transition-colors">
              <Send className="w-4 h-4 text-[#0f1419]" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 p-6 overflow-auto">
          {/* AI Callout */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-[rgba(163,113,247,0.1)] border border-[rgba(163,113,247,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-[#a371f7]" />
            <span className="text-xs text-[#a371f7]">AI automatically joined 3 tables</span>
          </div>

          {/* Chart Card */}
          <div className="rounded-xl bg-[#161b22] border border-[rgba(240,243,246,0.08)] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[rgba(240,243,246,0.08)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#f0f3f6]">
                  Revenue by Customer Segment
                </h3>
                <p className="text-xs text-[#656d76] mt-0.5">
                  Breakdown by product category
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-xs text-[#f0b429] bg-[rgba(240,180,41,0.15)] rounded-md">
                  Pin to Dashboard
                </button>
              </div>
            </div>

            {/* Chart */}
            <div className="p-5 h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={segmentData}
                  margin={{ top: 20, right: 30, bottom: 20, left: 40 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(240,243,246,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="segment"
                    stroke="transparent"
                    fontSize={12}
                    tickLine={false}
                    tick={{ fill: "#9198a1" }}
                    axisLine={{ stroke: "rgba(240,243,246,0.08)" }}
                  />
                  <YAxis
                    stroke="transparent"
                    fontSize={11}
                    tickLine={false}
                    tick={{ fill: "#656d76" }}
                    axisLine={{ stroke: "rgba(240,243,246,0.08)" }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1c2128",
                      border: "1px solid rgba(240,243,246,0.1)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    }}
                    labelStyle={{ color: "#f0f3f6", fontWeight: 500 }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                    iconType="rect"
                    iconSize={10}
                  />
                  <Bar
                    dataKey="software"
                    name="Software"
                    stackId="a"
                    fill="#58a6ff"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="hardware"
                    name="Hardware"
                    stackId="a"
                    fill="#f0b429"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="services"
                    name="Services"
                    stackId="a"
                    fill="#a371f7"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
