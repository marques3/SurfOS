import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { resolve } from "node:path";
import { AppModule } from "./app.module";
import { config } from "./common/config";
import { HttpErrorFilter } from "./common/http-error.filter";
async function bootstrap() {
  const cfg = config();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  // Default trust proxy is off. If exactly one reverse proxy is used, enable
  // TRUST_PROXY=1 and prevent clients from reaching Node directly.
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: cfg.production ? [] : null,
        },
      },
      strictTransportSecurity: cfg.production ? undefined : false,
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());
  app.use(
    "/api",
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      res.setHeader("Cache-Control", "no-store");
      // Same-origin app, no CORS. A custom header blocks cross-site form posts;
      // Origin is checked as well whenever present, including auth endpoints.
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        if (
          req.get("X-SurfOS") !== "1" ||
          (req.get("Origin") && req.get("Origin") !== cfg.origin)
        ) {
          res
            .status(403)
            .json({
              statusCode: 403,
              message: "Origem ou cabeçalho de segurança inválido.",
            });
          return;
        }
      }
      next();
    },
  );
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new HttpErrorFilter());
  app.useStaticAssets(resolve("public"), { index: "index.html", maxAge: 0 });
  app.enableShutdownHooks();
  await app.listen(cfg.port, "0.0.0.0");
}
bootstrap().catch(() => {
  console.error(
    "Could not start SurfOS. Check environment and database configuration.",
  );
  process.exitCode = 1;
});
