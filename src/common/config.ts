export function config() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const url = process.env.APP_ORIGIN || "http://localhost:3000";
  const origin = new URL(url).origin;
  if (origin !== url)
    throw new Error(
      "APP_ORIGIN must be an origin without a trailing slash or path",
    );
  if (nodeEnv === "production" && !origin.startsWith("https://"))
    throw new Error("Production requires HTTPS APP_ORIGIN");
  if (!process.env.DB_PASSWORD) throw new Error("DB_PASSWORD is required");
  return {
    production: nodeEnv === "production",
    origin,
    port: Number(process.env.PORT || 3000),
    registration: process.env.ALLOW_REGISTRATION === "true",
    database: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "surfos",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "surfos",
      // All dates/times from SQL stay strings; UTC only for system timestamps.
      dateStrings: true as const,
      timezone: "Z",
      connectionLimit: 10,
      ssl:
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: true }
          : undefined,
    },
  };
}
