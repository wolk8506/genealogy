import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { readFile, readdir, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { runMockLibrary } from "../helpers/runMockLibrary.mjs";
import { buildZipFromLibraryRoot } from "../helpers/buildZipFromLibraryRoot.mjs";
import { withTestLibrary } from "../helpers/testLibraryRoot.mjs";

const require = createRequire(import.meta.url);
const { importZipFromPath } = require("../../src/main/handlers/importZipApply.cjs");
const { readPeople } = require("../../src/main/handlers/dataStore.cjs");

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

function pickPersonFields(person) {
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    gender: person.gender,
    birthDate: person.birthDate,
    deathDate: person.deathDate,
  };
}

describe("mock library round-trip", () => {
  it(
    "ZIP export from mock → import → matching people and photos.json",
    async () => {
      const mockRoot = await mkdtemp(join(tmpdir(), "genealogy-roundtrip-src-"));
      const zipWork = await mkdtemp(join(tmpdir(), "genealogy-roundtrip-zip-"));

      try {
        await runMockLibrary(mockRoot, 2);
        const sampleIds = await pickPeopleWithOriginalPhotos(mockRoot, 2);

        const sourceData = JSON.parse(
          await readFile(join(mockRoot, "genealogy-data.json"), "utf-8"),
        );
        const sourcePeople = sampleIds.map((id) =>
          pickPersonFields(sourceData.people.find((p) => p.id === id)),
        );

        const zipPath = join(zipWork, "roundtrip.zip");
        await buildZipFromLibraryRoot(mockRoot, zipPath, {
          personIds: sampleIds,
          photoFolders: ["original", "webp"],
          includeTags: false,
        });

        await withTestLibrary(async (libraryRoot) => {
          const result = await importZipFromPath(zipPath, {
            includeTags: false,
            photoFolders: ["original", "webp"],
          });
          expect(result.ok).toBe(true);
          expect(result.report.success).toBe(2);

          const imported = await readPeople();
          for (const expected of sourcePeople) {
            const actual = pickPersonFields(
              imported.find((p) => p.id === expected.id),
            );
            expect(actual).toEqual(expected);
          }

          const sourcePhotosPath = join(
            mockRoot,
            "people",
            String(sampleIds[0]),
            "photos.json",
          );
          const targetPhotosPath = join(
            libraryRoot,
            "people",
            String(sampleIds[0]),
            "photos.json",
          );

          await access(sourcePhotosPath, fsConstants.F_OK);
          await access(targetPhotosPath, fsConstants.F_OK);

          const sourcePhotos = JSON.parse(await readFile(sourcePhotosPath, "utf-8"));
          const targetPhotos = JSON.parse(await readFile(targetPhotosPath, "utf-8"));
          expect(Array.isArray(sourcePhotos)).toBe(true);
          expect(targetPhotos.length).toBe(sourcePhotos.length);
          expect(targetPhotos.map((p) => p.id).sort()).toEqual(
            sourcePhotos.map((p) => p.id).sort(),
          );
        });
      } finally {
        await rm(mockRoot, { recursive: true, force: true });
        await rm(zipWork, { recursive: true, force: true });
      }
    },
    180_000,
  );
});
