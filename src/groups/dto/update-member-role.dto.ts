import { IsEnum, IsNotEmpty } from "class-validator";
import { GroupRole } from "../../common/enums/role.enum";

export class UpdateMemberRoleDto {
  @IsEnum(GroupRole)
  @IsNotEmpty()
  role: GroupRole;
}
