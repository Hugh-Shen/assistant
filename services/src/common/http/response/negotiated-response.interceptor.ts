import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common"
import type { Response } from "express"
import {
  EMPTY,
  Observable,
  catchError,
  finalize,
  ignoreElements,
  mergeMap,
  of,
  tap,
} from "rxjs"
import { resolveResponseMode } from "./response-mode"
import {
  createResponseEnvelope,
  isResponseEnvelope,
  type ResponseEnvelope,
} from "./negotiated-response"
import {
  prepareSseResponse,
  writeSseEvent,
  writeSseMessage,
} from "../stream/sse-response"

@Injectable()
export class NegotiatedResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp()
    const request = httpContext.getRequest<{
      headers: Record<string, string | string[] | undefined>
    }>()
    const response = httpContext.getResponse<Response>()
    const responseMode = resolveResponseMode(request.headers)

    return next.handle().pipe(
      mergeMap(result => {
        const negotiated = this.normalizeResult(result)

        if (responseMode === "json") {
          return of(negotiated.data)
        }

        return this.streamResponse(response, negotiated)
      }),
    )
  }

  private normalizeResult(result: unknown): ResponseEnvelope<unknown> {
    if (isResponseEnvelope(result)) {
      return result
    }

    return createResponseEnvelope(result)
  }

  private streamResponse(
    response: Response,
    negotiated: ResponseEnvelope<unknown>,
  ): Observable<never> {
    prepareSseResponse(response)
    writeSseEvent(
      response,
      negotiated.initialEventName ?? "result",
      negotiated.data,
    )

    if (!negotiated.stream) {
      response.end()
      return EMPTY
    }

    return negotiated.stream.pipe(
      tap(message => {
        writeSseMessage(response, message)
      }),
      catchError(error => {
        if (!response.writableEnded) {
          writeSseMessage(response, {
            type: "error",
            data: {
              message:
                error instanceof Error ? error.message : "Stream response failed",
            },
          })
        }

        return EMPTY
      }),
      finalize(() => {
        if (!response.writableEnded) {
          response.end()
        }
      }),
      ignoreElements(),
    )
  }
}
