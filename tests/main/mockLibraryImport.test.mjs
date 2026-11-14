import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { readFile, access, readdir } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runMockLibrary } from "../helpers/runMockLibrary.mjs";
import { buildZipFromLibraryRoot } from "../helpers/buildZipFromLibraryRoot.mjs";
import { withTestLibrary } from "../helpers/testLibraryRoot.mjs";

const require = createRequire(import.meta.url);
const { importZipFromPath } = require("../../src/main/handlers/importZipApply.cjs");
const { readPeople } = require("../../src/main/handlers/dataStore.cjs");
const {
  runFaceDbIntegrityCheck,
  initializeFaceDb,
  closeFaceDb,
} = require("../../src/main/db/faceDb.cjs");

async function pickPeopleWithOriginalPhotos(mockRoot, limit = 2) {
  const ids = [];
  const peopleDir = join(mockRoot, "people");
  for (const id of await readdir(peopleDir)) {
    const originalDir = join(peopleDir, id, "photos", "original");
    try {
      const files = await readdir(originalDir);
      if (files.length > 0) ids.push(Number(id));
    } catch {
      // нет альбома
    }
    if (ids.length >= limit) break;
  }
  if (ids.length < limit) {
    throw new Error(`mock:library: мало людей с фото в original (найдено ${ids.length})`);
  }
  return ids;
}

describe("mock:library → ZIP → import (tmpdir only)", () => {
  it(
    "generates mock library and imports two people into empty temp root",
    async () => {
      const mockRoot = await mkdtemp(join(tmpdir(), "genealogy-mock-src-"));
      const zipWork = await mkdtemp(join(tmpdir(), "genealogy-mock-zip-"));

      try {
        await runMockLibrary(mockRoot, 1);

        await access(join(mockRoot, "MOCK_README.txt"), fsConstants.F_OK);
        const mockData = JSON.parse(
          await readFile(join(mockRoot, "genealogy-data.json"), "utf-8"),
        );
        expect(mockData.people.length).toBeGreaterThanOrEqual(20);

        const sampleIds = await pickPeopleWithOriginalPhotos(mockRoot, 2);
        const zipPath = join(zipWork, "from-mock.zip");
        await buildZipFromLibraryRoot(mockRoot, zipPath, {
          personIds: sampleIds,
          photoFolders: ["original", "webp"],
          includeTags: true,
        });

        await withTestLibrary(async (libraryRoot) => {
          const result = await importZipFromPath(zipPath, {
            includeTags: true,
            photoFolders: ["original", "webp"],
          });

          expect(result.ok).toBe(true);
          expect(result.report.success).toBe(2);

          const people = await readPeople();
          const importedIds = people.map((p) => p.id).sort();
          expect(importedIds).toEqual([...sampleIds].sort());

          for (const id of sampleIds) {
            const originalDir = join(
              libraryRoot,
              "people",
              String(id),
              "photos",
              "original",
            );
            const files = await readdir(originalDir);
            expect(files.length).toBeGreaterThan(0);
          }

          const sqlitePath = join(libraryRoot, "genealogy.sqlite");
          if (await access(sqlitePath, fsConstants.F_OK).then(() => true).catch(() => false)) {
            closeFaceDb();
            initializeFaceDb();
            const integrity = runFaceDbIntegrityCheck();
            expect(integrity.ok).toBe(true);
            closeFaceDb();
          }
        });
      } finally {
        await rm(mockRoot, { recursive: true, force: true });
        await rm(zipWork, { recursive: true, force: true });
      }
    },
    180_000,
  );
});
