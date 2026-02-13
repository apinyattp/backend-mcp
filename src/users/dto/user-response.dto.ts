import { Role } from "../../common/enums/role.enum";

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}
