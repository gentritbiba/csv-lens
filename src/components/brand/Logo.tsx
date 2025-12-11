// src/components/brand/Logo.tsx
"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 24, text: "text-lg" },
  md: { icon: 32, text: "text-xl" },
  lg: { icon: 40, text: "text-2xl" },
  xl: { icon: 56, text: "text-3xl" },
};

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* CSVLens Logo - Magnifying glass with CSV data grid visible through it */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Lens glass - the main circle */}
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="url(#glass-fill)"
          stroke="url(#lens-stroke)"
          strokeWidth="2.5"
        />

        {/* Data grid inside the lens - what we're "looking at" */}
        {/* Horizontal lines */}
        <line x1="8" y1="14" x2="32" y2="14" stroke="#58a6ff" strokeWidth="1.5" opacity="0.5" />
        <line x1="8" y1="20" x2="32" y2="20" stroke="#58a6ff" strokeWidth="1.5" opacity="0.7" />
        <line x1="8" y1="26" x2="32" y2="26" stroke="#58a6ff" strokeWidth="1.5" opacity="0.5" />

        {/* Vertical lines */}
        <line x1="14" y1="8" x2="14" y2="32" stroke="#58a6ff" strokeWidth="1.5" opacity="0.4" />
        <line x1="20" y1="8" x2="20" y2="32" stroke="#58a6ff" strokeWidth="1.5" opacity="0.6" />
        <line x1="26" y1="8" x2="26" y2="32" stroke="#58a6ff" strokeWidth="1.5" opacity="0.4" />

        {/* Data points at intersections - highlighted cells */}
        <circle cx="14" cy="14" r="2" fill="#f0b429" />
        <circle cx="20" cy="20" r="2.5" fill="#f0b429" />
        <circle cx="26" cy="14" r="2" fill="#a371f7" />
        <circle cx="14" cy="26" r="2" fill="#a371f7" />
        <circle cx="26" cy="26" r="2" fill="#58a6ff" />

        {/* Handle of the magnifying glass */}
        <line
          x1="32"
          y1="32"
          x2="44"
          y2="44"
          stroke="url(#handle-gradient)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Lens reflection/glare */}
        <path
          d="M10 12 Q12 10, 16 11"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.3"
        />

        {/* Gradient definitions */}
        <defs>
          <radialGradient id="glass-fill" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#1c2128" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0f1419" stopOpacity="0.95" />
          </radialGradient>

          <linearGradient id="lens-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0b429" />
            <stop offset="50%" stopColor="#58a6ff" />
            <stop offset="100%" stopColor="#a371f7" />
          </linearGradient>

          <linearGradient id="handle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#58a6ff" />
            <stop offset="100%" stopColor="#a371f7" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark */}
      {showText && (
        <span className={`font-semibold tracking-tight ${text}`} style={{ color: '#f0f3f6' }}>
          CSV<span style={{ color: '#f0b429' }}>Lens</span>
        </span>
      )}
    </div>
  );
}

// Standalone icon for favicon/app icon usage
export function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Lens glass */}
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="url(#glass-fill-icon)"
        stroke="url(#lens-stroke-icon)"
        strokeWidth="2.5"
      />

      {/* Data grid */}
      <line x1="8" y1="14" x2="32" y2="14" stroke="#58a6ff" strokeWidth="1.5" opacity="0.5" />
      <line x1="8" y1="20" x2="32" y2="20" stroke="#58a6ff" strokeWidth="1.5" opacity="0.7" />
      <line x1="8" y1="26" x2="32" y2="26" stroke="#58a6ff" strokeWidth="1.5" opacity="0.5" />
      <line x1="14" y1="8" x2="14" y2="32" stroke="#58a6ff" strokeWidth="1.5" opacity="0.4" />
      <line x1="20" y1="8" x2="20" y2="32" stroke="#58a6ff" strokeWidth="1.5" opacity="0.6" />
      <line x1="26" y1="8" x2="26" y2="32" stroke="#58a6ff" strokeWidth="1.5" opacity="0.4" />

      {/* Data points */}
      <circle cx="14" cy="14" r="2" fill="#f0b429" />
      <circle cx="20" cy="20" r="2.5" fill="#f0b429" />
      <circle cx="26" cy="14" r="2" fill="#a371f7" />
      <circle cx="14" cy="26" r="2" fill="#a371f7" />
      <circle cx="26" cy="26" r="2" fill="#58a6ff" />

      {/* Handle */}
      <line
        x1="32"
        y1="32"
        x2="44"
        y2="44"
        stroke="url(#handle-gradient-icon)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Glare */}
      <path
        d="M10 12 Q12 10, 16 11"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.3"
      />

      <defs>
        <radialGradient id="glass-fill-icon" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#1c2128" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0f1419" stopOpacity="0.95" />
        </radialGradient>
        <linearGradient id="lens-stroke-icon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0b429" />
          <stop offset="50%" stopColor="#58a6ff" />
          <stop offset="100%" stopColor="#a371f7" />
        </linearGradient>
        <linearGradient id="handle-gradient-icon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#58a6ff" />
          <stop offset="100%" stopColor="#a371f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}
