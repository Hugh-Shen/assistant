import { Body, Controller, Post, Req, UseInterceptors } from "@nestjs/common"
import type { Request } from "express"
import { Observable } from "rxjs"
import { createResponseEnvelope, NegotiatedResponseInterceptor } from "../../common/http"
import { RagAskRequestDto } from "./dto/rag-ask.request.dto"
import { RagQueryService } from "./services/rag-query.service"
import { resolveResponseMode } from "../../common/http"

@Controller("rag")
export class RagController {
  constructor(private readonly ragQueryService: RagQueryService) {}

  @Post("ask")
  @UseInterceptors(NegotiatedResponseInterceptor)
  async ask(
    @Body() body: RagAskRequestDto,
    @Req()
    request: Request & {
      headers: Record<string, string | string[] | undefined>
    },
  ) {
    const responseMode = resolveResponseMode(request.headers)

    if (responseMode === "stream") {
      const response = await this.ragQueryService.askStream(
        body.question,
        body.topK,
        body.conversationId,
      )

      let answer = ""

      const stream = new Observable<{
        type?: string
        data: unknown
      }>(subscriber => {
        subscriber.next({
          type: "started",
          data: response.initial,
        })

        const subscription = response.stream.subscribe({
          next: delta => {
            answer += delta
            subscriber.next({
              type: "delta",
              data: { delta },
            })
          },
          error: error => {
            subscriber.error(error)
          },
          complete: () => {
            void response
              .persist(answer)
              .then(() => {
                subscriber.next({
                  type: "completed",
                  data: {
                    ...response.initial,
                    answer,
                  },
                })
                subscriber.complete()
              })
              .catch(error => {
                subscriber.error(error)
              })
          },
        })

        request.on("close", () => {
          subscription.unsubscribe()
        })

        return () => {
          subscription.unsubscribe()
        }
      })

      return createResponseEnvelope(response.initial, {
        initialEventName: "started",
        stream,
      })
    }

    const response = await this.ragQueryService.ask(
      body.question,
      body.topK,
      body.conversationId,
    )

    return createResponseEnvelope(response)
  }
}
