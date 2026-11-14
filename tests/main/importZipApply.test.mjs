import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { constants as fsConstants } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { writeFile } from "node:fs/promises";
import { buildMinimalImportZip } from "../helpers/buildMinimalImportZip.mjs";
import { withTestLibrary } from "../helpers/testLibraryRoot.mjs";

const require = createRequire(import.meta.url);
const { importZipFromPath } = require("../../src/main/handlers/importZipApply.cjs");
const { readPeople } = require("../../src/main/handlers/dataStore.cjs");
const {
  runFaceDbIntegrityCheck,
  initializeFaceDb,
  closeFaceDb,
} = require("../../src/main/db/faceDb.cjs");

describe("importZipFromPath → temp mock library", () => {
  it("imports people, tags, and original photos only", async () => {
    await withTestLibrary(async (libraryRoot) => {
      const zipWork = await mkdtemp(join(tmpdir(), "genealogy-import-zip-"));
      const zipPath = join(zipWork, "backup.zip");
      try {
        await buildMinimalImportZip(zipPath);

        const result = await importZipFromPath(zipPath, {
          includeTags: true,
          photoFolders: ["original"],
        });

        expect(result.ok).toBe(true);
        expect(result.report.success).toBe(2);
        expect(result.report.failed).toBe(0);
        expect(result.report.tagsImported).toBe(true);

        const people = await readPeople();
        expect(people).toHaveLength(2);
        expect(people.map((p) => p.id).sort()).toEqual([90001, 90002]);

        const originalFile = join(
          libraryRoot,
          "people/90001/photos/original/placeholder.txt",
        );
        const thumbsFile = join(
          libraryRoot,
          "people/90001/photos/thumbs/placeholder.txt",
        );

        await access(originalFile, fsConstants.F_OK);
        await expect(access(thumbsFile, fsConstants.F_OK)).rejects.toThrow();

        const tagsRaw = await readFile(join(libraryRoot, "tags.json"), "utf-8");
        const tags = JSON.parse(tagsRaw);
        expect(tags.tags.some((t) => t.id === "t1")).toBe(true);
      } finally {
        await rm(zipWork, { recursive: true, force: true });
      }
    });
  });

  it("restores genealogy.sqlite from ZIP", async () => {
    await withTestLibrary(async (libraryRoot) => {
      const zipWork = await mkdtemp(join(tmpdir(), "genealogy-import-zip-"));
      const zipPath = join(zipWork, "backup-with-db.zip");
      try {
        await buildMinimalImportZip(zipPath, {
          withDbArtifact: true,
          withTags: false,
        });

        const result = await importZipFromPath(zipPath, {
          includeTags: false,
          photoFolders: ["original"],
        });

        expect(result.ok).toBe(true);
        expect(result.report.restoredDatabaseFiles).toContain("genealogy.sqlite");

        await access(join(libraryRoot, "genealogy.sqlite"), fsConstants.F_OK);

        closeFaceDb();
        initializeFaceDb();
        const integrity = runFaceDbIntegrityCheck();
        expect(integrity.ok).toBe(true);
        closeFaceDb();
      } finally {
        await rm(zipWork, { recursive: true, force: true });
      }
    });
  });

  it("merges into existing person when id conflicts", async () => {
    await withTestLibrary(async (libraryRoot) => {
      const { writePeople } = require("../../src/main/handlers/dataStore.cjs");
      await writePeople([
        {
          id: 90001,
          firstName: "Старый",
          lastName: "Запись",
        },
      ]);

      const zipWork = await mkdtemp(join(tmpdir(), "genealogy-import-zip-"));
      const zipPath = join(zipWork, "backup.zip");
      try {
        await buildMinimalImportZip(zipPath);

        const result = await importZipFromPath(zipPath, {
          includeTags: false,
          photoFolders: ["original"],
        });

        expect(result.ok).toBe(true);
        expect(result.report.success).toBe(2);

        const people = await readPeople();
        const updated = people.find((p) => p.id === 90001);
        expect(updated.firstName).toBe("Тест");
        expect(updated.lastName).toBe("Импортов");
      } finally {
        await rm(zipWork, { recursive: true, force: true });
      }
    });
  });
});

describe("importZipFromPath — tags, history, external", () => {
  it("merges tags with existing tags.json", async () => {
    await withTestLibrary(async (libraryRoot) => {
      await writeFile(
        join(libraryRoot, "tags.json"),
        JSON.stringify(
          {
            tags: [{ id: "local", name: "Локальная" }],
            personTags: { 1: ["local"] },
          },
          null,
          2,
        ),
        "utf-8",
      );

      const zipWork = await mkdtemp(join(tmpdir(), "genealogy-import-zip-"));
      const zipPath = join(zipWork, "extras.zip");
      try {
        await buildMinimalImportZip(zipPath, {
          withTags: true,
          tagsPayload: {
            tags: [{ id: "t1", name: "семья" }],
            personTags: { 90001: ["t1"] },
          },
        });

        const result = await importZipFromPath(zipPath, {
          includeTags: true,
          photoFolders: ["original"],
        });
        expect(result.ok).toBe(true);
        expect(result.report.tagsImported).toBe(true);

        const tags = JSON.parse(await readFile(join(libraryRoot, "tags.json"), "utf-8"));
        const ids = tags.tags.map((t) => t.id).sort();
        expect(ids).toEqual(["local", "t1"]);
        expect(tags.personTags["90001"]).toEqual(["t1"]);
        expect(tags.personTags["1"]).toEqual(["local"]);
      } finally {
        await rm(zipWork, { recursive: true, force: true });
      }
    });
  });

  it("appends history.jsonl to existing journal", async () => {
    await withTestLibrary(async (libraryRoot) => {
      await writeFile(
        join(libraryRoot, "history.jsonl"),
        '{"action":"local"}\n',
        "utf-8",
      );

      const zipWork = await mkdtemp(join(tmpdir(), "genealogy-import-zip-"));
      const zipPath = join(zipWork, "history.zip");
      try {
        await buildMinimalImportZip(zipPath, {
          withTags: false,
          includeHistory: true,
          historyLines: [
            '{"action":"from-archive-1"}',
            '{"action":"from-archive-2"}',
          ],
        });

        const result = await importZipFromPath(zipPath, {
          includeTags: false,
          includeHistory: true,
          photoFolders: ["original"],
        });
        expect(result.ok).toBe(true);
        expect(result.report.historyImported).toBe(true);
        expect(result.report.historyLineCount).toBe(2);

        const journal = await readFile(join(libraryRoot, "history.jsonl"), "utf-8");
        const lines = journal.trim().split("\n");
        expect(lines).toHaveLength(3);
        expect(lines[0]).toContain("local");
        expect(lines[2]).toContain("from-archive-2");
      } finally {
        await rm(zipWork, { recursive: true, force: true });
      }
    });
  });

  it("imports external-entities.json and files under external/", async () => {
    await withTestLibrary(async (libraryRoot) => {
      await writeFile(
        join(libraryRoot, "external-entities.json"),
        JSON.stringify([{ id: "E1", type: "org", name: "Локальная" }]),
        "utf-8",
      );

      const zipWork = await mkdtemp(join(tmpdir(), "genealogy-import-zip-"));
      const zipPath = join(zipWork, "external.zip");
      try {
        await buildMinimalImportZip(zipPath, {
          withTags: false,
          externalEntities: [{ id: "E90001", type: "org", name: "Из архива" }],
          externalFiles: [
            { entityId: "E90001", relPath: "logo.txt", content: "logo-data" },
          ],
        });

        const result = await importZipFromPath(zipPath, {
          includeTags: false,
          photoFolders: ["original"],
        });
        expect(result.ok).toBe(true);
        expect(result.report.externalImported).toBe(1);
        expect(result.report.externalFiles).toBe(1);

        const entities = JSON.parse(
          await readFile(join(libraryRoot, "external-entities.json"), "utf-8"),
        );
        const byId = Object.fromEntries(entities.map((e) => [e.id, e.name]));
        expect(byId.E1).toBe("Локальная");
        expect(byId.E90001).toBe("Из архива");

        await access(
          join(libraryRoot, "external/E90001/logo.txt"),
          fsConstants.F_OK,
        );
        expect(
          await readFile(join(libraryRoot, "external/E90001/logo.txt"), "utf-8"),
        ).toBe("logo-data");
      } finally {
        await rm(zipWork, { recursive: true, force: true });
      }
    });
  });
});

describe("importZipFromPath — conflict decisions", () => {
  async function seedConflictLibrary() {
    const { writePeople } = require("../../src/main/handlers/dataStore.cjs");
    await writePeople([
      { id: 90001, firstName: "Старый", lastName: "Конфликт" },
    ]);
  }

  async function buildZip(zipWork) {
    const zipPath = join(zipWork, "conflict.zip");
    await buildMinimalImportZip(zipPath, { withTags: false });
    return zipPath;
  }

  it("cancel leaves library unchanged", async () => {
    await withTestLibrary(async () => {
      await seedConflictLibrary();
      const zipWork = await mkdtemp(join(tmpdir(), "genealogy-import-zip-"));
      try {
        const zipPath = await buildZip(zipWork);
        const result = await importZipFromPath(
          zipPath,
          { includeTags: false, photoFolders: ["original"] },
          {
            confirmConflicts: async () => ({ action: "cancel" }),
          },
        );
        expect(result.ok).toBe(false);
        expect(result.cancelled).toBe(true);

        const people = await readPeople();
        expect(people).toHaveLength(1);
        expect(people[0].firstName).toBe("Старый");
      } finally {
        await rm(zipWork, { recursive: true, force: true });
      }
    });
  });

  it("skip updates only new ids", async () => {
    await withTestLibrary(async () => {
      await seedConflictLibrary();
      const zipWork = await mkdtemp(join(tmpdir(), "genealogy-import-zip-"));
      try {
        const zipPath = await buildZip(zipWork);
        const result = await importZipFromPath(
          zipPath,
          { includeTags: false, photoFolders: ["original"] },
          { confirmConflicts: async () => ({ action: "skip" }) },
        );
        expect(result.ok).toBe(true);
        expect(result.report.success).toBe(1);
        expect(result.report.totalPersons).toBe(1);

        const people = await readPeople();
        expect(people.find((p) => p.id === 90001).firstName).toBe("Старый");
        expect(people.find((p) => p.id === 90002).firstName).toBe("Мок");
      } finally {
        await rm(zipWork, { recursive: true, force: true });
      }
    });
  });

  it("new imports only ids that were not in library", async () => {
    await withTestLibrary(async () => {
      await seedConflictLibrary();
      const zipWork = await mkdtemp(join(tmpdir(), "genealogy-import-zip-"));
      try {
        const zipPath = await buildZip(zipWork);
        const result = await importZipFromPath(
          zipPath,
          { includeTags: false, photoFolders: ["original"] },
          { confirmConflicts: async () => ({ action: "new" }) },
        );
        expect(result.ok).toBe(true);
        expect(result.report.totalPersons).toBe(1);
        expect(result.report.success).toBe(1);

        const people = await readPeople();
        expect(people.find((p) => p.id === 90001).firstName).toBe("Старый");
        expect(people.some((p) => p.id === 90002)).toBe(true);
      } finally {
        await rm(zipWork, { recursive: true, force: true });
      }
    });
  });

  it("selected imports only chosen ids", async () => {
    await withTestLibrary(async () => {
      await seedConflictLibrary();
      const zipWork = await mkdtemp(join(tmpdir(), "genealogy-import-zip-"));
      try {
        const zipPath = await buildZip(zipWork);
        const result = await importZipFromPath(
          zipPath,
          { includeTags: false, photoFolders: ["original"] },
          {
            confirmConflicts: async () => ({
              action: "selected",
              selected: ["90001"],
            }),
          },
        );
        expect(result.ok).toBe(true);
        expect(result.report.totalPersons).toBe(1);
        expect(result.report.success).toBe(1);

        const people = await readPeople();
        expect(people).toHaveLength(1);
        expect(people[0].id).toBe(90001);
        expect(people[0].firstName).toBe("Тест");
      } finally {
        await rm(zipWork, { recursive: true, force: true });
      }
    });
  });
});
