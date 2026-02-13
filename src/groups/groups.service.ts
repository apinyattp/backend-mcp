import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Group } from "./entities/group.entity";
import { GroupMember } from "./entities/group-member.entity";
import { Role } from "../common/enums/role.enum";
import { PaginationDto } from "../common/dto/pagination.dto";
import { PaginatedResponse } from "../common/dto/paginated-response.dto";
import { UsersService } from "../users/users.service";
import { type CreateGroupDto } from "./dto/create-group.dto";
import { type UpdateGroupDto } from "./dto/update-group.dto";

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private groupsRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private groupMembersRepository: Repository<GroupMember>,
    @Inject(UsersService) private usersService: UsersService,
  ) {}

  async create(dto: CreateGroupDto): Promise<Group> {
    const group = this.groupsRepository.create({
      name: dto.name,
      emoji: dto.emoji || null,
    });
    return this.groupsRepository.save(group);
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResponse<any>> {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 20;
    const { sortBy, sortOrder } = pagination;
    const skip = (page - 1) * limit;

    const validSortFields = ["createdAt", "updatedAt", "name"];
    const orderField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [groups, total] = await this.groupsRepository.findAndCount({
      order: { [orderField]: sortOrder },
      skip,
      take: limit,
    });

    // Enrich with member counts
    const enriched = await Promise.all(
      groups.map(async (group) => {
        const memberCount = await this.groupMembersRepository.count({
          where: { groupId: group.id },
        });
        return {
          id: group.id,
          name: group.name,
          emoji: group.emoji,
          memberCount,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        };
      }),
    );

    return PaginatedResponse.create(enriched, total, page, limit);
  }

  async findById(id: string): Promise<Group | null> {
    return this.groupsRepository.findOne({ where: { id } });
  }

  async update(id: string, dto: UpdateGroupDto): Promise<Group> {
    const group = await this.findById(id);
    if (!group) throw new NotFoundException(`Group "${id}" not found`);

    if (dto.name !== undefined) group.name = dto.name;
    if (dto.emoji !== undefined) group.emoji = dto.emoji || null;

    return this.groupsRepository.save(group);
  }

  async delete(id: string): Promise<void> {
    const group = await this.findById(id);
    if (!group) throw new NotFoundException(`Group "${id}" not found`);

    const memberCount = await this.groupMembersRepository.count({
      where: { groupId: id },
    });
    if (memberCount > 0) {
      throw new BadRequestException(
        "Remove all members before deleting this group.",
      );
    }

    await this.groupsRepository.remove(group);
  }

  async findByUser(userId: string): Promise<GroupMember[]> {
    return this.groupMembersRepository.find({
      where: { userId },
      relations: ["group", "user"],
    });
  }

  async getMembers(groupId: string): Promise<GroupMember[]> {
    const group = await this.findById(groupId);
    if (!group) throw new NotFoundException(`Group "${groupId}" not found`);

    return this.groupMembersRepository.find({
      where: { groupId },
      relations: ["user"],
    });
  }

  async addMember(groupId: string, email: string): Promise<GroupMember> {
    const group = await this.findById(groupId);
    if (!group) throw new NotFoundException(`Group "${groupId}" not found`);

    const user = await this.usersService.findOrCreateByEmail(email);

    const existing = await this.groupMembersRepository.findOne({
      where: { userId: user.id, groupId },
    });
    if (existing) {
      throw new ConflictException("User is already a member.");
    }

    const member = this.groupMembersRepository.create({
      userId: user.id,
      groupId,
    });
    const saved = await this.groupMembersRepository.save(member);

    // Return with user relation
    return this.groupMembersRepository.findOne({
      where: { id: saved.id },
      relations: ["user"],
    }) as Promise<GroupMember>;
  }

  async updateMemberRole(
    groupId: string,
    userId: string,
    role: Role,
  ): Promise<GroupMember> {
    const member = await this.groupMembersRepository.findOne({
      where: { groupId, userId },
      relations: ["user"],
    });
    if (!member) throw new NotFoundException("Membership not found");

    // Update the user's app-level role
    await this.usersService.updateRole(userId, role);

    // Re-fetch with updated user
    return this.groupMembersRepository.findOne({
      where: { groupId, userId },
      relations: ["user"],
    }) as Promise<GroupMember>;
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    const member = await this.groupMembersRepository.findOne({
      where: { groupId, userId },
    });
    if (!member) throw new NotFoundException("Membership not found");

    await this.groupMembersRepository.remove(member);
  }

  async isUserInGroup(userId: string, groupId: string): Promise<boolean> {
    const count = await this.groupMembersRepository.count({
      where: { userId, groupId },
    });
    return count > 0;
  }

  async getUserGroupIds(userId: string): Promise<string[]> {
    const memberships = await this.groupMembersRepository.find({
      where: { userId },
      select: ["groupId"],
    });
    return memberships.map((m) => m.groupId);
  }

  async count(): Promise<number> {
    return this.groupsRepository.count();
  }

  async countCreatedSince(since: Date): Promise<number> {
    return this.groupsRepository
      .createQueryBuilder("group")
      .where("group.created_at >= :since", { since })
      .getCount();
  }

  async countMembers(): Promise<number> {
    return this.groupMembersRepository.count();
  }
}
