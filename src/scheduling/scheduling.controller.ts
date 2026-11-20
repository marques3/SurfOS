import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthRequest } from "../common/types";
import { SchedulingService } from "./scheduling.service";
import {
  BookingDto,
  LessonDto,
  PaymentDto,
  ScheduleQuery,
} from "./scheduling.dto";
@Controller()
@UseGuards(AuthGuard)
export class SchedulingController {
  constructor(private readonly s: SchedulingService) {}
  @Get("lessons") lessons(@Req() r: AuthRequest, @Query() q: ScheduleQuery) {
    return this.s.lessons(r.actor, q);
  }
  @Post("lessons") create(@Req() r: AuthRequest, @Body() d: LessonDto) {
    return this.s.saveLesson(r.actor, d);
  }
  @Patch("lessons/:id") update(
    @Req() r: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() d: LessonDto,
  ) {
    return this.s.saveLesson(r.actor, d, id);
  }
  @Delete("lessons/:id") cancelLesson(
    @Req() r: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.s.cancelLesson(r.actor, id);
  }
  @Get("bookings") bookings(@Req() r: AuthRequest) {
    return this.s.bookings(r.actor);
  }
  @Get("bookings/cancelled") history(@Req() r: AuthRequest) {
    return this.s.cancellationHistory(r.actor);
  }
  @Post("bookings") book(@Req() r: AuthRequest, @Body() d: BookingDto) {
    return this.s.book(r.actor, d);
  }
  @Patch("bookings/:id/payment") payment(
    @Req() r: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() d: PaymentDto,
  ) {
    return this.s.payment(r.actor, id, d);
  }
  @Delete("bookings/:id") cancelBooking(
    @Req() r: AuthRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.s.cancelBooking(r.actor, id);
  }
  @Get("audit") audit(@Req() r: AuthRequest) {
    return this.s.audit(r.actor);
  }
}
