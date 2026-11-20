import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await derive(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algorithm, salt, value] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !value) return false;
  const expected = Buffer.from(value, "hex");
  const actual = (await derive(password, salt, 64)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
