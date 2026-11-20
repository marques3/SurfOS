import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync, ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { createPool, Pool } from "mysql2/promise";
import { config } from "../src/common/config";
import { tokenHash } from "../src/auth/password";
let server: ChildProcess,
  pool: Pool,
  base: string,
  a: string,
  b: string,
  schoolA: string,
  schoolB: string;
const prefix = randomUUID();
const password = "Integration-only-password-123";
interface Result {
  status: number;
  body: any;
  cookie: string;
  headers: Headers;
}
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie?: string,
  origin?: string,
): Promise<Result> {
  const r = await fetch(base + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-SurfOS": "1",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: r.status,
    body: await r.json(),
    cookie: (r.headers.get("set-cookie") || "").split(";")[0],
    headers: r.headers,
  };
}
async function makeTeacher(cookie: string, name = "Test Coach") {
  const r = await request(
    "/teachers",
    "POST",
    { name, role: "Surf coach", color: "#dce7d6" },
    cookie,
  );
  assert.equal(r.status, 201);
  return r.body.id as string;
}
async function makeStudent(cookie: string, name = "Test Student") {
  const r = await request(
    "/students",
    "POST",
    { name, email: randomUUID() + "@example.com", level: "beginner" },
    cookie,
  );
  assert.equal(r.status, 201);
  return r.body.id as string;
}
const spec = (teacher: string, extra: Record<string, unknown> = {}) => ({
  teacher,
  date: "2030-06-15",
  time: "09:00",
  duration: 90,
  beach: "Arrifana",
  level: "beginner",
  capacity: 6,
  priceCents: 4500,
  ...extra,
});
async function makeLesson(
  cookie: string,
  teacher: string,
  extra: Record<string, unknown> = {},
) {
  const r = await request("/lessons", "POST", spec(teacher, extra), cookie);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.id as string;
}
before(async () => {
  if (!process.env.DB_NAME?.endsWith("_test"))
    throw new Error(
      "Integration tests require a dedicated DB_NAME ending in _test",
    );
  process.env.NODE_ENV = "test";
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address() as { port: number };
  await new Promise<void>((r) => listener.close(() => r()));
  base = `http://127.0.0.1:${address.port}`;
  const env = {
    ...process.env,
    PORT: String(address.port),
    APP_ORIGIN: base,
    ALLOW_REGISTRATION: "true",
  };
  execFileSync(process.execPath, ["dist/database/migrate.js"], {
    env,
    stdio: "pipe",
  });
  pool = createPool(config().database);
  server = spawn(process.execPath, ["dist/main.js"], { env, stdio: "pipe" });
  let logs = "";
  server.stdout!.on("data", (d) => {
    logs += d;
  });
  server.stderr!.on("data", (d) => {
    logs += d;
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(logs);
    try {
      const r = await fetch(base + "/api/health");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw new Error(`API did not start: ${logs}`);
  const first = await request("/auth/register", "POST", {
    name: "Owner A",
    school: "School A",
    email: `a-${prefix}@example.com`,
    password,
  });
  assert.equal(first.status, 201);
  a = first.cookie;
  schoolA = first.body.schoolId;
  const second = await request("/auth/register", "POST", {
    name: "Owner B",
    school: "School B",
    email: `b-${prefix}@example.com`,
    password,
  });
  assert.equal(second.status, 201);
  b = second.cookie;
  schoolB = second.body.schoolId;
});
after(async () => {
  if (server) {
    const done = once(server, "exit");
    server.kill("SIGTERM");
    await done;
  }
  if (pool) {
    for (const id of [schoolA, schoolB].filter(Boolean)) {
      await pool.execute(
        "DELETE s FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.school_id=?",
        [id],
      );
      for (const table of [
        "audit_log",
        "bookings",
        "lessons",
        "students",
        "teachers",
        "users",
      ])
        await pool.execute(`DELETE FROM ${table} WHERE school_id=?`, [id]);
      await pool.execute("DELETE FROM schools WHERE id=?", [id]);
    }
    await pool.end();
  }
});
test("protected endpoints require auth and session cookie has security flags", async () => {
  assert.equal((await request("/students")).status, 401);
  assert.equal(
    (await request("/auth/me", "GET", undefined, a)).body.schoolId,
    schoolA,
  );
  const login = await request("/auth/login", "POST", {
    email: `a-${prefix}@example.com`,
    password,
  });
  assert.equal(login.status, 201);
  assert.match(login.headers.get("set-cookie")!, /HttpOnly/i);
  assert.match(login.headers.get("set-cookie")!, /SameSite=Strict/i);
  assert.equal(
    (
      await request("/auth/login", "POST", {
        email: `a-${prefix}@example.com`,
        password: "wrong-password-long",
      })
    ).status,
    401,
  );
});
test("CSRF origin and custom header are enforced", async () => {
  const noHeader = await fetch(base + "/api/auth/logout", {
    method: "POST",
    headers: { Cookie: a },
  });
  assert.equal(noHeader.status, 403);
  assert.equal(
    (
      await request(
        "/auth/logout",
        "POST",
        undefined,
        a,
        "https://evil.example",
      )
    ).status,
    403,
  );
});
test("DTO rejects unknown fields and wrong types", async () => {
  assert.equal(
    (
      await request(
        "/students",
        "POST",
        { name: "X", email: "bad", level: "expert", schoolId: schoolB },
        a,
      )
    ).status,
    400,
  );
  const tid = await makeTeacher(a);
  assert.equal(
    (await request("/lessons", "POST", spec(tid, { capacity: "6" }), a)).status,
    400,
  );
  assert.equal(
    (await request("/lessons", "POST", spec(tid, { date: "2030-02-30" }), a))
      .status,
    400,
  );
  assert.equal(
    (
      await request(
        "/lessons",
        "POST",
        spec(tid, { level: "private", capacity: 2 }),
        a,
      )
    ).status,
    400,
  );
});
test("cross-school foreign IDs cannot be read or used", async () => {
  const tid = await makeTeacher(a),
    sid = await makeStudent(a),
    lid = await makeLesson(a, tid, { date: "2030-06-16" });
  assert.equal(
    (await request("/teachers", "GET", undefined, b)).body.length,
    0,
  );
  assert.equal(
    (
      await request(
        "/teachers/" + tid,
        "PATCH",
        { name: "Hacked Name", role: "Coach", color: "#ffffff" },
        b,
      )
    ).status,
    404,
  );
  assert.equal((await request("/lessons", "POST", spec(tid), b)).status, 404);
  assert.equal(
    (
      await request(
        "/bookings",
        "POST",
        { student: sid, lesson: lid, paid: false },
        b,
      )
    ).status,
    404,
  );
  assert.equal(
    (await request("/lessons/" + lid, "DELETE", undefined, b)).status,
    404,
  );
});
test("concurrent creation of overlapping instructor lessons only permits one", async () => {
  const tid = await makeTeacher(a);
  const results = await Promise.all([
    request("/lessons", "POST", spec(tid, { date: "2030-06-17" }), a),
    request("/lessons", "POST", spec(tid, { date: "2030-06-17" }), a),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
});
test("concurrent bookings cannot oversell last seat; prices remain snapshots", async () => {
  const tid = await makeTeacher(a),
    s1 = await makeStudent(a),
    s2 = await makeStudent(a),
    lid = await makeLesson(a, tid, {
      date: "2030-06-18",
      level: "private",
      capacity: 1,
    });
  const results = await Promise.all([
    request("/bookings", "POST", { student: s1, lesson: lid, paid: false }, a),
    request("/bookings", "POST", { student: s2, lesson: lid, paid: false }, a),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const bookingId = results.find((r) => r.status === 201)!.body.id;
  const update = await request(
    "/lessons/" + lid,
    "PATCH",
    spec(tid, {
      date: "2030-06-18",
      level: "private",
      capacity: 1,
      priceCents: 9900,
    }),
    a,
  );
  assert.equal(update.status, 200);
  const saved = (await request("/bookings", "GET", undefined, a)).body.find(
    (r: any) => r.id === bookingId,
  );
  assert.equal(saved.priceCents, 4500);
  assert.equal(
    (
      await request(
        "/bookings/" + bookingId + "/payment",
        "PATCH",
        { paid: true },
        b,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request(
        "/bookings/" + bookingId + "/payment",
        "PATCH",
        { paid: true },
        a,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request("/lessons/" + lid, "DELETE", undefined, a)).status,
    200,
  );
  const history = (
    await request("/bookings/cancelled", "GET", undefined, a)
  ).body.find((r: any) => r.id === bookingId);
  assert.equal(Number(history.paid), 1);
  assert.equal(
    (await request("/bookings", "GET", undefined, a)).body.some(
      (r: any) => r.id === bookingId,
    ),
    false,
  );
});
test("duplicate bookings, student overlaps, and capacity reductions are rejected", async () => {
  const t1 = await makeTeacher(a),
    t2 = await makeTeacher(a),
    sid = await makeStudent(a),
    s2 = await makeStudent(a);
  const l1 = await makeLesson(a, t1, { date: "2030-06-19" }),
    l2 = await makeLesson(a, t2, { date: "2030-06-19" });
  assert.equal(
    (
      await request(
        "/bookings",
        "POST",
        { student: sid, lesson: l1, paid: false },
        a,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await request(
        "/bookings",
        "POST",
        { student: sid, lesson: l1, paid: false },
        a,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await request(
        "/bookings",
        "POST",
        { student: sid, lesson: l2, paid: false },
        a,
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await request(
        "/bookings",
        "POST",
        { student: s2, lesson: l1, paid: false },
        a,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await request(
        "/lessons/" + l1,
        "PATCH",
        spec(t1, { date: "2030-06-19", capacity: 1 }),
        a,
      )
    ).status,
    409,
  );
  assert.equal(
    (await request("/teachers/" + t1, "DELETE", undefined, a)).status,
    409,
  );
});
test("editing lesson time checks existing students, including concurrent bookings", async () => {
  const t1 = await makeTeacher(a),
    t2 = await makeTeacher(a),
    sid = await makeStudent(a);
  const l1 = await makeLesson(a, t1, { date: "2030-06-20", time: "09:00" }),
    l2 = await makeLesson(a, t2, { date: "2030-06-20", time: "12:00" });
  assert.equal(
    (
      await request(
        "/bookings",
        "POST",
        { student: sid, lesson: l1, paid: false },
        a,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await request(
        "/bookings",
        "POST",
        { student: sid, lesson: l2, paid: false },
        a,
      )
    ).status,
    201,
  );
  assert.equal(
    (
      await request(
        "/lessons/" + l2,
        "PATCH",
        spec(t2, { date: "2030-06-20", time: "09:30" }),
        a,
      )
    ).status,
    409,
  );
});
test("logout revokes session server-side", async () => {
  const login = await request("/auth/login", "POST", {
    email: `b-${prefix}@example.com`,
    password,
  });
  assert.equal(login.status, 201);
  assert.equal(
    (await request("/auth/logout", "POST", undefined, login.cookie)).status,
    201,
  );
  assert.equal(
    (await request("/auth/me", "GET", undefined, login.cookie)).status,
    401,
  );
});

test("workspace snapshot only includes the authenticated school", async () => {
  const result = await request("/workspace", "GET", undefined, a);
  assert.equal(result.status, 200);
  assert.equal(result.body.school.id, schoolA);
  for (const l of result.body.lessons) assert.equal(l.schoolId, schoolA);
  for (const b of result.body.bookings)
    assert.ok(result.body.lessons.some((l: any) => l.id === b.lesson));
  const second = await request("/workspace", "GET", undefined, b);
  assert.equal(second.body.school.id, schoolB);
  assert.equal(second.body.lessons.length, 0);
});
test("expired session is rejected even before cleanup", async () => {
  const login = await request("/auth/login", "POST", {
    email: `b-${prefix}@example.com`,
    password,
  });
  assert.equal(login.status, 201);
  const token = login.cookie.split("=")[1];
  await pool.execute(
    "UPDATE sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 SECOND) WHERE token_hash=?",
    [tokenHash(token)],
  );
  assert.equal(
    (await request("/auth/me", "GET", undefined, login.cookie)).status,
    401,
  );
});
