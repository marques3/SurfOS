import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  Database,
  Sql,
  audit,
  execute,
  rows,
} from "../database/database.service";
import type { Actor } from "../common/types";
import { SchoolDto, StudentDto, TeacherDto } from "./catalog.dto";
@Injectable()
export class CatalogService {
  constructor(private readonly db: Database) {}
  async school(a: Actor, c: Sql = this.db.pool) {
    return (
      await rows(c, "SELECT id,name,timezone FROM schools WHERE id=?", [
        a.schoolId,
      ])
    )[0];
  }
  async updateSchool(a: Actor, d: SchoolDto) {
    return this.db.mutate(a, async (c) => {
      await execute(c, "UPDATE schools SET name=? WHERE id=?", [
        d.name,
        a.schoolId,
      ]);
      await audit(c, a, "school.updated", a.schoolId);
      return { ok: true };
    });
  }
  teachers(a: Actor, c: Sql = this.db.pool) {
    return rows(
      c,
      "SELECT id,name,role,color,archived FROM teachers WHERE school_id=? ORDER BY created_at,id",
      [a.schoolId],
    );
  }
  students(a: Actor, c: Sql = this.db.pool) {
    return rows(
      c,
      "SELECT id,name,email,level,archived FROM students WHERE school_id=? ORDER BY name,id",
      [a.schoolId],
    );
  }
  async teacher(a: Actor, d: TeacherDto, id?: string) {
    return this.db.mutate(a, async (c) => {
      const entityId = id || randomUUID();
      if (id) {
        const r = await execute(
          c,
          "UPDATE teachers SET name=?,role=?,color=? WHERE id=? AND school_id=? AND archived=0",
          [d.name, d.role, d.color, id, a.schoolId],
        );
        if (!r.affectedRows) throw new NotFoundException();
      } else
        await execute(
          c,
          "INSERT INTO teachers (id,school_id,name,role,color) VALUES (?,?,?,?,?)",
          [entityId, a.schoolId, d.name, d.role, d.color],
        );
      await audit(c, a, id ? "teacher.updated" : "teacher.created", entityId);
      return { id: entityId };
    });
  }
  async student(a: Actor, d: StudentDto, id?: string) {
    try {
      return await this.db.mutate(a, async (c) => {
        const entityId = id || randomUUID();
        if (id) {
          const r = await execute(
            c,
            "UPDATE students SET name=?,email=?,level=? WHERE id=? AND school_id=? AND archived=0",
            [d.name, d.email, d.level, id, a.schoolId],
          );
          if (!r.affectedRows) throw new NotFoundException();
        } else
          await execute(
            c,
            "INSERT INTO students (id,school_id,name,email,level) VALUES (?,?,?,?,?)",
            [entityId, a.schoolId, d.name, d.email, d.level],
          );
        await audit(c, a, id ? "student.updated" : "student.created", entityId);
        return { id: entityId };
      });
    } catch (e: any) {
      if (e.code === "ER_DUP_ENTRY")
        throw new ConflictException("Já existe um aluno com este email.");
      throw e;
    }
  }
  archive(a: Actor, kind: "teachers" | "students", id: string) {
    return this.db.mutate(a, async (c) => {
      const found = await rows(
        c,
        `SELECT id FROM ${kind} WHERE id=? AND school_id=? AND archived=0`,
        [id, a.schoolId],
      );
      if (!found.length) throw new NotFoundException();
      // Archive only after removing future active commitments. History remains intact.
      const now = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Lisbon",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());
      const active =
        kind === "teachers"
          ? await rows(
              c,
              "SELECT id FROM lessons WHERE school_id=? AND teacher_id=? AND status='active' AND DATE_ADD(TIMESTAMP(lesson_date,start_time),INTERVAL duration_minutes MINUTE)>=?",
              [a.schoolId, id, now],
            )
          : await rows(
              c,
              "SELECT b.id FROM bookings b JOIN lessons l ON l.id=b.lesson_id WHERE b.school_id=? AND b.student_id=? AND b.status='confirmed' AND l.status='active' AND DATE_ADD(TIMESTAMP(l.lesson_date,l.start_time),INTERVAL l.duration_minutes MINUTE)>=?",
              [a.schoolId, id, now],
            );
      if (active.length)
        throw new ConflictException(
          "Existem aulas ou reservas futuras. Cancela-as antes de arquivar.",
        );
      await execute(
        c,
        `UPDATE ${kind} SET archived=1 WHERE id=? AND school_id=?`,
        [id, a.schoolId],
      );
      await audit(c, a, `${kind}.archived`, id);
      return { ok: true };
    });
  }
}
