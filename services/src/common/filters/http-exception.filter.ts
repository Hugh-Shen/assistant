import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common"
import type { Response, Request } from "express"

type ValidationErrorResponse = {
  message?: string | string[]
  error?: string
  errorCode?: string
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const isHttpException = exception instanceof HttpException
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const payload = isHttpException
      ? exception.getResponse()
      : { message: "Internal server error" }

    const normalized = this.normalizePayload(payload)

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message: normalized.message,
      errorCode: normalized.errorCode,
      errors: normalized.errors,
    })
  }

  private normalizePayload(payload: unknown) {
    if (typeof payload === "string") {
      return {
        message: payload,
        errors: [payload],
      }
    }

    if (payload && typeof payload === "object") {
      const response = payload as ValidationErrorResponse
      const messages = Array.isArray(response.message)
        ? response.message
        : response.message
          ? [response.message]
          : []

      return {
        message: messages[0] ?? response.error ?? "Request failed",
        errorCode: response.errorCode,
        errors: messages.length > 0 ? messages : undefined,
      }
    }

    return {
      message: "Request failed",
      errors: ["Request failed"],
    }
  }
}
