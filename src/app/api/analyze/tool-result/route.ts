// src/app/api/analyze/tool-result/route.ts
// Endpoint to receive tool results from browser
// Open source version - no authentication

import { sessionStore } from "@/lib/claude/sessions";
import type { ToolResultRequest } from "@/lib/claude/types";

export async function POST(request: Request) {
  try {
    const body: ToolResultRequest = await request.json();
    const { sessionId, toolId, result, error: toolError } = body;

    if (!sessionId || !toolId) {
      return Response.json(
        { error: "Missing required fields: sessionId and toolId" },
        { status: 400 }
      );
    }

    const session = await sessionStore.get(sessionId);
    if (!session) {
      return Response.json(
        { error: "Session not found or expired" },
        { status: 404 }
      );
    }

    if (!session.awaitingToolResult || session.pendingToolId !== toolId) {
      return Response.json(
        { error: "Not waiting for this tool result" },
        { status: 400 }
      );
    }

    // Store the tool result
    const currentStepIndex = session.stepIndex;
    const stepKey = `step_${currentStepIndex}`;
    session.queryResults[stepKey] = result || [];
    session.stepIndex++;

    // Build result content with step context
    let resultContent: string;
    if (toolError) {
      resultContent = `Error: ${toolError}`;
    } else {
      const truncatedResult = result?.slice(0, 100) || [];
      const rowCount = result?.length || 0;
      resultContent = `[Step ${currentStepIndex} result - ${rowCount} rows${rowCount > 100 ? ' (showing first 100)' : ''}]\n${JSON.stringify(truncatedResult, null, 2)}`;
    }

    // Add tool result to messages
    session.messages.push({
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: toolId,
        content: resultContent,
      }],
    });

    // Clear waiting state so /resume can continue
    session.pendingToolId = null;
    session.awaitingToolResult = false;

    // Save updated session to Redis
    await sessionStore.update(sessionId, session);

    return Response.json({ success: true });

  } catch (error) {
    console.error("Tool result error:", error);
    return Response.json(
      { error: "Failed to process tool result" },
      { status: 500 }
    );
  }
}
