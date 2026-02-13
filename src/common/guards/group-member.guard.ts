import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Role } from "../enums/role.enum";
import { GroupsService } from "../../groups/groups.service";

@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(
    @Inject(GroupsService) private groupsService: GroupsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) return false;

    // Admins bypass group membership check
    if (user.role === Role.ADMIN) {
      (req as any).userGroupIds = "__admin__";
      return true;
    }

    // Get user's group IDs
    const groupIds = await this.groupsService.getUserGroupIds(user.id);
    (req as any).userGroupIds = groupIds;

    // For POST (create): check groupId in body
    const method = req.method?.toUpperCase();
    if (method === "POST") {
      const bodyGroupId = req.body?.groupId;
      if (bodyGroupId && !groupIds.includes(bodyGroupId)) {
        throw new ForbiddenException("You are not a member of this group");
      }
    }

    // For routes with :groupId param
    const paramGroupId = req.params?.groupId;
    if (paramGroupId && !groupIds.includes(paramGroupId)) {
      throw new ForbiddenException("You are not a member of this group");
    }

    return true;
  }
}
