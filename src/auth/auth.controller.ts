import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { AuthGuard } from "./auth.guard";
import type { AuthRequest } from "../common/types";
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.register(dto, res);
  }
  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }
  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() req: AuthRequest) {
    return req.actor;
  }
  @Post("logout")
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req.cookies?.surfos_session, res);
  }
}
