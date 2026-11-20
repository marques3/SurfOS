import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Database, rows } from "../database/database.service";
import { tokenHash } from "./password";
import { Actor, AuthRequest } from "../common/types";
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly db: Database) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.cookies?.surfos_session;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      throw new UnauthorizedException("Inicia sessão para continuar.");
    const [user] = await rows<Actor>(
      this.db.pool,
      `SELECT u.id,u.school_id AS schoolId,u.name,u.email,u.role
      FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP(3)`,
      [tokenHash(token)],
    );
    if (!user)
      throw new UnauthorizedException(
        "A sessão expirou. Inicia sessão novamente.",
      );
    req.actor = user;
    return true;
  }
}
