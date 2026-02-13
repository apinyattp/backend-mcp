import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { type EmbeddingProvider } from "./interfaces/embedding-provider.interface";

@Injectable()
export class EmbeddingService implements OnModuleInit, EmbeddingProvider {
  private pipeline: any;
  private readonly logger = new Logger(EmbeddingService.name);

  async onModuleInit(): Promise<void> {
    this.logger.log("Loading embedding model (Xenova/all-MiniLM-L6-v2)...");
    const { pipeline, env } = await import("@xenova/transformers");
    env.cacheDir = process.env.TRANSFORMERS_CACHE || env.cacheDir;
    this.pipeline = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
    );
    this.logger.log("Embedding model loaded.");
  }

  async embed(text: string): Promise<number[]> {
    const output = await this.pipeline(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(output.data as Float32Array);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  getDimension(): number {
    return 384;
  }
}
