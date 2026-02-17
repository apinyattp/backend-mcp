import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { McpController } from "./mcp.controller";
import { QdrantModule } from "./qdrant/qdrant.module";
import { EmbeddingModule } from "./embedding/embedding.module";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { GroupsModule } from "./groups/groups.module";
import { KnowledgeBasesModule } from "./knowledge-bases/knowledge-bases.module";
import { StatsModule } from "./stats/stats.module";
import { McpAuthModule } from "./mcp-auth/mcp-auth.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { User } from "./users/entities/user.entity";
import { Group } from "./groups/entities/group.entity";
import { GroupMember } from "./groups/entities/group-member.entity";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        host: config.get<string>("DB_HOST", "localhost"),
        port: config.get<number>("DB_PORT", 5432),
        username: config.get<string>("DB_USERNAME", "postgres"),
        password: config.get<string>("DB_PASSWORD", "secret"),
        database: config.get<string>("DB_DATABASE", "knowledgehub"),
        entities: [User, Group, GroupMember],
        synchronize: true,
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    QdrantModule,
    EmbeddingModule,
    UsersModule,
    GroupsModule,
    AuthModule,
    KnowledgeBasesModule,
    StatsModule,
    McpAuthModule,
  ],
  controllers: [McpController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
