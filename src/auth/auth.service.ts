import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { randomBytes, randomUUID } from "node:crypto";
import type { Response } from "express";
import { Database, execute, rows } from "../database/database.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { hashPassword, tokenHash, verifyPassword } from "./password";
import { config } from "../common/config";
import { Actor } from "../common/types";
@Injectable()
export class AuthService {
  // Perform a real KDF for unknown users too, reducing email enumeration by timing.
  private readonly dummyHash = hashPassword(randomBytes(24).toString("hex"));
  constructor(private readonly db: Database) {}
  private async session(user: Actor, res: Response) {
    const token = randomBytes(32).toString("hex");
    await execute(
      this.db.pool,
      "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 8 HOUR))",
      [tokenHash(token), user.id],
    );
    res.cookie("surfos_session", token, {
      httpOnly: true,
      secure: config().production,
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60 * 1000,
    });
    return user;
  }
  async register(dto: RegisterDto, res: Response) {
    if (!config().registration)
      throw new ForbiddenException("O registo de escolas está desativado.");
    const hash = await hashPassword(dto.password);
    const user: Actor = {
      id: randomUUID(),
      schoolId: randomUUID(),
      name: dto.name,
      email: dto.email,
      role: "owner",
    };
    try {
      await this.db.transaction(async (c) => {
        await execute(c, "INSERT INTO schools (id,name) VALUES (?,?)", [
          user.schoolId,
          dto.school,
        ]);
        await execute(
          c,
          "INSERT INTO users (id,school_id,name,email,password_hash) VALUES (?,?,?,?,?)",
          [user.id, user.schoolId, user.name, user.email, hash],
        );
      });
    } catch (e: any) {
      if (e.code === "ER_DUP_ENTRY")
        throw new ConflictException(
          "Não foi possível criar a conta com este email.",
        );
      throw e;
    }
    return this.session(user, res);
  }
  async login(dto: LoginDto, res: Response) {
    const [record] = await rows<Actor & { passwordHash: string }>(
      this.db.pool,
      "SELECT id,school_id AS schoolId,name,email,role,password_hash AS passwordHash FROM users WHERE email=?",
      [dto.email],
    );
    const valid = await verifyPassword(
      dto.password,
      record?.passwordHash || (await this.dummyHash),
    );
    if (!record || !valid)
      throw new UnauthorizedException("Email ou palavra-passe incorretos.");
    const { passwordHash, ...user } = record;
    return this.session(user, res);
  }
  async logout(token: string | undefined, res: Response) {
    if (token)
      await execute(this.db.pool, "DELETE FROM sessions WHERE token_hash=?", [
        tokenHash(token),
      ]);
    res.clearCookie("surfos_session", {
      httpOnly: true,
      secure: config().production,
      sameSite: "strict",
      path: "/",
    });
    return { ok: true };
  }
}
