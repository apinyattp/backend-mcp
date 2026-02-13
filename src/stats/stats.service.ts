import { Injectable, Inject } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { GroupsService } from "../groups/groups.service";
import { QdrantService } from "../qdrant/qdrant.service";

@Injectable()
export class StatsService {
  constructor(
    @Inject(UsersService) private usersService: UsersService,
    @Inject(GroupsService) private groupsService: GroupsService,
    @Inject(QdrantService) private qdrantService: QdrantService,
  ) {}

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalGroups,
      totalMembers,
      totalKnowledgeBases,
      newGroupsThisMonth,
      newMembersThisMonth,
    ] = await Promise.all([
      this.groupsService.count(),
      this.usersService.count(),
      this.qdrantService.count(),
      this.groupsService.countCreatedSince(startOfMonth),
      this.usersService.countCreatedSince(startOfMonth),
    ]);

    return {
      totalGroups,
      totalMembers,
      totalKnowledgeBases,
      newGroupsThisMonth,
      newMembersThisMonth,
    };
  }
}
