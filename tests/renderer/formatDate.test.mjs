import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatNotificationDate } from "../../src/utils/formatDate.js";

describe("formatNotificationDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T14:30:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Только что" for very recent timestamps', () => {
    expect(formatNotificationDate("2026-06-15T14:29:30")).toBe("Только что");
  });

  it("shows minutes ago within the same hour", () => {
    expect(formatNotificationDate("2026-06-15T13:45:00")).toBe("45 мин. назад");
  });

  it("shows clock time for earlier today", () => {
    expect(formatNotificationDate("2026-06-15T09:05:00")).toBe("09:05");
  });

  it("prefixes yesterday with time", () => {
    expect(formatNotificationDate("2026-06-14T20:00:00")).toBe("Вчера, 20:00");
  });
});
