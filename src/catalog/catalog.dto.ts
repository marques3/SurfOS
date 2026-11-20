import { Transform } from "class-transformer";
import { IsEmail, IsIn, IsString, Length, Matches } from "class-validator";
export class SchoolDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(2, 100)
  name!: string;
}
export class TeacherDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(2, 80)
  name!: string;
  @IsString() @Length(2, 60) role!: string;
  @Matches(/^#[0-9a-fA-F]{6}$/) color!: string;
}
export class StudentDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(2, 80)
  name!: string;
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @Length(3, 160)
  email!: string;
  @IsIn(["beginner", "intermediate"]) level!: "beginner" | "intermediate";
}
