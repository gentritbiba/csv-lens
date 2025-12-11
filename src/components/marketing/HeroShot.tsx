"use client";

import { Logo } from "@/components/brand/Logo";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { FileSpreadsheet, Shield, Send, ChevronDown, User } from "lucide-react";

// Sample revenue data for the hero chart
const revenueData = [
  { month: "Jan", revenue: 42000 },
  { month: "Feb", revenue: 38000 },
  { month: "Mar", revenue: 51000 },
  { month: "Apr", revenue: 47000 },
  { month: "May", revenue: 62000 },
  { month: "Jun", revenue: 58000 },
  { month: "Jul", revenue: 71000 },
  { month: "Aug", revenue: 68000 },
  { month: "Sep", revenue: 82000 },
  { month: "Oct", revenue: 79000 },
  { month: "Nov", revenue: 94000 },
  { month: "Dec", revenue: 112000 },
];

// Custom gradient bar colors (gold gradient)
const getBarColor = (index: number) => {
  const colors = [
    "#d4941f", "#d99a22", "#dea025", "#e3a628", "#e8ac2b",
    "#edb22e", "#f0b429", "#f2ba35", "#f4c041", "#f6c64d",
    "#f8cc59", "#fad265",
  ];
  return colors[index % colors.length];
};

const formatRevenue = (value: number) => {
  return `$${(value / 1000).toFixed(0)}K`;
};

export function HeroShot() {
  return (
    <div className="w-full h-full bg-[#0f1419] flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-[rgba(240,243,246,0.08)] px-4 flex items-center justify-between bg-[#0f1419] shrink-0">
        <div className="flex items-center gap-6">
          <Logo size="sm" showText={true} />
          <nav className="hidden md:flex items-center gap-1">
            <button className="px-3 py-1.5 text-sm text-[#f0f3f6] bg-[rgba(240,180,41,0.15)] rounded-md">
              Analysis
            </button>
            <button className="px-3 py-1.5 text-sm text-[#9198a1] hover:text-[#f0f3f6] rounded-md">
              Dashboard
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Privacy Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(63,185,80,0.15)] rounded-full">
            <Shield className="w-3.5 h-3.5 text-[#3fb950]" />
            <span className="text-xs font-medium text-[#3fb950]">Data stays local</span>
          </div>
          <button className="w-8 h-8 rounded-full bg-[#21262d] flex items-center justify-center">
            <User className="w-4 h-4 text-[#9198a1]" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-64 border-r border-[rgba(240,243,246,0.08)] bg-[#0f1419] flex flex-col shrink-0">
          {/* Dataset Section */}
          <div className="p-4 border-b border-[rgba(240,243,246,0.08)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#9198a1] uppercase tracking-wider">
                Datasets
              </span>
              <button className="text-xs text-[#f0b429] hover:text-[#ffd866]">+ Add</button>
            </div>

            {/* Active Dataset */}
            <div className="p-3 rounded-lg bg-[rgba(240,180,41,0.1)] border border-[rgba(240,180,41,0.3)]">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#f0b429]" />
                <span className="text-sm font-medium text-[#f0f3f6]">sales_2024.csv</span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-[#656d76]">
                <span>12,847 rows</span>
                <span>8 columns</span>
              </div>
            </div>
          </div>

          {/* Schema Preview */}
          <div className="p-4 flex-1">
            <span className="text-xs font-semibold text-[#9198a1] uppercase tracking-wider">
              Schema
            </span>
            <div className="mt-3 space-y-2">
              {[
                { name: "date", type: "DATE" },
                { name: "customer_name", type: "VARCHAR" },
                { name: "product", type: "VARCHAR" },
                { name: "revenue", type: "DECIMAL" },
                { name: "quantity", type: "INTEGER" },
                { name: "region", type: "VARCHAR" },
              ].map((col) => (
                <div key={col.name} className="flex items-center justify-between text-xs">
                  <span className="text-[#f0f3f6] font-mono">{col.name}</span>
                  <span className="text-[#656d76] font-mono text-[10px]">{col.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Queries */}
          <div className="p-4 border-t border-[rgba(240,243,246,0.08)]">
            <span className="text-xs font-semibold text-[#9198a1] uppercase tracking-wider">
              Recent
            </span>
            <div className="mt-2 space-y-1">
              <div className="text-xs text-[#656d76] truncate py-1">Revenue by month</div>
              <div className="text-xs text-[#656d76] truncate py-1">Top customers Q4</div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0f1419]">
          {/* Query Input Area */}
          <div className="p-6 border-b border-[rgba(240,243,246,0.08)]">
            <div className="max-w-3xl">
              <div className="relative">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#161b22] border border-[rgba(240,243,246,0.1)] focus-within:border-[rgba(240,180,41,0.5)] focus-within:shadow-[0_0_20px_rgba(240,180,41,0.1)] transition-all">
                  <input
                    type="text"
                    value="Show me revenue by month for 2024"
                    readOnly
                    className="flex-1 bg-transparent text-[#f0f3f6] text-base outline-none placeholder:text-[#656d76]"
                    placeholder="Ask a question about your data..."
                  />
                  <button className="p-2 rounded-lg bg-[#f0b429] hover:bg-[#ffd866] transition-colors">
                    <Send className="w-4 h-4 text-[#0f1419]" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-[#656d76]">Try:</span>
                  <button className="text-xs text-[#58a6ff] hover:underline">"Top 10 customers"</button>
                  <button className="text-xs text-[#58a6ff] hover:underline">"Revenue trend"</button>
                  <button className="text-xs text-[#58a6ff] hover:underline">"Compare regions"</button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl">
              {/* Chart Card */}
              <div className="rounded-xl bg-[#161b22] border border-[rgba(240,243,246,0.08)] overflow-hidden">
                {/* Chart Header */}
                <div className="px-5 py-4 border-b border-[rgba(240,243,246,0.08)] flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#f0f3f6]">Monthly Revenue</h3>
                    <p className="text-xs text-[#656d76] mt-0.5">Revenue trend for 2024</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-xs text-[#9198a1] hover:text-[#f0f3f6] bg-[#21262d] rounded-md flex items-center gap-1">
                      Bar
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button className="px-3 py-1.5 text-xs text-[#f0b429] bg-[rgba(240,180,41,0.15)] rounded-md">
                      Pin to Dashboard
                    </button>
                  </div>
                </div>

                {/* Chart */}
                <div className="p-5 h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <defs>
                        <linearGradient id="heroBarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f0b429" stopOpacity={1} />
                          <stop offset="100%" stopColor="#d4941f" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(240,243,246,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        stroke="transparent"
                        fontSize={11}
                        tickLine={false}
                        tick={{ fill: "#656d76" }}
                        axisLine={{ stroke: "rgba(240,243,246,0.08)" }}
                      />
                      <YAxis
                        stroke="transparent"
                        fontSize={11}
                        tickLine={false}
                        tick={{ fill: "#656d76" }}
                        axisLine={{ stroke: "rgba(240,243,246,0.08)" }}
                        tickFormatter={formatRevenue}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1c2128",
                          border: "1px solid rgba(240,243,246,0.1)",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                        }}
                        labelStyle={{ color: "#f0f3f6", fontWeight: 500 }}
                        itemStyle={{ color: "#f0b429" }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                      />
                      <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={45}>
                        {revenueData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
