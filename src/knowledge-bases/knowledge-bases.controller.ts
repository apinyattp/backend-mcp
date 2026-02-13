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
import { KnowledgeBasesService } from "./knowledge-bases.service";
import { GroupMemberGuard } from "../common/guards/group-member.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { Role } from "../common/enums/role.enum";
import { GroupsService } from "../groups/groups.service";
import { CreateKbDto } from "./dto/create-kb.dto";
import { UpdateKbDto } from "./dto/update-kb.dto";
import { KbQueryDto } from "./dto/kb-query.dto";
import { KbSearchDto } from "./dto/kb-search.dto";

@Controller("knowledge-bases")
export class KnowledgeBasesController {
  constructor(
    @Inject(KnowledgeBasesService)
    private kbService: KnowledgeBasesService,
    @Inject(GroupsService) private groupsService: GroupsService,
  ) {}

  @Get()
  async findAll(@Query() query: KbQueryDto, @CurrentUser() user: User) {
    const userGroupIds = await this.getUserGroupIds(user);
    return this.kbService.findAll(query, userGroupIds);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @CurrentUser() user: User) {
    const userGroupIds = await this.getUserGroupIds(user);
    return this.kbService.findByIdWithAccess(id, userGroupIds);
  }

  @Post()
  async create(@Body() dto: CreateKbDto, @CurrentUser() user: User) {
    return this.kbService.create(dto, user);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateKbDto,
    @CurrentUser() user: User,
  ) {
    return this.kbService.update(id, dto, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") id: string, @CurrentUser() user: User) {
    const userGroupIds = await this.getUserGroupIds(user);
    await this.kbService.delete(id, userGroupIds);
  }

  @Post("search")
  async search(@Body() dto: KbSearchDto, @CurrentUser() user: User) {
    const userGroupIds = await this.getUserGroupIds(user);
    return this.kbService.search(dto, userGroupIds);
  }

  private async getUserGroupIds(
    user: User,
  ): Promise<string[] | "__admin__"> {
    if (user.role === Role.ADMIN) return "__admin__";
    return this.groupsService.getUserGroupIds(user.id);
  }
}
