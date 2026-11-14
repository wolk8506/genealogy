import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);
const {
  withWriteLock,
  writeJsonAtomic,
  readJsonFile,
  writeTextAtomic,
} = require("../../src/main/handlers/jsonStore.cjs");

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

describe("jsonStore", () => {
  let workDir;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "json-store-test-"));
  });

  afterEach(async () => {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  it("writeJsonAtomic leaves final file without tmp siblings", async () => {
    const target = join(workDir, "nested", "data.json");
    await writeJsonAtomic(target, { ok: true, n: 1 });
    const raw = await readFile(target, "utf-8");
    expect(JSON.parse(raw)).toEqual({ ok: true, n: 1 });
    const siblings = await readdir(join(workDir, "nested"));
    expect(siblings.some((name) => name.includes(".tmp."))).toBe(false);
  });

  it("readJsonFile returns fallback when file missing", async () => {
    const value = await readJsonFile(join(workDir, "missing.json"), { empty: true });
    expect(value).toEqual({ empty: true });
  });

  it("writeTextAtomic appends readable text", async () => {
    const target = join(workDir, "log.jsonl");
    await writeTextAtomic(target, '{"a":1}\n');
    expect(await readFile(target, "utf-8")).toBe('{"a":1}\n');
  });

  it("withWriteLock runs writers one after another", async () => {
    const order = [];
    const target = join(workDir, "counter.json");

    await Promise.all([
      withWriteLock(async () => {
        order.push("start-1");
        await writeJsonAtomic(target, { step: 1 });
        await delay(30);
        order.push("end-1");
      }),
      withWriteLock(async () => {
        order.push("start-2");
        await writeJsonAtomic(target, { step: 2 });
        order.push("end-2");
      }),
    ]);

    expect(order).toEqual(["start-1", "end-1", "start-2", "end-2"]);
    const final = await readJsonFile(target, null);
    expect(final.step).toBe(2);
  });
});
