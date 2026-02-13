import { IsEnum, IsNotEmpty } from "class-validator";
import { Role } from "../../common/enums/role.enum";

export class UpdateMemberRoleDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
