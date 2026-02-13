import { Injectable, Inject, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import * as jwt from "jsonwebtoken";
import { UsersService } from "../users/users.service";
import { User } from "../users/entities/user.entity";
import { type GoogleProfile } from "./interfaces/google-profile.interface";
import { type JwtPayload } from "./interfaces/jwt-payload.interface";

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @Inject(UsersService) private usersService: UsersService,
    @Inject(ConfigService) private configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
    this.googleClient = new OAuth2Client(clientId);
  }

  async validateGoogleToken(idToken: string): Promise<GoogleProfile> {
    try {
      const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException("Invalid Google token");
      }

      return {
        googleId: payload.sub,
        email: payload.email!,
        name: payload.name || payload.email!,
        avatarUrl: payload.picture || null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Invalid Google token");
    }
  }

  async login(idToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
    user: User;
  }> {
    const profile = await this.validateGoogleToken(idToken);
    const user = await this.usersService.findOrCreateByGoogle(profile);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const secret = this.configService.get<string>(
      "JWT_SECRET",
      "default-secret",
    );
    const expiresIn = this.configService.get<string>("JWT_EXPIRES_IN", "24h");

    const accessToken = jwt.sign(payload, secret, {
      expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
    });

    // Parse expiresIn to seconds for response
    const expiresInSeconds = this.parseExpiresIn(expiresIn);

    return { accessToken, expiresIn: expiresInSeconds, user };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)(h|m|s|d)$/);
    if (!match) return 86400;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 3600;
      case "d":
        return value * 86400;
      default:
        return 86400;
    }
  }
}
