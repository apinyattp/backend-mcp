import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { Role } from "../common/enums/role.enum";
import { PaginationDto } from "../common/dto/pagination.dto";
import { PaginatedResponse } from "../common/dto/paginated-response.dto";

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findOrCreateByGoogle(profile: GoogleProfile): Promise<User> {
    let user = await this.findByGoogleId(profile.googleId);
    if (user) {
      // Update profile info on each login
      user.name = profile.name;
      user.avatarUrl = profile.avatarUrl;
      user.email = profile.email;
      return this.usersRepository.save(user);
    }

    // Check if user with same email exists (link accounts)
    user = await this.findByEmail(profile.email);
    if (user) {
      user.googleId = profile.googleId;
      user.name = profile.name;
      user.avatarUrl = profile.avatarUrl;
      return this.usersRepository.save(user);
    }

    // Create new user
    const newUser = this.usersRepository.create({
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      role: Role.USER,
    });
    return this.usersRepository.save(newUser);
  }

  async findOrCreateByEmail(email: string): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) return existing;

    const name = email.split("@")[0].replace(/[._-]/g, " ");
    const newUser = this.usersRepository.create({
      googleId: null,
      email,
      name,
      avatarUrl: null,
      role: Role.USER,
    });
    return this.usersRepository.save(newUser);
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResponse<User>> {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 20;
    const { sortBy, sortOrder } = pagination;
    const skip = (page - 1) * limit;

    const validSortFields = ["createdAt", "updatedAt", "name", "email"];
    const orderField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [users, total] = await this.usersRepository.findAndCount({
      order: { [orderField]: sortOrder },
      skip,
      take: limit,
    });

    return PaginatedResponse.create(users, total, page, limit);
  }

  async updateRole(id: string, role: Role): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User "${id}" not found`);
    }
    user.role = role;
    return this.usersRepository.save(user);
  }

  async count(): Promise<number> {
    return this.usersRepository.count();
  }

  async countCreatedSince(since: Date): Promise<number> {
    return this.usersRepository
      .createQueryBuilder("user")
      .where("user.created_at >= :since", { since })
      .getCount();
  }
}
