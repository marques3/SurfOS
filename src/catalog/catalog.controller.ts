import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthRequest } from "../common/types";
import { CatalogService } from "./catalog.service";
import { SchoolDto, StudentDto, TeacherDto } from "./catalog.dto";
@Controller()
@UseGuards(AuthGuard)
export class CatalogController {
  constructor(private readonly service: CatalogService) {}
  @Get("school") school(@Req() r: AuthRequest) {
    return this.service.school(r.actor);
  }
  @Patch("school") updateSchool(@Req() r: AuthRequest, @Body() d: SchoolDto) {
    return this.service.updateSchool(r.actor, d);
  }
  @Get("teachers") teachers(@Req() r: AuthRequest) {
    return this.service.teachers(r.actor);
  }
  @Post("teachers") teacher(@Req() r: AuthRequest, @Body() d: TeacherDto) {
    return this.service.teacher(r.actor, d);
  }
  @Patch("teachers/:id") updateTeacher(
    @Req() r: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() d: TeacherDto,
  ) {
    return this.service.teacher(r.actor, d, id);
  }
  @Delete("teachers/:id") archiveTeacher(
    @Req() r: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.archive(r.actor, "teachers", id);
  }
  @Get("students") students(@Req() r: AuthRequest) {
    return this.service.students(r.actor);
  }
  @Post("students") student(@Req() r: AuthRequest, @Body() d: StudentDto) {
    return this.service.student(r.actor, d);
  }
  @Patch("students/:id") updateStudent(
    @Req() r: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() d: StudentDto,
  ) {
    return this.service.student(r.actor, d, id);
  }
  @Delete("students/:id") archiveStudent(
    @Req() r: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.archive(r.actor, "students", id);
  }
}
