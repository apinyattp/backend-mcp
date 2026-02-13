import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { GroupsService } from "./groups.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { GroupMemberGuard } from "../common/guards/group-member.guard";
import { User } from "../users/entities/user.entity";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { AssignMemberDto } from "./dto/assign-member.dto";
import { UpdateMemberRoleDto } from "./dto/update-member-role.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

@Controller("groups")
export class GroupsController {
  constructor(
    @Inject(GroupsService) private groupsService: GroupsService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async findAll(@Query() pagination: PaginationDto) {
    return this.groupsService.findAll(pagination);
  }

  @Get("mine")
  async findMine(@CurrentUser() user: User) {
    const memberships = await this.groupsService.findByUser(user.id);
    return {
      data: memberships.map((gm) => ({
        id: gm.group.id,
        name: gm.group.name,
        emoji: gm.group.emoji,
        role: gm.user.role,
      })),
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Put(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async update(@Param("id") id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") id: string) {
    await this.groupsService.delete(id);
  }

  // ─── Group Members ──────────────────────────────────────────────────

  @Get(":groupId/members")
  @UseGuards(GroupMemberGuard)
  async getMembers(@Param("groupId") groupId: string) {
    const members = await this.groupsService.getMembers(groupId);
    return {
      data: members.map((gm) => ({
        id: gm.id,
        userId: gm.userId,
        name: gm.user.name,
        email: gm.user.email,
        avatarUrl: gm.user.avatarUrl,
        role: gm.user.role,
        joinedAt: gm.joinedAt,
      })),
    };
  }

  @Post(":groupId/members")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async addMember(
    @Param("groupId") groupId: string,
    @Body() dto: AssignMemberDto,
  ) {
    const member = await this.groupsService.addMember(groupId, dto.email);
    return {
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
      role: member.user.role,
      joinedAt: member.joinedAt,
    };
  }

  @Put(":groupId/members/:userId")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async updateMemberRole(
    @Param("groupId") groupId: string,
    @Param("userId") userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const member = await this.groupsService.updateMemberRole(
      groupId,
      userId,
      dto.role,
    );
    return {
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.user.role,
    };
  }

  @Delete(":groupId/members/:userId")
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param("groupId") groupId: string,
    @Param("userId") userId: string,
  ) {
    await this.groupsService.removeMember(groupId, userId);
  }
}
