import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger("HTTP");
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const requestId = randomUUID();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const payload = error instanceof HttpException ? error.getResponse() : null;
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? payload.message
        : typeof payload === "string"
          ? payload
          : "Ocorreu um erro interno.";
    // Never log request bodies, passwords, cookies, SQL parameters or raw SQL errors.
    if (status >= 500)
      this.logger.error(
        `request=${requestId} error=${error instanceof Error ? error.name : "UnknownError"}`,
      );
    res.status(status).json({ statusCode: status, message, requestId });
  }
}
