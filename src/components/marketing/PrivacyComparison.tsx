"use client";

import { AlertCircle, CheckCircle2, Cloud, Lock, Upload, Zap, Shield, Server, Eye, EyeOff } from "lucide-react";

export function PrivacyComparison() {
  return (
    <div className="w-full h-full bg-[#0f1419] flex flex-col items-center justify-center p-12 relative overflow-hidden">
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(240, 180, 41, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(240, 180, 41, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Header */}
      <div className="text-center mb-12 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(240,180,41,0.1)] border border-[rgba(240,180,41,0.2)] mb-6">
          <Shield className="w-4 h-4 text-[#f0b429]" />
          <span className="text-sm font-medium text-[#f0b429]">Privacy by Design</span>
        </div>
        <h1 className="text-4xl font-bold text-[#f0f3f6] mb-3">
          Your data <span className="text-[#f0b429]">never leaves</span> your browser
        </h1>
        <p className="text-lg text-[#9198a1] max-w-xl">
          Unlike cloud tools that require uploading, CSVLens processes everything locally
        </p>
      </div>

      {/* Comparison Cards */}
      <div className="flex gap-8 relative z-10 w-full max-w-5xl">
        {/* Other Tools Card */}
        <div className="flex-1 rounded-2xl bg-[#161b22] border border-[rgba(248,81,73,0.3)] p-8 relative overflow-hidden">
          {/* Red glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#f85149] opacity-[0.05] blur-[60px] rounded-full" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[rgba(248,81,73,0.15)] flex items-center justify-center">
              <Cloud className="w-5 h-5 text-[#f85149]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#f0f3f6]">Other Tools</h3>
              <p className="text-xs text-[#656d76]">Cloud-based analytics</p>
            </div>
          </div>

          {/* Upload Progress */}
          <div className="rounded-xl bg-[#0f1419] border border-[rgba(240,243,246,0.08)] p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#f85149]" />
                <span className="text-sm font-medium text-[#f0f3f6]">Uploading to cloud...</span>
              </div>
              <span className="text-xs text-[#656d76] font-mono">47%</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-[#21262d] rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#f85149] to-[#ff7b72]"
                style={{ width: "47%" }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9198a1]">sales_data_2024.csv (250 MB)</span>
              <span className="text-[#f85149]">~8 minutes remaining</span>
            </div>
          </div>

          {/* Warning List */}
          <div className="space-y-3">
            {[
              { icon: Server, text: "Data stored on external servers" },
              { icon: Eye, text: "Third parties can access your data" },
              { icon: AlertCircle, text: "Compliance risks (GDPR, HIPAA)" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[rgba(248,81,73,0.15)] flex items-center justify-center shrink-0">
                  <item.icon className="w-3.5 h-3.5 text-[#f85149]" />
                </div>
                <span className="text-sm text-[#9198a1]">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* VS Divider */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#21262d] border border-[rgba(240,243,246,0.1)] flex items-center justify-center">
            <span className="text-sm font-bold text-[#656d76]">VS</span>
          </div>
        </div>

        {/* CSVLens Card */}
        <div className="flex-1 rounded-2xl bg-[#161b22] border border-[rgba(63,185,80,0.3)] p-8 relative overflow-hidden">
          {/* Green glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#3fb950] opacity-[0.08] blur-[60px] rounded-full" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[rgba(63,185,80,0.15)] flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#3fb950]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#f0f3f6]">CSVLens</h3>
              <p className="text-xs text-[#656d76]">100% browser-based</p>
            </div>
          </div>

          {/* Instant Load */}
          <div className="rounded-xl bg-[#0f1419] border border-[rgba(63,185,80,0.2)] p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#3fb950]" />
                <span className="text-sm font-medium text-[#f0f3f6]">Loaded instantly</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#f0b429]" />
                <span className="text-xs text-[#f0b429] font-mono font-semibold">1.2s</span>
              </div>
            </div>

            {/* Progress bar - complete */}
            <div className="h-2 bg-[#21262d] rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3fb950] to-[#56d364]"
                style={{ width: "100%" }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9198a1]">sales_data_2024.csv (250 MB)</span>
              <span className="text-[#3fb950]">Ready to analyze</span>
            </div>
          </div>

          {/* Benefits List */}
          <div className="space-y-3">
            {[
              { icon: EyeOff, text: "Data never leaves your computer" },
              { icon: Shield, text: "Zero server storage, zero risk" },
              { icon: CheckCircle2, text: "Fully GDPR & HIPAA compliant" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[rgba(63,185,80,0.15)] flex items-center justify-center shrink-0">
                  <item.icon className="w-3.5 h-3.5 text-[#3fb950]" />
                </div>
                <span className="text-sm text-[#f0f3f6]">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Banner */}
      <div className="mt-12 px-6 py-4 rounded-xl bg-[#161b22] border border-[rgba(240,243,246,0.08)] flex items-center gap-4 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-[rgba(88,166,255,0.15)] flex items-center justify-center">
          <svg className="w-4 h-4 text-[#58a6ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-[#f0f3f6]">
            <span className="font-semibold">Powered by DuckDB WASM</span>
            <span className="text-[#9198a1]"> — SQL runs entirely client-side via WebAssembly</span>
          </p>
        </div>
      </div>
    </div>
  );
}
