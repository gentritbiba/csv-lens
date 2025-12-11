// src/__tests__/utils/sse-parser.ts
// Utility functions for parsing and creating SSE streams in tests

import type { SSEEvent } from '@/lib/claude/types'

/**
 * Parse an SSE stream response into an array of events
 *
 * @param response - The Response object with SSE stream body
 * @returns Promise resolving to array of parsed SSE events
 */
export async function collectSSEEvents(response: Response): Promise<SSEEvent[]> {
  const events: SSEEvent[] = []

  if (!response.body) {
    return events
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Split by double newline (SSE event separator)
      const parts = buffer.split('\n\n')

      // Keep the last part in buffer (might be incomplete)
      buffer = parts.pop() || ''

      // Parse each complete event
      for (const part of parts) {
        const trimmed = part.trim()
        if (!trimmed) continue

        // Extract data from "data: {...}" format
        const lines = trimmed.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6) // Remove "data: " prefix
            try {
              const event = JSON.parse(jsonStr) as SSEEvent
              events.push(event)
            } catch {
              // Skip malformed JSON
              console.warn('Failed to parse SSE event:', jsonStr)
            }
          }
        }
      }
    }

    // Process any remaining data in buffer
    if (buffer.trim()) {
      const lines = buffer.trim().split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6)
          try {
            const event = JSON.parse(jsonStr) as SSEEvent
            events.push(event)
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return events
}

/**
 * Create a mock SSE stream for testing
 *
 * @param events - Array of SSE events to emit
 * @returns ReadableStream that emits the events in SSE format
 */
export function createMockSSEStream(events: SSEEvent[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))
      }
      controller.close()
    },
  })
}

/**
 * Create a mock SSE stream that emits events with delays (for testing streaming behavior)
 *
 * @param events - Array of SSE events to emit
 * @param delayMs - Delay between events in milliseconds
 * @returns ReadableStream that emits the events with delays
 */
export function createDelayedMockSSEStream(
  events: SSEEvent[],
  delayMs: number = 10
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream({
    async pull(controller) {
      if (index >= events.length) {
        controller.close()
        return
      }

      await new Promise(resolve => setTimeout(resolve, delayMs))

      const event = events[index]
      const data = `data: ${JSON.stringify(event)}\n\n`
      controller.enqueue(encoder.encode(data))
      index++
    },
  })
}

/**
 * Create a mock Response with SSE headers and stream
 *
 * @param events - Array of SSE events to include in response
 * @returns Response object with proper SSE headers
 */
export function createMockSSEResponse(events: SSEEvent[]): Response {
  return new Response(createMockSSEStream(events), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

/**
 * Validate that a response has correct SSE headers
 *
 * @param response - The Response to validate
 * @returns Object with validation results
 */
export function validateSSEHeaders(response: Response): {
  hasCorrectContentType: boolean
  hasNoCache: boolean
  hasKeepAlive: boolean
  allValid: boolean
} {
  const contentType = response.headers.get('Content-Type')
  const cacheControl = response.headers.get('Cache-Control')
  const connection = response.headers.get('Connection')

  const hasCorrectContentType = contentType === 'text/event-stream'
  const hasNoCache = cacheControl === 'no-cache'
  const hasKeepAlive = connection === 'keep-alive'

  return {
    hasCorrectContentType,
    hasNoCache,
    hasKeepAlive,
    allValid: hasCorrectContentType && hasNoCache && hasKeepAlive,
  }
}

/**
 * Format an SSE event string (for manual testing/debugging)
 *
 * @param event - The SSE event to format
 * @returns Formatted SSE string with "data: " prefix and double newline
 */
export function formatSSEEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

/**
 * Check if events follow the expected lifecycle pattern
 * (should start with session/valid event, end with done)
 *
 * @param events - Array of SSE events to validate
 * @returns Object with lifecycle validation results
 */
export function validateEventLifecycle(events: SSEEvent[]): {
  hasValidStart: boolean
  endsWithDone: boolean
  errorBeforeDone: boolean
  isValidLifecycle: boolean
} {
  if (events.length === 0) {
    return {
      hasValidStart: false,
      endsWithDone: false,
      errorBeforeDone: false,
      isValidLifecycle: false,
    }
  }

  const firstEvent = events[0]
  const lastEvent = events[events.length - 1]

  // Valid start: session, thinking, extended_thinking, tool_call, answer, or error
  const validStartTypes = ['session', 'thinking', 'extended_thinking', 'tool_call', 'answer', 'error']
  const hasValidStart = validStartTypes.includes(firstEvent.type)

  const endsWithDone = lastEvent.type === 'done'

  // Check if error appears before done (for error flows)
  const doneIndex = events.findIndex(e => e.type === 'done')
  const errorIndex = events.findIndex(e => e.type === 'error')
  const errorBeforeDone = errorIndex !== -1 && (doneIndex === -1 || errorIndex < doneIndex)

  return {
    hasValidStart,
    endsWithDone,
    errorBeforeDone,
    isValidLifecycle: hasValidStart && endsWithDone,
  }
}
