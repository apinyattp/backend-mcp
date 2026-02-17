import { IsNotEmpty, IsString, IsUUID, MaxLength, IsOptional, IsIn } from "class-validator";

export class CreateKbDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsUUID()
  @IsNotEmpty()
  groupId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsIn(["text", "markdown", "json"])
  format?: "text" | "markdown" | "json";
}
