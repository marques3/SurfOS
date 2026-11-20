import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { Database, execute, rows } from "./database.service";
import { hashPassword } from "../auth/password";
async function main() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.SEED_CONFIRM !== "demo-only"
  )
    throw new Error(
      "Demo seed requires non-production NODE_ENV and SEED_CONFIRM=demo-only",
    );
  const email = process.env.SEED_EMAIL?.trim().toLowerCase(),
    password = process.env.SEED_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error("Set SEED_EMAIL and SEED_PASSWORD (12+ characters)");
  const db = new Database();
  try {
    if (
      (await rows(db.pool, "SELECT id FROM users WHERE email=?", [email]))
        .length
    )
      throw new Error(
        "This email already exists. Seed does not overwrite data.",
      );
    const hash = await hashPassword(password);
    const data = {
      school: "Vicentina Surf School",
      teachers: [
        {
          id: "t1",
          name: "Miguel Costa",
          role: "Head coach",
          color: "#d9e2cd",
        },
        { id: "t2", name: "Joana Silva", role: "Surf coach", color: "#ecdccd" },
        { id: "t3", name: "Tomás Reis", role: "Surf coach", color: "#d6e3e8" },
      ],
      students: [
        {
          id: "s1",
          name: "Emma Wilson",
          email: "emma@example.com",
          level: "beginner",
        },
        {
          id: "s2",
          name: "Lukas Meyer",
          email: "lukas@example.com",
          level: "intermediate",
        },
        {
          id: "s3",
          name: "Sofia Martins",
          email: "sofia@example.com",
          level: "beginner",
        },
        {
          id: "s4",
          name: "James Taylor",
          email: "james@example.com",
          level: "intermediate",
        },
        {
          id: "s5",
          name: "Inês Santos",
          email: "ines@example.com",
          level: "beginner",
        },
        {
          id: "s6",
          name: "Noah Bernard",
          email: "noah@example.com",
          level: "beginner",
        },
        {
          id: "s7",
          name: "Ana Oliveira",
          email: "ana@example.com",
          level: "intermediate",
        },
        {
          id: "s8",
          name: "Felix Weber",
          email: "felix@example.com",
          level: "beginner",
        },
      ],
      lessons: [
        {
          id: "l1",
          date: "2026-11-19",
          time: "09:00",
          duration: 90,
          teacher: "t1",
          beach: "Arrifana",
          level: "beginner",
          capacity: 6,
          price: 45,
        },
        {
          id: "l2",
          date: "2026-11-19",
          time: "12:00",
          duration: 90,
          teacher: "t1",
          beach: "Monte Clérigo",
          level: "intermediate",
          capacity: 5,
          price: 50,
        },
        {
          id: "l3",
          date: "2026-11-19",
          time: "10:00",
          duration: 90,
          teacher: "t2",
          beach: "Arrifana",
          level: "beginner",
          capacity: 6,
          price: 45,
        },
        {
          id: "l4",
          date: "2026-11-19",
          time: "13:30",
          duration: 90,
          teacher: "t2",
          beach: "Amoreira",
          level: "beginner",
          capacity: 6,
          price: 45,
        },
        {
          id: "l5",
          date: "2026-11-19",
          time: "09:00",
          duration: 90,
          teacher: "t3",
          beach: "Monte Clérigo",
          level: "intermediate",
          capacity: 5,
          price: 50,
        },
        {
          id: "l6",
          date: "2026-11-19",
          time: "13:00",
          duration: 60,
          teacher: "t3",
          beach: "Arrifana",
          level: "private",
          capacity: 1,
          price: 90,
        },
      ],
      bookings: [
        { id: "b1", student: "s1", lesson: "l1", paid: true },
        { id: "b2", student: "s3", lesson: "l1", paid: true },
        { id: "b3", student: "s5", lesson: "l3", paid: false },
        { id: "b4", student: "s6", lesson: "l3", paid: true },
        { id: "b5", student: "s2", lesson: "l2", paid: true },
        { id: "b6", student: "s4", lesson: "l5", paid: false },
        { id: "b7", student: "s7", lesson: "l6", paid: true },
        { id: "b8", student: "s8", lesson: "l4", paid: true },
      ],
    };
    const schoolId = randomUUID(),
      userId = randomUUID();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Lisbon",
    }).format(new Date());
    const ids = new Map<string, string>();
    const id = (old: string) => {
      if (!ids.has(old)) ids.set(old, randomUUID());
      return ids.get(old)!;
    };
    await db.transaction(async (c) => {
      await execute(c, "INSERT INTO schools (id,name) VALUES (?,?)", [
        schoolId,
        data.school,
      ]);
      await execute(
        c,
        "INSERT INTO users (id,school_id,name,email,password_hash) VALUES (?,?,?,?,?)",
        [userId, schoolId, "Administrador Demo", email, hash],
      );
      for (const p of data.teachers)
        await execute(
          c,
          "INSERT INTO teachers (id,school_id,name,role,color) VALUES (?,?,?,?,?)",
          [id(p.id), schoolId, p.name, p.role, p.color],
        );
      for (const s of data.students)
        await execute(
          c,
          "INSERT INTO students (id,school_id,name,email,level) VALUES (?,?,?,?,?)",
          [id(s.id), schoolId, s.name, s.email, s.level],
        );
      for (const l of data.lessons)
        await execute(
          c,
          "INSERT INTO lessons (id,school_id,teacher_id,lesson_date,start_time,duration_minutes,beach,level,capacity,price_cents) VALUES (?,?,?,?,?,?,?,?,?,?)",
          [
            id(l.id),
            schoolId,
            id(l.teacher),
            today,
            l.time,
            l.duration,
            l.beach,
            l.level,
            l.capacity,
            Math.round(l.price * 100),
          ],
        );
      for (const b of data.bookings) {
        const l = data.lessons.find((l) => l.id === b.lesson)!;
        await execute(
          c,
          "INSERT INTO bookings (id,school_id,lesson_id,student_id,price_cents,paid) VALUES (?,?,?,?,?,?)",
          [
            id(b.id),
            schoolId,
            id(b.lesson),
            id(b.student),
            Math.round(l.price * 100),
            b.paid,
          ],
        );
      }
    });
    console.log(
      "Demo school created. Use the SEED_EMAIL and SEED_PASSWORD you configured.",
    );
  } finally {
    await db.onApplicationShutdown();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
