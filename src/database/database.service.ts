import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import {
  createPool,
  Pool,
  PoolConnection,
  RowDataPacket,
  ResultSetHeader,
} from "mysql2/promise";
import { config } from "../common/config";
import type { Actor } from "../common/types";
export type Sql = Pool | PoolConnection;
export async function rows<T = Record<string, unknown>>(
  sql: Sql,
  query: string,
  params: (string | number | boolean | Date | null)[] = [],
): Promise<T[]> {
  const [result] = await sql.execute<RowDataPacket[]>(query, params);
  return result as T[];
}
export async function execute(
  sql: Sql,
  query: string,
  params: (string | number | boolean | Date | null)[] = [],
) {
  const [result] = await sql.execute<ResultSetHeader>(query, params);
  return result;
}
@Injectable()
export class Database implements OnApplicationShutdown {
  readonly pool = createPool(config().database);
  constructor() {
    // mysql2 emits this with the underlying callback connection; this query is
    // queued before any application query on a newly created connection.
    this.pool.on("connection", (connection) => {
      connection.query("SET time_zone = '+00:00'");
    });
  }
  async onApplicationShutdown() {
    await this.pool.end();
  }
  async transaction<T>(fn: (c: PoolConnection) => Promise<T>): Promise<T> {
    const c = await this.pool.getConnection();
    try {
      await c.beginTransaction();
      const result = await fn(c);
      await c.commit();
      return result;
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }
  // Every school mutation locks this same row first: concurrent scheduling,
  // booking, cancellation and capacity updates cannot race each other.
  async mutate<T>(
    actor: Actor,
    fn: (c: PoolConnection) => Promise<T>,
  ): Promise<T> {
    return this.transaction(async (c) => {
      await rows(c, "SELECT id FROM schools WHERE id=? FOR UPDATE", [
        actor.schoolId,
      ]);
      return fn(c);
    });
  }
}
export async function audit(c: Sql, actor: Actor, action: string, id: string) {
  await execute(
    c,
    "INSERT INTO audit_log (school_id,user_id,action,entity_id) VALUES (?,?,?,?)",
    [actor.schoolId, actor.id, action, id],
  );
}
