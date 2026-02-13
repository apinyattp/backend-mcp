import {
  Controller,
  Get,
  Param,
  Query,
  Inject,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { PaginationDto } from "../common/dto/pagination.dto";

@Controller("users")
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(@Inject(UsersService) private usersService: UsersService) {}

  @Get()
  async findAll(@Query() pagination: PaginationDto) {
    return this.usersService.findAll(pagination);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException(`User "${id}" not found`);
    return user;
  }
}
