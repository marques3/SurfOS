import { createPool } from "mysql2/promise";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { config } from "../common/config";
// DDL in MySQL commits implicitly. Each checked-in migration is immutable.
// A failed migration requires explicit inspection; never auto-mark it applied.
async function main() {
  const pool = createPool({ ...config().database, multipleStatements: true });
  const c = await pool.getConnection();
  try {
    await c.query("SET time_zone = '+00:00'");
    const [locks] = await c.query<any[]>(
      "SELECT GET_LOCK('surfos_migrations',30) AS acquired",
    );
    if (Number(locks[0].acquired) !== 1)
      throw new Error("Could not acquire migration lock");
    await c.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(160) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB",
    );
    for (const name of (await readdir(resolve("database/migrations")))
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      const sql = await readFile(resolve("database/migrations", name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const [existing] = await c.execute<any[]>(
        "SELECT checksum FROM schema_migrations WHERE name=?",
        [name],
      );
      if (existing.length) {
        if (existing[0].checksum !== checksum)
          throw new Error(`Migration changed: ${name}`);
        continue;
      }
      await c.query(sql);
      await c.execute(
        "INSERT INTO schema_migrations (name,checksum) VALUES (?,?)",
        [name, checksum],
      );
      console.log(`Applied ${name}`);
    }
  } finally {
    await c.query("SELECT RELEASE_LOCK('surfos_migrations')");
    c.release();
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
