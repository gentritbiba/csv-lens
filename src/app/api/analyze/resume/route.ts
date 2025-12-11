// src/app/api/analyze/resume/route.ts
// SSE endpoint to resume analysis after tool execution
// Open source version - no authentication

import { getAnthropicClient } from "@/lib/claude/client";
import { sessionStore } from "@/lib/claude/sessions";
import { agentTools, needsBrowserExecution } from "@/lib/claude/tools";
import { buildSystemPrompt } from "@/lib/claude/prompt";
import {
  CLAUDE_MODELS,
  AGENT_CONFIG,
  THINKING_CONFIG,
  type SSEEvent,
  type FinalAnswerInput,
  type AnalysisResult,
} from "@/lib/claude/types";
import { sanitizeIdentifier } from "@/lib/duckdb";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 60;

// Send SSE event
function sendEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: SSEEvent
): void {
  try {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    controller.enqueue(encoder.encode(data));
  } catch {
    // Controller may be closed
  }
}

// Run the agent loop
async function runAgentLoop(
  sessionId: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
): Promise<void> {
  const session = await sessionStore.get(sessionId);
  if (!session) {
    sendEvent(controller, encoder, { type: "error", message: "Session not found or expired" });
    sendEvent(controller, encoder, { type: "done" });
    return;
  }

  const client = getAnthropicClient();
  const modelConfig = CLAUDE_MODELS[session.model];
  const modelId = modelConfig.modelId;
  // Only use thinking if model supports it AND user enabled it
  const useThinking = modelConfig.supportsThinking && session.useThinking;

  while (session.iteration < AGENT_CONFIG.maxIterations) {
    session.iteration++;

    try {
      // Build request with thinking support if available
      const maxTokens = useThinking ? THINKING_CONFIG.maxTokensWithThinking : 4096;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestParams: any = {
        model: modelId,
        max_tokens: maxTokens,
        system: buildSystemPrompt(session.schema),
        messages: session.messages,
        tools: agentTools,
      };

      // Add thinking parameter for supported models
      if (useThinking) {
        requestParams.thinking = {
          type: "enabled",
          budget_tokens: THINKING_CONFIG.budgetTokens,
        };
      }

      const response = await client.messages.create(requestParams);

      // Process response blocks
      for (const block of response.content) {
        // Handle extended thinking blocks (internal reasoning)
        if (block.type === "thinking") {
          const thinkingBlock = block as { type: "thinking"; thinking: string };
          if (thinkingBlock.thinking) {
            sendEvent(controller, encoder, { type: "extended_thinking", content: thinkingBlock.thinking });
          }
        }

        // Handle regular text blocks
        if (block.type === "text" && block.text) {
          sendEvent(controller, encoder, { type: "thinking", content: block.text });
        }

        if (block.type === "tool_use") {
          const toolName = block.name;
          const toolInput = block.input as Record<string, unknown>;

          // Handle final_answer
          if (toolName === "final_answer") {
            const input = toolInput as unknown as FinalAnswerInput;

            const stepKeys = Object.keys(session.queryResults).sort();
            const lastStepKey = stepKeys[stepKeys.length - 1];
            const chartData = lastStepKey ? session.queryResults[lastStepKey] || [] : [];

            const result: AnalysisResult = {
              answer: input.answer,
              chartType: input.chartType,
              chartData,
              xAxis: input.xAxis,
              yAxis: input.yAxis,
              steps: [],
            };

            sendEvent(controller, encoder, { type: "answer", result });
            sendEvent(controller, encoder, { type: "done" });
            await sessionStore.delete(sessionId);
            return;
          }

          // For browser-executed tools, send tool_call and exit
          if (needsBrowserExecution(toolName)) {
            let processedInput = toolInput;

            if (toolName === "get_column_stats") {
              const column = sanitizeIdentifier(toolInput.column as string);
              if (!column) {
                sendEvent(controller, encoder, { type: "error", message: "Invalid column name" });
                sendEvent(controller, encoder, { type: "done" });
                return;
              }
              const targetTable = session.schema.find(t =>
                t.columns.includes(column)
              ) || session.schema[0];

              processedInput = {
                thought: toolInput.thought,
                sql: `SELECT
                  MIN("${column}") as min_value,
                  MAX("${column}") as max_value,
                  AVG(TRY_CAST("${column}" AS DOUBLE)) as avg_value,
                  COUNT(DISTINCT "${column}") as distinct_count,
                  COUNT(*) - COUNT("${column}") as null_count
                FROM "${targetTable.tableName}"`,
                _originalTool: "get_column_stats",
              };
            } else if (toolName === "get_value_distribution") {
              const column = sanitizeIdentifier(toolInput.column as string);
              if (!column) {
                sendEvent(controller, encoder, { type: "error", message: "Invalid column name" });
                sendEvent(controller, encoder, { type: "done" });
                return;
              }
              const limit = Math.min(Math.max(1, (toolInput.limit as number) || 10), 1000);
              const targetTable = session.schema.find(t =>
                t.columns.includes(column)
              ) || session.schema[0];

              processedInput = {
                thought: toolInput.thought,
                sql: `SELECT "${column}" as value, COUNT(*) as count
                  FROM "${targetTable.tableName}"
                  GROUP BY "${column}"
                  ORDER BY count DESC
                  LIMIT ${limit}`,
                _originalTool: "get_value_distribution",
              };
            }

            // Store state for next resume BEFORE sending event (prevents race condition)
            session.pendingToolId = block.id;
            session.awaitingToolResult = true;
            session.messages.push({
              role: "assistant",
              content: response.content,
            });

            // Save session state to Redis FIRST
            await sessionStore.update(sessionId, session);

            // NOW send the event - client can safely proceed
            sendEvent(controller, encoder, {
              type: "tool_call",
              id: block.id,
              name: toolName,
              input: processedInput,
            });

            // Exit - client will execute tool and call /resume again
            return;
          }
        }
      }

      // Handle end_turn without tool use
      if (response.stop_reason === "end_turn") {
        const textBlock = response.content.find(b => b.type === "text");
        if (textBlock && textBlock.type === "text") {
          const result: AnalysisResult = {
            answer: textBlock.text,
            chartType: "table",
            chartData: [],
            steps: [],
          };
          sendEvent(controller, encoder, { type: "answer", result });
        } else {
          sendEvent(controller, encoder, {
            type: "error",
            message: "Analysis completed without a clear answer"
          });
        }
        sendEvent(controller, encoder, { type: "done" });
        await sessionStore.delete(sessionId);
        return;
      }

    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "analyze-resume", phase: "claude-api-call" },
        extra: { sessionId, model: session.model, iteration: session.iteration },
      });
      console.error("Claude API error:", error);
      const errorMsg = error instanceof Error ? error.message : "Analysis failed";
      sendEvent(controller, encoder, { type: "error", message: errorMsg });
      sendEvent(controller, encoder, { type: "done" });
      await sessionStore.delete(sessionId);
      return;
    }
  }

  // Max iterations reached
  sendEvent(controller, encoder, {
    type: "error",
    message: "Maximum analysis iterations reached"
  });
  sendEvent(controller, encoder, { type: "done" });
  await sessionStore.delete(sessionId);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return Response.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const session = await sessionStore.get(sessionId);
    if (!session) {
      return Response.json({ error: "Session not found or expired" }, { status: 404 });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        await runAgentLoop(sessionId, controller, encoder);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: "analyze-resume", phase: "request-handler" },
    });
    console.error("Resume error:", error);
    return Response.json({ error: "Failed to resume analysis" }, { status: 500 });
  }
}
