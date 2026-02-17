import { Injectable, Inject, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { KB_COLLECTION, KB_VECTOR_SIZE } from "./qdrant.config";

export interface KbPayload {
  title: string;
  content: string;
  format: "text" | "markdown" | "json";
  owner_id: string;
  owner_name: string;
  owner_avatar_url: string | null;
  group_id: string;
  group_name: string;
  group_emoji: string | null;
  created_at: string;
  updated_at: string;
}

export interface KbPoint {
  id: string;
  payload: KbPayload;
  vector?: number[];
}

export interface KbSearchResult {
  id: string;
  score: number;
  payload: KbPayload;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private client: QdrantClient;
  private readonly logger = new Logger(QdrantService.name);

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    this.client = new QdrantClient({
      url: this.configService.get<string>("QDRANT_URL", "http://localhost:6333"),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureCollection();
  }

  getClient(): QdrantClient {
    return this.client;
  }

  private async ensureCollection(): Promise<void> {
    const collections = await this.client.getCollections();
    const existing = new Set(collections.collections.map((c) => c.name));

    if (!existing.has(KB_COLLECTION)) {
      this.logger.log(`Creating collection "${KB_COLLECTION}"...`);
      await this.client.createCollection(KB_COLLECTION, {
        vectors: { size: KB_VECTOR_SIZE, distance: "Cosine" },
      });
      await this.client.createPayloadIndex(KB_COLLECTION, {
        field_name: "group_id",
        field_schema: "keyword",
      });
      await this.client.createPayloadIndex(KB_COLLECTION, {
        field_name: "owner_id",
        field_schema: "keyword",
      });
      await this.client.createPayloadIndex(KB_COLLECTION, {
        field_name: "updated_at",
        field_schema: "keyword",
      });
      this.logger.log(`Collection "${KB_COLLECTION}" created.`);
    }
  }

  async upsert(
    id: string,
    vector: number[],
    payload: KbPayload,
  ): Promise<void> {
    await this.client.upsert(KB_COLLECTION, {
      wait: true,
      points: [{ id, vector, payload: { ...payload } }],
    });
  }

  async getById(id: string): Promise<KbPoint | null> {
    try {
      const points = await this.client.retrieve(KB_COLLECTION, {
        ids: [id],
        with_payload: true,
        with_vector: true,
      });
      if (points.length === 0) return null;
      const p = points[0];
      return {
        id: p.id as string,
        payload: p.payload as unknown as KbPayload,
        vector: p.vector as number[] | undefined,
      };
    } catch {
      return null;
    }
  }

  async deletePoint(id: string): Promise<void> {
    await this.client.delete(KB_COLLECTION, {
      wait: true,
      points: [id],
    });
  }

  async scroll(
    filter: any,
    limit: number,
    offset?: string,
  ): Promise<{ points: KbPoint[]; nextOffset?: string }> {
    const result = await this.client.scroll(KB_COLLECTION, {
      filter,
      with_payload: true,
      limit,
      ...(offset ? { offset } : {}),
    });

    return {
      points: result.points.map((p) => ({
        id: p.id as string,
        payload: p.payload as unknown as KbPayload,
      })),
      nextOffset: result.next_page_offset as string | undefined,
    };
  }

  async search(
    vector: number[],
    filter: any,
    limit: number,
    scoreThreshold?: number,
  ): Promise<KbSearchResult[]> {
    const results = await this.client.search(KB_COLLECTION, {
      vector,
      filter,
      limit,
      with_payload: true,
      ...(scoreThreshold !== undefined
        ? { score_threshold: scoreThreshold }
        : {}),
    });

    return results.map((r) => ({
      id: r.id as string,
      score: r.score,
      payload: r.payload as unknown as KbPayload,
    }));
  }

  async count(filter?: any): Promise<number> {
    const result = await this.client.count(KB_COLLECTION, {
      filter,
      exact: true,
    });
    return result.count;
  }

  async updatePayload(
    filter: any,
    payload: Partial<KbPayload>,
  ): Promise<void> {
    await this.client.setPayload(KB_COLLECTION, {
      filter,
      payload: payload as Record<string, unknown>,
      wait: true,
    });
  }
}
