// src/app/api/analyze/route.ts
// SSE streaming endpoint for Claude-powered data analysis
// Open source version - no authentication or rate limiting

import { getAnthropicClient } from "@/lib/claude/client";
import { sessionStore } from "@/lib/claude/sessions";
import { agentTools, needsBrowserExecution } from "@/lib/claude/tools";
import { buildSystemPrompt, buildUserMessage } from "@/lib/claude/prompt";
import {
  CLAUDE_MODELS,
  AGENT_CONFIG,
  THINKING_CONFIG,
  normalizeSchemaContext,
  type SSEEvent,
  type ModelTier,
  type TableInfo,
  type FinalAnswerInput,
  type AnalysisResult,
} from "@/lib/claude/types";
import { sanitizeIdentifier } from "@/lib/duckdb";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 60;

// Validate model selection
function isValidModel(model: string): model is ModelTier {
  return model === "high" || model === "low";
}

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
    sendEvent(controller, encoder, { type: "error", message: "Session not found" });
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

          // Handle final_answer - doesn't need browser execution
          if (toolName === "final_answer") {
            const input = toolInput as unknown as FinalAnswerInput;

            // Get the last step with data for chart
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

              // SECURITY: Validate column exists in the schema
              const targetTable = session.schema.find(t =>
                t.columns.includes(column)
              );
              if (!targetTable) {
                sendEvent(controller, encoder, {
                  type: "error",
                  message: `Column "${column}" not found in any table. Available columns: ${session.schema.flatMap(t => t.columns).slice(0, 20).join(", ")}`
                });
                sendEvent(controller, encoder, { type: "done" });
                return;
              }

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

              // SECURITY: Validate column exists in the schema
              const targetTable = session.schema.find(t =>
                t.columns.includes(column)
              );
              if (!targetTable) {
                sendEvent(controller, encoder, {
                  type: "error",
                  message: `Column "${column}" not found in any table. Available columns: ${session.schema.flatMap(t => t.columns).slice(0, 20).join(", ")}`
                });
                sendEvent(controller, encoder, { type: "done" });
                return;
              }

              const limit = Math.min(Math.max(1, (toolInput.limit as number) || 10), 1000);

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

            // Store state for resume BEFORE sending event (prevents race condition)
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

            // Exit - client will execute tool and call /resume
            return;
          }
        }
      }

      // If we got here with stop_reason === "end_turn" and no tool use, extract answer
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
        tags: { component: "analyze", phase: "claude-api-call" },
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
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const schemaParam = searchParams.get("schema");
    const modelParam = searchParams.get("model") || "low";
    const thinkingParam = searchParams.get("thinking");
    const useThinking = thinkingParam !== "false"; // Default to true

    if (!query || !schemaParam) {
      return Response.json(
        { error: "Missing required parameters: query and schema" },
        { status: 400 }
      );
    }

    let schemaContext: TableInfo[];
    try {
      const parsed = JSON.parse(schemaParam);
      schemaContext = normalizeSchemaContext(parsed);

      // SECURITY: Validate schema size limits to prevent DoS
      const MAX_TABLES = 10;
      const MAX_COLUMNS_PER_TABLE = 100;
      const MAX_SAMPLE_ROWS = 20;

      if (schemaContext.length > MAX_TABLES) {
        return Response.json(
          { error: `Too many tables (max ${MAX_TABLES})` },
          { status: 400 }
        );
      }

      for (const table of schemaContext) {
        if (table.columns.length > MAX_COLUMNS_PER_TABLE) {
          return Response.json(
            { error: `Table "${table.tableName}" has too many columns (max ${MAX_COLUMNS_PER_TABLE})` },
            { status: 400 }
          );
        }
        if (table.sampleRows.length > MAX_SAMPLE_ROWS) {
          // Truncate sample rows instead of rejecting
          table.sampleRows = table.sampleRows.slice(0, MAX_SAMPLE_ROWS);
        }
      }
    } catch {
      return Response.json(
        { error: "Invalid schema parameter" },
        { status: 400 }
      );
    }

    const model = isValidModel(modelParam) ? modelParam : AGENT_CONFIG.defaultModel;

    // Create session
    const sessionId = crypto.randomUUID();
    const session = await sessionStore.create(sessionId, {
      model,
      query,
      schema: schemaContext,
      useThinking,
    });

    // Initialize messages with the user query
    session.messages = [
      {
        role: "user",
        content: buildUserMessage(query, schemaContext),
      },
    ];

    // Save initialized session to Redis
    await sessionStore.update(sessionId, session);

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send session ID first
        sendEvent(controller, encoder, { type: "session", sessionId });

        // Run the agent loop
        await runAgentLoop(sessionId, controller, encoder);

        // Close the stream
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
      tags: { component: "analyze", phase: "request-handler" },
    });
    console.error("Analysis error:", error);
    return Response.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
