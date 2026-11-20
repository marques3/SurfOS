import type { Request } from "express";
export interface Actor {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  role: "owner";
}
export interface AuthRequest extends Request {
  actor: Actor;
}
export interface Lesson {
  id: string;
  schoolId: string;
  teacher: string;
  date: string;
  time: string;
  duration: number;
  beach: string;
  level: "beginner" | "intermediate" | "private";
  capacity: number;
  priceCents: number;
  status: "active" | "cancelled";
}
export interface Booking {
  id: string;
  schoolId: string;
  lesson: string;
  student: string;
  priceCents: number;
  paid: boolean;
  status: "confirmed" | "cancelled";
}
