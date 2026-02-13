import { IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";

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
}
