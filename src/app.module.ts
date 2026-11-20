import { Controller, Get, Module, Req, UseGuards } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { Database, rows } from "./database/database.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { AuthGuard } from "./auth/auth.guard";
import { CatalogController } from "./catalog/catalog.controller";
import { CatalogService } from "./catalog/catalog.service";
import { SchedulingController } from "./scheduling/scheduling.controller";
import { SchedulingService } from "./scheduling/scheduling.service";
import type { AuthRequest } from "./common/types";
import { config } from "./common/config";
@Controller()
class HealthController {
  constructor(
    private readonly db: Database,
    private readonly catalog: CatalogService,
    private readonly schedule: SchedulingService,
  ) {}
  @Get("health") async health() {
    await rows(this.db.pool, "SELECT 1");
    return { status: "ok" };
  }
  @Get("workspace")
  @UseGuards(AuthGuard)
  workspace(@Req() req: AuthRequest) {
    return this.db.transaction(async (c) => {
      const a = req.actor;
      const school = await this.catalog.school(a, c);
      const teachers = await this.catalog.teachers(a, c);
      const students = await this.catalog.students(a, c);
      const lessons = await this.schedule.lessons(a, {}, c);
      const bookings = await this.schedule.bookings(a, c);
      return { school, teachers, students, lessons, bookings };
    });
  }
  @Get("config") configuration() {
    return {
      registration: config().registration,
      forecast: "demo",
      timezone: "Europe/Lisbon",
    };
  }
}
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])],
  controllers: [
    HealthController,
    AuthController,
    CatalogController,
    SchedulingController,
  ],
  providers: [
    Database,
    AuthService,
    AuthGuard,
    CatalogService,
    SchedulingService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
