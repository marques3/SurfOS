import { BadRequestException, ConflictException } from "@nestjs/common";
export const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T12:00:00Z`);
  return (
    !Number.isNaN(d.getTime()) &&
    d.toISOString().slice(0, 10) === date &&
    date >= "2000-01-01" &&
    date <= "2100-12-31"
  );
}
export function overlap(
  aTime: string,
  aDuration: number,
  bTime: string,
  bDuration: number,
) {
  return (
    minutes(aTime) < minutes(bTime) + bDuration &&
    minutes(bTime) < minutes(aTime) + aDuration
  );
}
export function lessonRules(d: {
  date: string;
  time: string;
  duration: number;
  level: string;
  capacity: number;
}) {
  if (!validDate(d.date)) throw new BadRequestException("Data inválida.");
  if (
    minutes(d.time) < 540 ||
    minutes(d.time) + d.duration > 900 ||
    minutes(d.time) % 30 !== 0
  )
    throw new BadRequestException(
      "As aulas decorrem entre as 09:00 e as 15:00, em intervalos de 30 minutos.",
    );
  if (d.level === "private" && d.capacity !== 1)
    throw new BadRequestException(
      "Uma aula privada tem capacidade para 1 aluno.",
    );
}
export function assertCapacity(current: number, capacity: number) {
  if (current >= capacity)
    throw new ConflictException("Esta aula está completa.");
}
