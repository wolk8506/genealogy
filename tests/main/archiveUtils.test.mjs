import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);
const {
  listFilesRecursive,
  getTotalSize,
  getArchiveRoot,
  toArchiveEntryName,
} = require("../../src/main/handlers/archiveUtils.cjs");

describe("archiveUtils", () => {
  let root;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "archive-utils-"));
    await writeFile(join(root, "genealogy-data.json"), "{}", "utf-8");
    await mkdir(join(root, "people", "1", "photos", "original"), {
      recursive: true,
    });
    await writeFile(join(root, "people", "1", "photos", "original", "a.jpg"), "x");
    await writeFile(join(root, "people", "1", "photos.json"), "[]", "utf-8");
  });

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("lists nested library files", () => {
    const files = listFilesRecursive([root]);
    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(files.some((f) => f.endsWith("a.jpg"))).toBe(true);
  });

  it("getArchiveRoot prefers genealogy-data.json parent", () => {
    const dataPath = join(root, "genealogy-data.json");
    const other = join(root, "tags.json");
    expect(getArchiveRoot([other, dataPath])).toBe(root);
  });

  it("toArchiveEntryName normalizes separators", () => {
    const src = join(root, "people", "1", "photos.json");
    expect(toArchiveEntryName(root, src)).toBe("people/1/photos.json");
  });

  it("getTotalSize sums file bytes", () => {
    const files = listFilesRecursive([root]);
    expect(getTotalSize(files)).toBeGreaterThan(0);
  });
});
