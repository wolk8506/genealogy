import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { closeFaceDb } = require("../../src/main/db/faceDb.cjs");

const EMPTY_LIBRARY = {
  schemaVersion: 1,
  people: [],
};

export async function initEmptyLibraryRoot(root) {
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, "genealogy-data.json"),
    JSON.stringify(EMPTY_LIBRARY, null, 2),
    "utf-8",
  );
}

/**
 * Временная «библиотека» только для тестов (GENEALOGY_TEST_ROOT).
 */
export async function withTestLibrary(fn) {
  const root = await mkdtemp(join(tmpdir(), "genealogy-lib-test-"));
  const prev = process.env.GENEALOGY_TEST_ROOT;
  process.env.GENEALOGY_TEST_ROOT = root;

  try {
    await initEmptyLibraryRoot(root);
    await fn(root);
  } finally {
    closeFaceDb();
    if (prev != null) process.env.GENEALOGY_TEST_ROOT = prev;
    else delete process.env.GENEALOGY_TEST_ROOT;
    await rm(root, { recursive: true, force: true });
  }
}
