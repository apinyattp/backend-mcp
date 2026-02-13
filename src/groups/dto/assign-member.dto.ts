import { IsEmail, IsNotEmpty } from "class-validator";

export class AssignMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
