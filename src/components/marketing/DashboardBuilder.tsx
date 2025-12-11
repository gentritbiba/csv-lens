"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Pin, RefreshCw, Download, LayoutDashboard, Plus, MoreVertical, TrendingUp } from "lucide-react";

// Revenue trend data
const revenueTrend = [
  { month: "Jan", revenue: 165000 },
  { month: "Feb", revenue: 172000 },
  { month: "Mar", revenue: 189000 },
  { month: "Apr", revenue: 184000 },
  { month: "May", revenue: 201000 },
  { month: "Jun", revenue: 195000 },
  { month: "Jul", revenue: 218000 },
  { month: "Aug", revenue: 227000 },
  { month: "Sep", revenue: 242000 },
  { month: "Oct", revenue: 238000 },
  { month: "Nov", revenue: 265000 },
  { month: "Dec", revenue: 284000 },
];

// Region pie data
const regionData = [
  { name: "North America", value: 45 },
  { name: "Europe", value: 28 },
  { name: "Asia Pacific", value: 18 },
  { name: "Other", value: 9 },
];

// Top products data
const topProducts = [
  { product: "Enterprise Suite", revenue: 428000 },
  { product: "Pro Plan", revenue: 312000 },
  { product: "Team License", revenue: 198000 },
  { product: "Starter Pack", revenue: 145000 },
  { product: "Add-ons", revenue: 89000 },
];

const PIE_COLORS = ["#f0b429", "#58a6ff", "#a371f7", "#3fb950"];

export function DashboardBuilder() {
  return (
    <div className="w-full h-full bg-[#0f1419] flex flex-col overflow-hidden">
      {/* Dashboard Header */}
      <header className="px-6 py-4 border-b border-[rgba(240,243,246,0.08)] flex items-center justify-between bg-[#0f1419] shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[rgba(240,180,41,0.15)] flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-[#f0b429]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#f0f3f6]">My Dashboard</h1>
            <p className="text-xs text-[#656d76]">4 pinned insights • Last updated 2 min ago</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-[#9198a1] hover:text-[#f0f3f6] bg-[#21262d] rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add Card
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0f1419] bg-[#f0b429] hover:bg-[#ffd866] rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-2 gap-5 h-full">
          {/* Card 1: Revenue Trend (Line Chart) */}
          <div className="rounded-xl bg-[#161b22] border border-[rgba(240,243,246,0.08)] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(240,243,246,0.08)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-[#f0b429]" />
                <h3 className="text-sm font-semibold text-[#f0f3f6]">Revenue Trend (12 months)</h3>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-[#21262d] transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-[#656d76]" />
                </button>
                <button className="p-1.5 rounded hover:bg-[#21262d] transition-colors">
                  <MoreVertical className="w-3.5 h-3.5 text-[#656d76]" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f0b429" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f0b429" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,243,246,0.06)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="transparent"
                    fontSize={10}
                    tickLine={false}
                    tick={{ fill: "#656d76" }}
                  />
                  <YAxis
                    stroke="transparent"
                    fontSize={10}
                    tickLine={false}
                    tick={{ fill: "#656d76" }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1c2128",
                      border: "1px solid rgba(240,243,246,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#f0f3f6" }}
                    itemStyle={{ color: "#f0b429" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f0b429"
                    strokeWidth={2.5}
                    dot={{ fill: "#f0b429", r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#f0b429", stroke: "#161b22", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: Revenue by Region (Pie Chart) */}
          <div className="rounded-xl bg-[#161b22] border border-[rgba(240,243,246,0.08)] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(240,243,246,0.08)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-[#f0b429]" />
                <h3 className="text-sm font-semibold text-[#f0f3f6]">Revenue by Region</h3>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-[#21262d] transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-[#656d76]" />
                </button>
                <button className="p-1.5 rounded hover:bg-[#21262d] transition-colors">
                  <MoreVertical className="w-3.5 h-3.5 text-[#656d76]" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionData}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="75%"
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={{ stroke: "#656d76", strokeWidth: 1 }}
                  >
                    {regionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1c2128",
                      border: "1px solid rgba(240,243,246,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#f0f3f6" }}
                    formatter={(value: number) => [`${value}%`, "Share"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3: Total Revenue (Number Card) */}
          <div className="rounded-xl bg-[#161b22] border border-[rgba(240,243,246,0.08)] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(240,243,246,0.08)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-[#f0b429]" />
                <h3 className="text-sm font-semibold text-[#f0f3f6]">Total Revenue</h3>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-[#21262d] transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-[#656d76]" />
                </button>
                <button className="p-1.5 rounded hover:bg-[#21262d] transition-colors">
                  <MoreVertical className="w-3.5 h-3.5 text-[#656d76]" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="text-5xl font-bold text-[#f0f3f6] tracking-tight">$2.4M</div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(63,185,80,0.15)]">
                  <TrendingUp className="w-3.5 h-3.5 text-[#3fb950]" />
                  <span className="text-sm font-semibold text-[#3fb950]">+12%</span>
                </div>
                <span className="text-sm text-[#656d76]">vs last year</span>
              </div>
              <div className="mt-4 text-xs text-[#656d76]">
                Based on 15,832 orders
              </div>
            </div>
          </div>

          {/* Card 4: Top 5 Products (Bar Chart) */}
          <div className="rounded-xl bg-[#161b22] border border-[rgba(240,243,246,0.08)] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(240,243,246,0.08)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-[#f0b429]" />
                <h3 className="text-sm font-semibold text-[#f0f3f6]">Top 5 Products</h3>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-[#21262d] transition-colors">
                  <RefreshCw className="w-3.5 h-3.5 text-[#656d76]" />
                </button>
                <button className="p-1.5 rounded hover:bg-[#21262d] transition-colors">
                  <MoreVertical className="w-3.5 h-3.5 text-[#656d76]" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProducts}
                  layout="vertical"
                  margin={{ top: 5, right: 10, bottom: 5, left: 90 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,243,246,0.06)" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    stroke="transparent"
                    fontSize={10}
                    tickLine={false}
                    tick={{ fill: "#656d76" }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  />
                  <YAxis
                    type="category"
                    dataKey="product"
                    stroke="transparent"
                    fontSize={11}
                    tickLine={false}
                    tick={{ fill: "#9198a1" }}
                    width={85}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1c2128",
                      border: "1px solid rgba(240,243,246,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#f0f3f6" }}
                    itemStyle={{ color: "#58a6ff" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="#58a6ff" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
