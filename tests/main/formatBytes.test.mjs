import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { formatBytes } = require("../../src/main/config.cjs");

describe("formatBytes", () => {
  it("handles null/undefined", () => {
    expect(formatBytes(null)).toBe("неизвестно");
    expect(formatBytes(undefined)).toBe("неизвестно");
  });

  it("formats bytes below 1 KiB", () => {
    expect(formatBytes(0)).toBe("0 Б");
    expect(formatBytes(512)).toBe("512 Б");
  });

  it("steps through KiB, MiB, GiB", () => {
    expect(formatBytes(1024)).toBe("1.0 КБ");
    expect(formatBytes(1536)).toBe("1.5 КБ");
    expect(formatBytes(1024 * 1024)).toBe("1.0 МБ");
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 ГБ");
  });

  it("uses fewer decimals for large values", () => {
    expect(formatBytes(100 * 1024 * 1024)).toBe("100 МБ");
  });
});
