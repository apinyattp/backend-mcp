import { Controller, Post, Get, Body, Inject } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { GroupsService } from "../groups/groups.service";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private authService: AuthService,
    @Inject(GroupsService) private groupsService: GroupsService,
  ) {}

  @Public()
  @Post("google")
  async googleLogin(@Body() dto: GoogleLoginDto) {
    const result = await this.authService.login(dto.idToken);
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatarUrl: result.user.avatarUrl,
        role: result.user.role,
      },
    };
  }

  @Get("me")
  async me(@CurrentUser() user: User) {
    const groups = await this.groupsService.findByUser(user.id);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      groups: groups.map((gm) => ({
        id: gm.group.id,
        name: gm.group.name,
        emoji: gm.group.emoji,
        role: gm.role,
      })),
    };
  }
}
