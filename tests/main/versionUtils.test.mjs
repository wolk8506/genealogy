import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isNewerVersion } = require("../../src/main/versionUtils.cjs");

describe("isNewerVersion", () => {
  it("returns true when remote is greater by patch", () => {
    expect(isNewerVersion("1.14.1", "1.14.0")).toBe(true);
  });

  it("returns true when remote is greater by minor", () => {
    expect(isNewerVersion("1.15.0", "1.14.9")).toBe(true);
  });

  it("returns false when versions are equal", () => {
    expect(isNewerVersion("1.14.0", "1.14.0")).toBe(false);
  });

  it("returns false when remote is older (no downgrade offers)", () => {
    expect(isNewerVersion("1.13.8", "1.14.0")).toBe(false);
  });

  it("handles different segment counts", () => {
    expect(isNewerVersion("2.0", "1.99.99")).toBe(true);
    expect(isNewerVersion("1.0", "1.0.1")).toBe(false);
  });
});
