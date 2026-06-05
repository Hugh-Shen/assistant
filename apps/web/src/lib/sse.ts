export interface SseEventMessage<T = unknown> {
  event: string
  data: T
}

function encodeBody(body: Record<string, unknown>) {
  return new Blob([JSON.stringify(body)], {
    type: "application/json",
  })
}

export async function postSse(
  url: string,
  body: Record<string, unknown>,
  options: {
    signal?: AbortSignal
    onEvent: (message: SseEventMessage) => void
  },
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      "x-response-mode": "stream",
    },
    body: encodeBody(body),
    signal: options.signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`SSE request failed with status ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split("\n\n")
    buffer = parts.pop() ?? ""

    for (const part of parts) {
      const eventMatch = part.match(/^event:\s*(.+)$/m)
      const dataMatch = part.match(/^data:\s*(.+)$/m)

      if (!eventMatch || !dataMatch) {
        continue
      }

      options.onEvent({
        event: eventMatch[1],
        data: JSON.parse(dataMatch[1]),
      })
    }
  }
}
