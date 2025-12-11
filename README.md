# CSV Lens

An open source, privacy-first CSV analysis tool powered by AI. Your data never leaves your browser.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Zero Upload** - CSV files are processed entirely in your browser using DuckDB-WASM
- **Natural Language Queries** - Ask questions in plain English, get SQL-powered answers
- **AI-Powered Analysis** - Claude generates and executes queries to answer your questions
- **Auto Visualizations** - Charts are automatically generated based on your data
- **Multi-File Support** - Load up to 5 CSV files and analyze them together
- **100% Private** - Your data stays local; only schema metadata is sent to the AI

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 18+)
- [Anthropic API Key](https://console.anthropic.com/)
- [Upstash Redis](https://upstash.com/) account (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/csv-lens.git
cd csv-lens

# Install dependencies
bun install

# Copy environment template
cp .env.example .env.local
```

### Configuration

Edit `.env.local` with your credentials:

```bash
# Required - Anthropic API for AI analysis
ANTHROPIC_API_KEY=sk-ant-...

# Required - Upstash Redis for session storage
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Run

```bash
# Development
bun run dev

# Production build
bun run build
bun run start
```

Open [http://localhost:3000](http://localhost:3000) and drop a CSV file to get started.

## How It Works

1. **Drop a CSV** - File is loaded into DuckDB running in your browser
2. **Ask a question** - Type naturally: "What are the top 10 products by revenue?"
3. **AI analyzes** - Claude receives your schema (not your data) and generates SQL
4. **Local execution** - Queries run in your browser via DuckDB-WASM
5. **Get results** - See answers with auto-generated charts

### What's Sent to the AI?

Only metadata is sent to Claude:
- Table names and column names
- Column data types
- A few sample rows (for context)

Your actual data never leaves your browser.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Local SQL**: DuckDB-WASM
- **AI**: Claude (Anthropic SDK)
- **Streaming**: Server-Sent Events (SSE)
- **Charts**: Recharts
- **Styling**: Tailwind CSS
- **Sessions**: Upstash Redis

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main application
│   └── api/
│       ├── analyze/          # AI analysis endpoints
│       │   ├── route.ts      # Start analysis (SSE stream)
│       │   ├── resume/       # Resume interrupted sessions
│       │   └── tool-result/  # Receive tool execution results
│       └── profile/          # Data profiling queries
├── components/
│   ├── AnalysisCard.tsx      # Result display with charts
│   ├── WorkspaceLayout.tsx   # Main layout
│   └── tabs/                 # Chat, Profile, Dashboard tabs
├── hooks/
│   ├── useAnalysis.ts        # Analysis state management
│   ├── useDuckDB.ts          # DuckDB-WASM integration
│   └── useWorkspace.ts       # File management
├── lib/
│   ├── claude/               # Claude API integration
│   │   ├── client.ts         # Anthropic client
│   │   ├── tools.ts          # Tool definitions
│   │   └── sessions.ts       # Redis session store
│   └── duckdb/               # DuckDB utilities
└── types/                    # TypeScript definitions
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | GET | Start analysis (SSE stream) |
| `/api/analyze/resume` | GET | Resume interrupted session |
| `/api/analyze/tool-result` | POST | Submit tool execution results |
| `/api/profile` | POST | Generate profiling queries |

## Self-Hosting

### Docker

```dockerfile
FROM oven/bun:1 as builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token |
| `SENTRY_DSN` | No | Sentry error tracking |

## Development

```bash
# Run tests
bun test

# Run tests with UI
bun run test:ui

# Lint
bun run lint

# Type check
bunx tsc --noEmit
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [DuckDB](https://duckdb.org/) - Fast in-process SQL database
- [Anthropic](https://anthropic.com/) - Claude AI
- [Upstash](https://upstash.com/) - Serverless Redis
