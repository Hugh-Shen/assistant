import { Inject, Injectable } from "@nestjs/common"
import {
  DOCUMENT_REPOSITORY,
  type DocumentRepository,
} from "../ports/document.repository.port"

@Injectable()
export class DocumentQueryService {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly repository: DocumentRepository,
  ) {}

  async listDocuments() {
    return this.repository.list()
  }

  async getDocument(documentId: string) {
    return this.repository.findById(documentId)
  }
}
