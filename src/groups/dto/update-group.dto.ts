import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  emoji?: string;
}
