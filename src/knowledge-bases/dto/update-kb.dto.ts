import { IsOptional, IsString, IsUUID, MaxLength, IsIn } from "class-validator";

export class UpdateKbDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(["text", "markdown", "json"])
  format?: "text" | "markdown" | "json";
}
