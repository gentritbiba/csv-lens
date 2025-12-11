import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/Providers";
import "./globals.css";

// Primary font - clean, modern sans-serif with distinctive character
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Monospace font for data display
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://csvlens.app"),
  title: {
    default: "CSVLens - Free AI CSV Analyzer | Large CSVs Load in Seconds",
    template: "%s | CSVLens",
  },
  description: "Free AI CSV analyzer with no file upload. Load massive CSVs in seconds—not hours. Ask questions in plain English, get instant charts. 100% private—data never leaves your browser.",
  keywords: [
    "CSV analyzer",
    "CSV viewer online",
    "analyze CSV file",
    "CSV to chart",
    "AI data analysis",
    "natural language SQL",
    "data visualization tool",
    "free CSV tool",
    "browser-based data analysis",
    "privacy-first analytics",
    "DuckDB",
    "spreadsheet alternative",
    "analyze spreadsheet without Excel",
    "CSV analysis tool",
    "no-code data analysis",
    "AI spreadsheet analyzer",
    "free data visualization",
    "CSV chart maker",
    "ask questions about data",
    "natural language data query",
    "fast CSV loading",
    "no file upload",
    "large CSV files",
    "instant CSV analysis",
  ],
  authors: [{ name: "CSVLens" }],
  creator: "CSVLens",
  publisher: "CSVLens",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "CSVLens - Free AI CSV Analyzer | Large CSVs in Seconds",
    description: "No file upload—load massive CSVs in seconds, not hours. Ask questions in plain English, get instant charts. 100% private—data never leaves your browser.",
    type: "website",
    locale: "en_US",
    siteName: "CSVLens",
  },
  twitter: {
    card: "summary_large_image",
    title: "CSVLens - Free AI CSV Analyzer | No Upload Required",
    description: "No file upload—large CSVs load in seconds. Ask questions → Get charts. 100% private & free.",
    creator: "@csvlens",
  },
  alternates: {
    canonical: "https://csvlens.app",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17791804873"
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17791804873');
          `}
        </Script>
      </head>
      <body className="font-sans min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
