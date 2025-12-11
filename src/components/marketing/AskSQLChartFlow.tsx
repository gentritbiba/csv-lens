"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MessageSquare, Code2, BarChart3, ArrowRight, Sparkles } from "lucide-react";

// Top customers data
const customersData = [
  { customer: "Acme Corp", total: 284500 },
  { customer: "TechStart Inc", total: 231200 },
  { customer: "Global Systems", total: 198700 },
  { customer: "DataFlow Ltd", total: 176400 },
  { customer: "CloudNine", total: 154800 },
  { customer: "Nexus Group", total: 142300 },
  { customer: "Velocity Labs", total: 128900 },
  { customer: "Quantum Co", total: 115600 },
  { customer: "Summit Tech", total: 98400 },
  { customer: "Pioneer Inc", total: 87200 },
];

const sqlCode = `SELECT customer_name,
       SUM(amount) as total
FROM sales
WHERE date >= '2024-07-01'
GROUP BY customer_name
ORDER BY total DESC
LIMIT 10`;

export function AskSQLChartFlow() {
  return (
    <div className="w-full h-full bg-[#0f1419] flex flex-col items-center justify-center p-12 relative overflow-hidden">
      {/* Subtle background dots */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle, #f0b429 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Header */}
      <div className="text-center mb-10 relative z-10">
        <h1 className="text-3xl font-bold text-[#f0f3f6] mb-2">
          From Question to Insight in <span className="text-[#f0b429]">Seconds</span>
        </h1>
        <p className="text-base text-[#9198a1]">
          Ask in plain English. Get real SQL. See instant charts.
        </p>
      </div>

      {/* Three Panel Flow */}
      <div className="flex items-stretch gap-6 relative z-10 w-full max-w-6xl">
        {/* Panel 1: Ask */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(88,166,255,0.15)] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[#58a6ff]" />
            </div>
            <span className="text-sm font-semibold text-[#58a6ff] uppercase tracking-wider">1. Ask</span>
          </div>

          <div className="flex-1 rounded-xl bg-[#161b22] border border-[rgba(88,166,255,0.3)] p-6 relative">
            <div className="absolute top-0 left-0 w-32 h-32 bg-[#58a6ff] opacity-[0.05] blur-[40px] rounded-full" />

            <p className="text-sm text-[#656d76] mb-3">Your question:</p>
            <div className="p-4 rounded-lg bg-[#0f1419] border border-[rgba(240,243,246,0.1)]">
              <p className="text-base text-[#f0f3f6] leading-relaxed">
                "Which customers spent the most last quarter?"
              </p>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-[#656d76]">
              <span className="px-2 py-1 rounded bg-[#21262d]">Natural language</span>
              <span className="px-2 py-1 rounded bg-[#21262d]">No SQL needed</span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-[#21262d] border border-[rgba(240,243,246,0.1)] flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-[#656d76]" />
          </div>
        </div>

        {/* Panel 2: AI Generates SQL */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(163,113,247,0.15)] flex items-center justify-center">
              <Code2 className="w-4 h-4 text-[#a371f7]" />
            </div>
            <span className="text-sm font-semibold text-[#a371f7] uppercase tracking-wider">2. AI Generates SQL</span>
          </div>

          <div className="flex-1 rounded-xl bg-[#161b22] border border-[rgba(163,113,247,0.3)] p-6 relative">
            <div className="absolute top-0 left-0 w-32 h-32 bg-[#a371f7] opacity-[0.05] blur-[40px] rounded-full" />

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-[#656d76]">Generated query:</p>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[rgba(163,113,247,0.1)]">
                <Sparkles className="w-3 h-3 text-[#a371f7]" />
                <span className="text-xs text-[#a371f7]">Claude AI</span>
              </div>
            </div>

            <div className="rounded-lg bg-[#0f1419] border border-[rgba(240,243,246,0.1)] overflow-hidden">
              <pre className="p-4 text-sm font-mono text-[#f0f3f6] overflow-x-auto">
                <code>
                  <span className="text-[#58a6ff]">SELECT</span> customer_name,{"\n"}
                  {"       "}<span className="text-[#f0b429]">SUM</span>(amount) <span className="text-[#58a6ff]">as</span> total{"\n"}
                  <span className="text-[#58a6ff]">FROM</span> sales{"\n"}
                  <span className="text-[#58a6ff]">WHERE</span> date {">"}= <span className="text-[#3fb950]">'2024-07-01'</span>{"\n"}
                  <span className="text-[#58a6ff]">GROUP BY</span> customer_name{"\n"}
                  <span className="text-[#58a6ff]">ORDER BY</span> total <span className="text-[#f85149]">DESC</span>{"\n"}
                  <span className="text-[#58a6ff]">LIMIT</span> <span className="text-[#f0b429]">10</span>
                </code>
              </pre>
            </div>

            <p className="mt-3 text-xs text-[#656d76]">
              Runs locally via DuckDB WASM
            </p>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-[#21262d] border border-[rgba(240,243,246,0.1)] flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-[#656d76]" />
          </div>
        </div>

        {/* Panel 3: Get Insights */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(240,180,41,0.15)] flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[#f0b429]" />
            </div>
            <span className="text-sm font-semibold text-[#f0b429] uppercase tracking-wider">3. Get Insights</span>
          </div>

          <div className="flex-1 rounded-xl bg-[#161b22] border border-[rgba(240,180,41,0.3)] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#f0b429] opacity-[0.05] blur-[40px] rounded-full" />

            <p className="text-sm text-[#656d76] mb-3">Top 10 Customers by Revenue</p>

            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={customersData}
                  layout="vertical"
                  margin={{ top: 0, right: 10, bottom: 0, left: 80 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(240,243,246,0.06)"
                    horizontal={true}
                    vertical={false}
                  />
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
                    dataKey="customer"
                    stroke="transparent"
                    fontSize={10}
                    tickLine={false}
                    tick={{ fill: "#9198a1" }}
                    width={75}
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
                  <Bar
                    dataKey="total"
                    fill="url(#flowBarGradient)"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  />
                  <defs>
                    <linearGradient id="flowBarGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#d4941f" />
                      <stop offset="100%" stopColor="#f0b429" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Note */}
      <div className="mt-8 text-center relative z-10">
        <p className="text-sm text-[#656d76]">
          AI understands your schema and picks the optimal visualization automatically
        </p>
      </div>
    </div>
  );
}
