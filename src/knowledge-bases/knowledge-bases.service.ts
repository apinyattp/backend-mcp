import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadGatewayException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { QdrantService, type KbPayload } from "../qdrant/qdrant.service";
import { EmbeddingService } from "../embedding/embedding.service";
import { GroupsService } from "../groups/groups.service";
import { User } from "../users/entities/user.entity";
import { Role } from "../common/enums/role.enum";
import { type CreateKbDto } from "./dto/create-kb.dto";
import { type UpdateKbDto } from "./dto/update-kb.dto";
import { type KbQueryDto } from "./dto/kb-query.dto";
import { type KbSearchDto } from "./dto/kb-search.dto";

function formatKbResponse(id: string, payload: KbPayload, score?: number) {
  return {
    id,
    title: payload.title,
    content: payload.content,
    ...(score !== undefined ? { score } : {}),
    owner: {
      id: payload.owner_id,
      name: payload.owner_name,
      avatarUrl: payload.owner_avatar_url,
    },
    group: {
      id: payload.group_id,
      name: payload.group_name,
      emoji: payload.group_emoji,
    },
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  };
}

@Injectable()
export class KnowledgeBasesService {
  constructor(
    @Inject(QdrantService) private qdrantService: QdrantService,
    @Inject(EmbeddingService) private embeddingService: EmbeddingService,
    @Inject(GroupsService) private groupsService: GroupsService,
  ) {}

  async create(dto: CreateKbDto, user: User) {
    // Verify group membership
    if (user.role !== Role.ADMIN) {
      const isMember = await this.groupsService.isUserInGroup(
        user.id,
        dto.groupId,
      );
      if (!isMember) {
        throw new ForbiddenException("You are not a member of this group");
      }
    }

    // Fetch group details
    const group = await this.groupsService.findById(dto.groupId);
    if (!group) throw new NotFoundException(`Group "${dto.groupId}" not found`);

    // Generate embedding
    const text = `${dto.title}\n\n${dto.content}`;
    const vector = await this.embed(text);

    const id = uuidv4();
    const now = new Date().toISOString();

    const payload: KbPayload = {
      title: dto.title,
      content: dto.content,
      owner_id: user.id,
      owner_name: user.name,
      owner_avatar_url: user.avatarUrl,
      group_id: dto.groupId,
      group_name: group.name,
      group_emoji: group.emoji,
      created_at: now,
      updated_at: now,
    };

    await this.qdrantService.upsert(id, vector, payload);

    return formatKbResponse(id, payload);
  }

  async findAll(query: KbQueryDto, userGroupIds: string[] | "__admin__") {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const filter = this.buildGroupFilter(userGroupIds, query.groupId);

    if (query.search) {
      // Semantic search mode
      const vector = await this.embed(query.search);
      const results = await this.qdrantService.search(
        vector,
        filter,
        limit,
      );

      const total = results.length;
      return {
        data: results.map((r) => formatKbResponse(r.id, r.payload, r.score)),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Scroll mode (listing)
    const total = await this.qdrantService.count(filter);
    const result = await this.qdrantService.scroll(filter, limit);

    return {
      data: result.points.map((p) => formatKbResponse(p.id, p.payload)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const point = await this.qdrantService.getById(id);
    if (!point)
      throw new NotFoundException(`Knowledge base "${id}" not found`);
    return formatKbResponse(point.id, point.payload);
  }

  async findByIdWithAccess(
    id: string,
    userGroupIds: string[] | "__admin__",
  ) {
    const point = await this.qdrantService.getById(id);
    if (!point)
      throw new NotFoundException(`Knowledge base "${id}" not found`);

    // Check group membership
    if (userGroupIds !== "__admin__") {
      if (!userGroupIds.includes(point.payload.group_id)) {
        throw new ForbiddenException(
          "You do not have access to this knowledge base",
        );
      }
    }

    return formatKbResponse(point.id, point.payload);
  }

  async update(id: string, dto: UpdateKbDto, user: User) {
    const point = await this.qdrantService.getById(id);
    if (!point)
      throw new NotFoundException(`Knowledge base "${id}" not found`);

    // Check membership for current group
    if (user.role !== Role.ADMIN) {
      const isMember = await this.groupsService.isUserInGroup(
        user.id,
        point.payload.group_id,
      );
      if (!isMember) {
        throw new ForbiddenException(
          "You do not have access to this knowledge base",
        );
      }
    }

    const updated = { ...point.payload };
    const now = new Date().toISOString();
    updated.updated_at = now;

    if (dto.title !== undefined) updated.title = dto.title;
    if (dto.content !== undefined) updated.content = dto.content;

    // Handle group transfer
    if (dto.groupId && dto.groupId !== point.payload.group_id) {
      if (user.role !== Role.ADMIN) {
        const isMemberOfNew = await this.groupsService.isUserInGroup(
          user.id,
          dto.groupId,
        );
        if (!isMemberOfNew) {
          throw new ForbiddenException(
            "You are not a member of the target group",
          );
        }
      }
      const newGroup = await this.groupsService.findById(dto.groupId);
      if (!newGroup)
        throw new NotFoundException(`Group "${dto.groupId}" not found`);
      updated.group_id = dto.groupId;
      updated.group_name = newGroup.name;
      updated.group_emoji = newGroup.emoji;
    }

    // Re-embed if content changed
    const text = `${updated.title}\n\n${updated.content}`;
    const vector = await this.embed(text);

    await this.qdrantService.upsert(id, vector, updated);

    return formatKbResponse(id, updated);
  }

  async delete(
    id: string,
    userGroupIds: string[] | "__admin__",
  ): Promise<void> {
    const point = await this.qdrantService.getById(id);
    if (!point)
      throw new NotFoundException(`Knowledge base "${id}" not found`);

    if (userGroupIds !== "__admin__") {
      if (!userGroupIds.includes(point.payload.group_id)) {
        throw new ForbiddenException(
          "You do not have access to this knowledge base",
        );
      }
    }

    await this.qdrantService.deletePoint(id);
  }

  async search(dto: KbSearchDto, userGroupIds: string[] | "__admin__") {
    const filter = this.buildGroupFilter(userGroupIds, dto.groupId);
    const vector = await this.embed(dto.query);

    const results = await this.qdrantService.search(
      vector,
      filter,
      dto.limit ?? 10,
      dto.scoreThreshold,
    );

    return {
      data: results.map((r) => formatKbResponse(r.id, r.payload, r.score)),
    };
  }

  async countByGroup(groupId: string): Promise<number> {
    return this.qdrantService.count({
      must: [{ key: "group_id", match: { value: groupId } }],
    });
  }

  async countAll(): Promise<number> {
    return this.qdrantService.count();
  }

  private buildGroupFilter(
    userGroupIds: string[] | "__admin__",
    specificGroupId?: string,
  ): any {
    const conditions: any[] = [];

    if (specificGroupId) {
      conditions.push({
        key: "group_id",
        match: { value: specificGroupId },
      });
    } else if (userGroupIds !== "__admin__" && userGroupIds.length > 0) {
      conditions.push({
        should: userGroupIds.map((gid) => ({
          key: "group_id",
          match: { value: gid },
        })),
      });
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0].should ? conditions[0] : { must: conditions };
    return { must: conditions };
  }

  private async embed(text: string): Promise<number[]> {
    try {
      return await this.embeddingService.embed(text);
    } catch (error) {
      throw new BadGatewayException("Embedding service failed");
    }
  }
}
