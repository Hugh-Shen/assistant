import type { ResponseMode } from "@assistant/shared"

const normalizedHeader = (value: string | string[] | undefined) => {
  if (typeof value === "string") {
    return value.toLowerCase().trim()
  }
  if (Array.isArray(value)) {
    return value.join(",").toLowerCase().trim()
  }
  return ""
}


export function resolveResponseMode(
  headers: Record<string, string | string[] | undefined>,
): ResponseMode {
  const explicitMode = headers["x-response-mode"]
  const accept = headers.accept

  if (typeof explicitMode === "string") {
    const normalized = normalizedHeader(explicitMode)

    if (normalized === "json" || normalized.includes("application/json")) {
      return "json"
    }

    if (
      normalized === "stream" ||
      normalized.includes("text/event-stream")
    ) {
      return "stream"
    }
  }

  const normalizedAccept = normalizedHeader(accept)

  if (normalizedAccept.includes("application/json")) {
    return "json"
  }

  if (normalizedAccept.includes("text/event-stream")) {
    return "stream"
  }

  return "stream"
}
