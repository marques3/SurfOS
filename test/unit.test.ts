import test from "node:test";
import assert from "node:assert/strict";
import {
  validDate,
  overlap,
  lessonRules,
  assertCapacity,
} from "../src/scheduling/rules";
import { hashPassword, verifyPassword, tokenHash } from "../src/auth/password";
import { config } from "../src/common/config";
test("calendar dates reject rollovers and accept leap years", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2025-02-29"), false);
  assert.equal(validDate("2026-13-01"), false);
});
test("adjacent classes are allowed, overlapping classes are not", () => {
  assert.equal(overlap("09:00", 90, "10:30", 60), false);
  assert.equal(overlap("09:00", 90, "10:00", 60), true);
  assert.equal(overlap("10:00", 60, "09:00", 120), true);
});
test("private capacity and operating hours are enforced", () => {
  const l = {
    date: "2026-11-20",
    time: "09:00",
    duration: 90,
    capacity: 6,
    level: "beginner",
  };
  assert.doesNotThrow(() => lessonRules(l));
  assert.throws(() => lessonRules({ ...l, level: "private" }));
  assert.throws(() => lessonRules({ ...l, time: "14:00" }));
  assert.throws(() => lessonRules({ ...l, time: "09:15" }));
  assert.throws(() => assertCapacity(6, 6));
  assert.doesNotThrow(() => assertCapacity(5, 6));
});
test("passwords are salted and verified; session tokens are hashed", async () => {
  const first = await hashPassword("test-password-123"),
    second = await hashPassword("test-password-123");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("test-password-123", first), true);
  assert.equal(await verifyPassword("incorrect-password", first), false);
  assert.equal(await verifyPassword("x", "malformed"), false);
  assert.equal(tokenHash("abc").length, 64);
});
test("production refuses plain HTTP and missing database password", () => {
  const old = { ...process.env };
  try {
    process.env.NODE_ENV = "production";
    process.env.APP_ORIGIN = "http://localhost:3000";
    assert.throws(config);
    process.env.APP_ORIGIN = "https://example.com";
    delete process.env.DB_PASSWORD;
    assert.throws(config);
  } finally {
    process.env = old;
  }
});
