import {
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  IsOptional,
} from "class-validator";
export class LessonDto {
  @IsUUID() teacher!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/) time!: string;
  @IsIn([60, 90, 120]) duration!: number;
  @IsIn(["Arrifana", "Monte Clérigo", "Amoreira", "Odeceixe"]) beach!: string;
  @IsIn(["beginner", "intermediate", "private"]) level!:
    "beginner" | "intermediate" | "private";
  @IsInt() @Min(1) @Max(12) capacity!: number;
  @IsInt() @Min(0) @Max(99900) priceCents!: number;
}
export class BookingDto {
  @IsUUID() student!: string;
  @IsUUID() lesson!: string;
  @IsBoolean() paid!: boolean;
}
export class PaymentDto {
  @IsBoolean() paid!: boolean;
}
export class ScheduleQuery {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
}
