import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  Database,
  Sql,
  audit,
  execute,
  rows,
} from "../database/database.service";
import type { Actor, Booking, Lesson } from "../common/types";
import {
  BookingDto,
  LessonDto,
  PaymentDto,
  ScheduleQuery,
} from "./scheduling.dto";
import { assertCapacity, lessonRules, overlap, validDate } from "./rules";
const lessonSelect = `SELECT id,school_id AS schoolId,teacher_id AS teacher,DATE_FORMAT(lesson_date,'%Y-%m-%d') AS date,
  TIME_FORMAT(start_time,'%H:%i') AS time,duration_minutes AS duration,beach,level,capacity,price_cents AS priceCents,status FROM lessons`;
const bookingSelect =
  "SELECT id,school_id AS schoolId,lesson_id AS lesson,student_id AS student,price_cents AS priceCents,paid,status FROM bookings";
@Injectable()
export class SchedulingService {
  constructor(private readonly db: Database) {}
  private async getLesson(c: Sql, a: Actor, id: string) {
    const [l] = await rows<Lesson>(
      c,
      `${lessonSelect} WHERE school_id=? AND id=? AND status='active'`,
      [a.schoolId, id],
    );
    if (!l) throw new NotFoundException("Aula não encontrada.");
    return l;
  }
  async lessons(a: Actor, q: ScheduleQuery = {}, c: Sql = this.db.pool) {
    if (
      (q.from && !validDate(q.from)) ||
      (q.to && !validDate(q.to)) ||
      (q.from && q.to && q.to < q.from)
    )
      throw new BadRequestException("Intervalo de datas inválido.");
    return rows<Lesson>(
      c,
      `${lessonSelect} WHERE school_id=? AND status='active'${q.from ? " AND lesson_date>=?" : ""}${q.to ? " AND lesson_date<=?" : ""} ORDER BY lesson_date,start_time,id`,
      [a.schoolId, ...(q.from ? [q.from] : []), ...(q.to ? [q.to] : [])],
    );
  }
  async bookings(a: Actor, c: Sql = this.db.pool) {
    const b = await rows<Booking>(
      c,
      `${bookingSelect} WHERE school_id=? AND status='confirmed' ORDER BY created_at,id`,
      [a.schoolId],
    );
    return b.map((x) => ({ ...x, paid: Boolean(x.paid) }));
  }
  async saveLesson(a: Actor, d: LessonDto, id?: string) {
    lessonRules(d);
    return this.db.mutate(a, async (c) => {
      if (id) await this.getLesson(c, a, id);
      const instructors = await rows(
        c,
        "SELECT id FROM teachers WHERE school_id=? AND id=? AND archived=0",
        [a.schoolId, d.teacher],
      );
      if (!instructors.length)
        throw new NotFoundException("Instrutor não encontrado.");
      const sameDay = await rows<Lesson>(
        c,
        `${lessonSelect} WHERE school_id=? AND lesson_date=? AND status='active'`,
        [a.schoolId, d.date],
      );
      if (
        sameDay.some(
          (l) =>
            l.id !== id &&
            l.teacher === d.teacher &&
            overlap(d.time, d.duration, l.time, l.duration),
        )
      )
        throw new ConflictException(
          "Este instrutor já tem uma aula nesse horário.",
        );
      if (id) {
        const booked = await rows<{ student: string }>(
          c,
          "SELECT student_id AS student FROM bookings WHERE school_id=? AND lesson_id=? AND status='confirmed'",
          [a.schoolId, id],
        );
        if (booked.length > d.capacity)
          throw new ConflictException(
            "A lotação é inferior ao número de reservas.",
          );
        for (const b of booked) {
          const other = await rows<Lesson>(
            c,
            `SELECT TIME_FORMAT(l.start_time,'%H:%i') AS time,l.duration_minutes AS duration FROM bookings b JOIN lessons l ON l.id=b.lesson_id WHERE b.school_id=? AND b.student_id=? AND b.lesson_id<>? AND b.status='confirmed' AND l.status='active' AND l.lesson_date=?`,
            [a.schoolId, b.student, id, d.date],
          );
          if (
            other.some((l) => overlap(d.time, d.duration, l.time, l.duration))
          )
            throw new ConflictException(
              "Um aluno reservado tem outra aula neste horário.",
            );
        }
      }
      const entityId = id || randomUUID();
      const values = [
        d.teacher,
        d.date,
        d.time,
        d.duration,
        d.beach,
        d.level,
        d.capacity,
        d.priceCents,
      ];
      if (id)
        await execute(
          c,
          "UPDATE lessons SET teacher_id=?,lesson_date=?,start_time=?,duration_minutes=?,beach=?,level=?,capacity=?,price_cents=? WHERE id=? AND school_id=?",
          [...values, id, a.schoolId],
        );
      else
        await execute(
          c,
          "INSERT INTO lessons (teacher_id,lesson_date,start_time,duration_minutes,beach,level,capacity,price_cents,id,school_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
          [...values, entityId, a.schoolId],
        );
      await audit(c, a, id ? "lesson.updated" : "lesson.created", entityId);
      return { id: entityId };
    });
  }
  cancelLesson(a: Actor, id: string) {
    return this.db.mutate(a, async (c) => {
      await this.getLesson(c, a, id);
      await execute(
        c,
        "UPDATE lessons SET status='cancelled' WHERE id=? AND school_id=?",
        [id, a.schoolId],
      );
      await execute(
        c,
        "UPDATE bookings SET status='cancelled' WHERE lesson_id=? AND school_id=? AND status='confirmed'",
        [id, a.schoolId],
      );
      await audit(c, a, "lesson.cancelled", id);
      return { ok: true };
    });
  }
  book(a: Actor, d: BookingDto) {
    return this.db.mutate(a, async (c) => {
      const l = await this.getLesson(c, a, d.lesson);
      const s = await rows(
        c,
        "SELECT id FROM students WHERE school_id=? AND id=? AND archived=0",
        [a.schoolId, d.student],
      );
      if (!s.length) throw new NotFoundException("Aluno não encontrado.");
      const current = await rows<{ id: string }>(
        c,
        "SELECT id FROM bookings WHERE school_id=? AND lesson_id=? AND student_id=? AND status='confirmed'",
        [a.schoolId, d.lesson, d.student],
      );
      if (current.length)
        throw new ConflictException("Este aluno já está inscrito nesta aula.");
      const [{ n }] = await rows<{ n: number }>(
        c,
        "SELECT COUNT(*) AS n FROM bookings WHERE school_id=? AND lesson_id=? AND status='confirmed'",
        [a.schoolId, d.lesson],
      );
      assertCapacity(Number(n), l.capacity);
      const other = await rows<Lesson>(
        c,
        `SELECT TIME_FORMAT(l.start_time,'%H:%i') AS time,l.duration_minutes AS duration FROM bookings b JOIN lessons l ON l.id=b.lesson_id WHERE b.school_id=? AND b.student_id=? AND b.status='confirmed' AND l.status='active' AND l.lesson_date=?`,
        [a.schoolId, d.student, l.date],
      );
      if (other.some((o) => overlap(l.time, l.duration, o.time, o.duration)))
        throw new ConflictException(
          "Este aluno já tem outra aula neste horário.",
        );
      const [old] = await rows<{ id: string; paid: number }>(
        c,
        "SELECT id,paid FROM bookings WHERE school_id=? AND lesson_id=? AND student_id=?",
        [a.schoolId, d.lesson, d.student],
      );
      // Preserve cancelled financial history. A paid cancelled booking requires
      // manual reconciliation, not silent reactivation or resetting payment.
      if (old?.paid)
        throw new ConflictException(
          "Existe uma reserva cancelada com pagamento registado. Regulariza-a fora da aplicação antes de uma nova reserva.",
        );
      const id = old?.id || randomUUID();
      if (old)
        await execute(
          c,
          "UPDATE bookings SET status='confirmed',paid=?,price_cents=? WHERE school_id=? AND id=?",
          [d.paid, l.priceCents, a.schoolId, id],
        );
      else
        await execute(
          c,
          "INSERT INTO bookings (id,school_id,lesson_id,student_id,price_cents,paid) VALUES (?,?,?,?,?,?)",
          [id, a.schoolId, d.lesson, d.student, l.priceCents, d.paid],
        );
      await audit(c, a, "booking.created", id);
      return { id };
    });
  }
  payment(a: Actor, id: string, d: PaymentDto) {
    return this.db.mutate(a, async (c) => {
      const r = await execute(
        c,
        "UPDATE bookings SET paid=? WHERE id=? AND school_id=? AND status='confirmed'",
        [d.paid, id, a.schoolId],
      );
      if (!r.affectedRows)
        throw new NotFoundException("Reserva não encontrada.");
      await audit(
        c,
        a,
        d.paid ? "payment.marked_paid" : "payment.marked_pending",
        id,
      );
      return { ok: true };
    });
  }
  cancelBooking(a: Actor, id: string) {
    return this.db.mutate(a, async (c) => {
      const r = await execute(
        c,
        "UPDATE bookings SET status='cancelled' WHERE id=? AND school_id=? AND status='confirmed'",
        [id, a.schoolId],
      );
      if (!r.affectedRows)
        throw new NotFoundException("Reserva não encontrada.");
      await audit(c, a, "booking.cancelled", id);
      return { ok: true };
    });
  }
  async audit(a: Actor) {
    return rows(
      this.db.pool,
      "SELECT id,action,entity_id AS entityId,created_at AS createdAt FROM audit_log WHERE school_id=? ORDER BY id DESC LIMIT 200",
      [a.schoolId],
    );
  }
  async cancellationHistory(a: Actor) {
    const result = await rows<Booking>(
      this.db.pool,
      `${bookingSelect} WHERE school_id=? AND status='cancelled' ORDER BY updated_at DESC LIMIT 500`,
      [a.schoolId],
    );
    return result.map((x) => ({ ...x, paid: Boolean(x.paid) }));
  }
}
