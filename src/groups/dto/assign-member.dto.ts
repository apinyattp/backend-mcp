import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from "class-validator";
import { GroupRole } from "../../common/enums/role.enum";

export class AssignMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsEnum(GroupRole)
  role?: GroupRole = GroupRole.USER;
}
