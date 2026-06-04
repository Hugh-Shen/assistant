import { Inject, Injectable } from "@nestjs/common"
import {
  concat,
  from,
  interval,
  map,
  mergeMap,
  Observable,
  startWith,
  switchMap,
} from "rxjs"
import type {
  DocumentProcessingEvent,
  DocumentProcessingEventRecord,
} from "@assistant/shared"
import {
  DOCUMENT_EVENT_REPOSITORY,
  type DocumentEventRepository,
} from "../ports/document-event.repository.port"

@Injectable()
export class DocumentEventsService {
  constructor(
    @Inject(DOCUMENT_EVENT_REPOSITORY)
    private readonly repository: DocumentEventRepository,
  ) {}

  async emit(event: DocumentProcessingEvent) {
    return this.repository.append(event)
  }

  stream(documentId: string): Observable<DocumentProcessingEventRecord> {
    return from(this.repository.list(documentId)).pipe(
      switchMap(history => {
        let cursor = history.at(-1)?.id ?? 0

        const liveStream = interval(1000).pipe(
          startWith(0),
          mergeMap(() => from(this.repository.listAfter(documentId, cursor))),
          mergeMap(events => from(events)),
          map(event => {
            cursor = event.id
            return event
          }),
        )

        return concat(from(history), liveStream)
      }),
    )
  }
}
