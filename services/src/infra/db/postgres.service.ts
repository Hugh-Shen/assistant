import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common"
import { ConfigType } from "@nestjs/config"
import { Pool, type PoolClient, type QueryResultRow } from "pg"
import { databaseConfig } from "../../config"

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name)
  private pool?: Pool

  constructor(
    @Inject(databaseConfig.KEY)
    private readonly config: ConfigType<typeof databaseConfig>,
  ) {}

  async onModuleInit() {
    if (!this.config.url) {
      throw new Error("DATABASE_URL is required for PostgreSQL persistence")
    }

    this.pool = new Pool({
      connectionString: this.config.url,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
    })

    await this.ensureSchema()
    this.logger.log("PostgreSQL connection initialized")
  }

  async onModuleDestroy() {
    await this.pool?.end()
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ) {
    if (!this.pool) {
      throw new Error("PostgreSQL pool has not been initialized")
    }

    return this.pool.query<T>(text, params)
  }

  async withClient<T>(handler: (client: PoolClient) => Promise<T>) {
    if (!this.pool) {
      throw new Error("PostgreSQL pool has not been initialized")
    }

    const client = await this.pool.connect()
    try {
      return await handler(client)
    } finally {
      client.release()
    }
  }

  private async ensureSchema() {
    const dimension = Math.max(
      1,
      Math.floor(this.config.documentEmbeddingDimension || 12),
    )

    // The schema is created lazily so local development only needs DATABASE_URL.
    await this.query(`CREATE EXTENSION IF NOT EXISTS vector`)
    await this.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id text PRIMARY KEY,
        title text NOT NULL,
        original_name text NOT NULL,
        mime_type text NOT NULL,
        size bigint NOT NULL,
        storage_path text NOT NULL,
        status text NOT NULL,
        progress integer NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        error_message text
      )
    `)
    await this.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id text PRIMARY KEY,
        document_id text NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        chunk_index integer NOT NULL,
        text text NOT NULL,
        character_count integer NOT NULL,
        token_count integer NOT NULL,
        start_offset integer NOT NULL,
        end_offset integer NOT NULL
      )
    `)
    await this.query(`
      CREATE TABLE IF NOT EXISTS document_embeddings (
        id text PRIMARY KEY,
        document_id text NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        chunk_id text NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
        model text NOT NULL,
        dimension integer NOT NULL,
        embedding vector(${dimension}) NOT NULL,
        created_at timestamptz NOT NULL
      )
    `)
    await this.query(
      `CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks(document_id)`,
    )
    await this.query(
      `CREATE INDEX IF NOT EXISTS document_embeddings_document_id_idx ON document_embeddings(document_id)`,
    )
    await this.query(
      `CREATE INDEX IF NOT EXISTS document_embeddings_chunk_id_idx ON document_embeddings(chunk_id)`,
    )
  }
}
