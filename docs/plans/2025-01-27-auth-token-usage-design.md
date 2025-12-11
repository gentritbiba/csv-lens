# Authentication & Token Usage System Design

## Overview

Add WorkOS authentication and token-based usage limits to monetize the AI Data Analyzer app.

## Tech Stack

- **Auth**: WorkOS AuthKit (Email/Password, Google OAuth, GitHub OAuth)
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Sessions**: iron-session (encrypted cookies)

## Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| workosId | string | unique, WorkOS user ID |
| email | string | unique |
| name | string | nullable |
| avatarUrl | string | nullable |
| tier | enum('free', 'pro') | default 'free' |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### subscriptions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users |
| tier | enum('free', 'pro') | |
| status | enum('active', 'canceled', 'past_due') | |
| currentPeriodStart | timestamp | billing cycle start |
| currentPeriodEnd | timestamp | billing cycle end |
| stripeCustomerId | string | nullable, for future Stripe |
| stripeSubscriptionId | string | nullable |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### token_usage
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users |
| periodStart | timestamp | matches subscription period |
| periodEnd | timestamp | |
| tokensUsed | integer | default 0 |
| tokenLimit | integer | 50000 free, 1000000 pro |
| updatedAt | timestamp | |

### usage_logs
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| userId | uuid | FK → users |
| tokensUsed | integer | |
| endpoint | string | which API was called |
| model | string | which AI model |
| createdAt | timestamp | |

## Tier Limits

| Tier | Monthly Tokens | Price |
|------|---------------|-------|
| Free | 50,000 | $0 |
| Pro | 1,000,000 | TBD |

- Limits reset on billing cycle (signup anniversary)
- Hard block when limit reached
- 90% warning in UI (future enhancement)

## Authentication Flow

1. User clicks "Sign in" → redirects to WorkOS hosted auth
2. User authenticates (email/password, Google, or GitHub)
3. WorkOS redirects to `/api/auth/callback` with code
4. Exchange code for user profile
5. Upsert user in database
6. Create session cookie
7. Redirect to app

### New User Setup
- Create user record
- Create free subscription (period: now → now + 30 days)
- Create token_usage record (0 used, 50K limit)

## Route Protection

| Route | Access |
|-------|--------|
| `/` | Public landing (or redirect if logged in) |
| `/app/*` | Protected |
| `/api/analyze` | Protected + token limit check |
| `/api/generate-sql` | Protected + token limit check |
| `/api/auth/*` | Public |

## Token Usage Enforcement

On each API request:
1. Extract userId from session
2. Query token_usage for current period
3. If periodEnd < now → reset period (new cycle)
4. If tokensUsed >= tokenLimit → return 429
5. Execute AI call, count tokens
6. Update token_usage.tokensUsed
7. Insert usage_logs row
8. Return response with headers:
   - `X-Token-Limit`
   - `X-Tokens-Used`
   - `X-Tokens-Remaining`

## File Structure

```
src/
├── lib/
│   └── db/
│       ├── index.ts          # Drizzle client
│       ├── schema.ts         # Table definitions
│       └── migrate.ts        # Migration runner
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/route.ts
│   │       ├── callback/route.ts
│   │       ├── logout/route.ts
│   │       └── me/route.ts
│   └── (protected)/
│       └── app/
│           └── page.tsx
├── middleware.ts
└── hooks/
    └── useUser.ts

drizzle.config.ts
```

## Dependencies

- drizzle-orm
- drizzle-kit
- @neondatabase/serverless
- @workos-inc/node
- iron-session
