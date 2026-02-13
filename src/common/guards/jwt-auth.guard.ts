import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import * as jwt from "jsonwebtoken";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { UsersService } from "../../users/users.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private reflector: Reflector,
    @Inject(UsersService) private usersService: UsersService,
    @Inject(ConfigService) private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException(
        "Missing Authorization header. Use: Bearer <token>",
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");

    // 1. Try JWT decode
    const user = await this.tryJwt(token);
    if (user) {
      (req as any).user = user;
      return true;
    }

    // 2. Fallback: static API key for MCP backward compat
    const apiKeyUser = await this.tryApiKey(token);
    if (apiKeyUser) {
      (req as any).user = apiKeyUser;
      (req as any).apiKey = {
        key: token,
        name: apiKeyUser.name,
        tools: ["search_knowledge", "get_topic", "list_topics"],
        role: apiKeyUser.role,
      };
      return true;
    }

    throw new UnauthorizedException("Invalid token or API key");
  }

  private async tryJwt(token: string): Promise<any | null> {
    try {
      const secret = this.configService.get<string>(
        "JWT_SECRET",
        "default-secret",
      );
      const payload = jwt.verify(token, secret) as {
        sub: string;
        email: string;
        role: string;
      };
      if (!payload.sub) return null;
      return await this.usersService.findById(payload.sub);
    } catch {
      return null;
    }
  }

  private async tryApiKey(token: string): Promise<any | null> {
    // Static API keys for MCP backward compatibility
    const staticKeys: Record<string, { name: string; role: string }> = {
      ak_user1_secret123: { name: "User 1", role: "USER" },
      ak_user2_secret456: { name: "User 2", role: "USER" },
      ak_admin_secret789: { name: "Admin", role: "ADMIN" },
    };

    const key = staticKeys[token];
    if (!key) return null;

    return {
      id: `static_${token}`,
      name: key.name,
      email: "",
      role: key.role,
      googleId: "",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
