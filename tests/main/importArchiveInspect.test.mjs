import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildMinimalImportZip } from "../helpers/buildMinimalImportZip.mjs";

const require = createRequire(import.meta.url);
const { inspectArchive } = require("../../src/main/handlers/importArchiveInspect.cjs");
const { APP_IDENTIFIER } = require("../../src/main/handlers/importArchiveUtils.cjs");

describe("inspectArchive (mock zip in tmpdir only)", () => {
  let workDir;
  let zipPath;

  beforeAll(async () => {
    workDir = await mkdtemp(join(tmpdir(), "genealogy-import-test-"));
    zipPath = join(workDir, "minimal-backup.zip");
    await buildMinimalImportZip(zipPath);
  });

  afterAll(async () => {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  it("recognizes app backup and content flags", async () => {
    const info = await inspectArchive(zipPath);
    expect(info.ok).toBe(true);
    expect(info.isOurArchive).toBe(true);
    expect(info.appIdentifier).toBe(APP_IDENTIFIER);
    expect(info.peopleCount).toBe(2);
    expect(info.hasPeopleRoot).toBe(true);
    expect(info.hasTagsFile).toBe(true);
    expect(info.includeTags).toBe(true);
    expect(info.availablePhotoFolders.sort()).toEqual(["original", "thumbs"]);
    expect(info.hasDatabaseFiles).toBe(false);
  });

  it("reports database artifacts when present", async () => {
    const dbZip = join(workDir, "with-db.zip");
    await buildMinimalImportZip(dbZip, { withDbArtifact: true });
    const info = await inspectArchive(dbZip);
    expect(info.hasDatabaseFiles).toBe(true);
    expect(info.availableDatabaseFiles).toContain("genealogy.sqlite");
  });
});
