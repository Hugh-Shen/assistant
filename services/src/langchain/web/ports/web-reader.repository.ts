export const WEB_READER_REPOSITORY = Symbol("WEB_READER_REPOSITORY")

export interface WebPageRecord {
  url: string
  title: string
  content: string
}

export interface WebReaderRepository {
  read(url: string): Promise<WebPageRecord | null>
}
