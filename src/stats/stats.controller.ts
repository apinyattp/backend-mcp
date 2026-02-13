import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { StatsService } from "./stats.service";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";

@Controller("stats")
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class StatsController {
  constructor(@Inject(StatsService) private statsService: StatsService) {}

  @Get()
  async getStats() {
    return this.statsService.getStats();
  }
}
