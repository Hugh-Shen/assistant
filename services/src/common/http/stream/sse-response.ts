import type { Response } from "express"

export function prepareSseResponse(response: Response) {
  response.status(200)
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8")
  response.setHeader("Cache-Control", "no-cache, no-transform")
  response.setHeader("Connection", "keep-alive")
  response.setHeader("X-Accel-Buffering", "no")
  response.flushHeaders?.()
}

export function writeSseEvent(
  response: Response,
  eventName: string,
  data: unknown,
) {
  response.write(`event: ${eventName}\n`)
  response.write(`data: ${JSON.stringify(data)}\n\n`)
}

export function writeSseMessage(
  response: Response,
  message: { type?: string; event?: string; data: unknown },
) {
  const eventName = message.type ?? message.event ?? "message"
  writeSseEvent(response, eventName, message.data)
}
