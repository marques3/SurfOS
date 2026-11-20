import { Transform } from "class-transformer";
import { IsEmail, IsString, Length, Matches } from "class-validator";
export class LoginDto {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @Length(3, 160)
  email!: string;
  @IsString() @Length(12, 128) password!: string;
}
export class RegisterDto extends LoginDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(2, 80)
  name!: string;
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(2, 100)
  school!: string;
}
