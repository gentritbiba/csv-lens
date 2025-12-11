// src/lib/claude/client.ts
// Anthropic client singleton

import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

// For testing - allows resetting the client
export function resetClient(): void {
  client = null;
}
