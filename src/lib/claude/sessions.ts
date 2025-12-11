// src/lib/claude/sessions.ts
// Redis-backed session store for Claude conversations
// Sessions persist across page refreshes and server restarts

import { Redis } from "@upstash/redis";
import type { Session, TableInfo } from "./types";
import { AGENT_CONFIG } from "./types";
import type { ModelTier } from "@/models";
import * as Sentry from "@sentry/nextjs";

// Lazy Redis initialization
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

// Session key prefix
const SESSION_PREFIX = "claude:session:";

// TTL in seconds (5 minutes)
const SESSION_TTL = Math.floor(AGENT_CONFIG.sessionTimeoutMs / 1000);

function sessionKey(id: string): string {
  return `${SESSION_PREFIX}${id}`;
}

export const sessionStore = {
  async create(
    id: string,
    options: {
      model: ModelTier;
      query: string;
      schema: TableInfo[];
      useThinking?: boolean;
    }
  ): Promise<Session> {
    const session: Session = {
      id,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      model: options.model,
      query: options.query,
      schema: options.schema,
      messages: [],
      queryResults: {},
      stepIndex: 0,
      iteration: 0,
      pendingToolId: null,
      awaitingToolResult: false,
      useThinking: options.useThinking !== false, // Default to true
    };

    try {
      const client = getRedis();
      await client.set(sessionKey(id), JSON.stringify(session), { ex: SESSION_TTL });
      console.log(`[Sessions] Created session ${id} in Redis (TTL: ${SESSION_TTL}s)`);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "redis-session", operation: "create" },
        extra: { sessionId: id },
      });
      throw error;
    }
    return session;
  },

  async get(id: string): Promise<Session | undefined> {
    try {
      const client = getRedis();
      const data = await client.get<string>(sessionKey(id));

      if (!data) {
        console.log(`[Sessions] Session ${id} not found in Redis`);
        return undefined;
      }

      const session: Session = typeof data === 'string' ? JSON.parse(data) : data;

      // Update lastActivity and refresh TTL
      session.lastActivity = Date.now();
      await client.set(sessionKey(id), JSON.stringify(session), { ex: SESSION_TTL });

      return session;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "redis-session", operation: "get" },
        extra: { sessionId: id },
      });
      throw error;
    }
  },

  async update(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    try {
      const session = await this.get(id);
      if (!session) {
        return undefined;
      }

      Object.assign(session, updates);
      session.lastActivity = Date.now();

      const client = getRedis();
      await client.set(sessionKey(id), JSON.stringify(session), { ex: SESSION_TTL });

      return session;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "redis-session", operation: "update" },
        extra: { sessionId: id },
      });
      throw error;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const client = getRedis();
      const result = await client.del(sessionKey(id));
      return result > 0;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "redis-session", operation: "delete" },
        extra: { sessionId: id },
      });
      throw error;
    }
  },

  // For debugging/monitoring
  async count(): Promise<number> {
    const client = getRedis();
    const keys = await client.keys(`${SESSION_PREFIX}*`);
    return keys.length;
  },

  // No-op for backwards compatibility (Redis handles TTL automatically)
  stopCleanup(): void {
    // Redis TTL handles expiration automatically
  },
};
