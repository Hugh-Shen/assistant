import type { Observable } from "rxjs"

export interface ResponseStreamMessage {
  type?: string
  event?: string
  data: unknown
}

export interface ResponseEnvelope<T> {
  data: T
  stream?: Observable<ResponseStreamMessage>
  initialEventName?: string
}

export function createResponseEnvelope<T>(
  data: T,
  options?: Omit<ResponseEnvelope<T>, "data">,
): ResponseEnvelope<T> {
  return {
    data,
    ...options,
  }
}

export function isResponseEnvelope<T>(
  value: T | ResponseEnvelope<T>,
): value is ResponseEnvelope<T> {
  return Boolean(value && typeof value === "object" && "data" in value)
}

export const createNegotiatedResponse = createResponseEnvelope
export const isNegotiatedResponse = isResponseEnvelope
export type NegotiatedStreamMessage = ResponseStreamMessage
export type NegotiatedResponse<T> = ResponseEnvelope<T>
