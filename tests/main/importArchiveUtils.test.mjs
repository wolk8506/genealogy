import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  APP_IDENTIFIER,
  normalizeZipEntryName,
  findZipEntry,
  parseArchiveMeta,
  isDatabaseArtifact,
  normalizeTagsPayload,
} = require("../../src/main/handlers/importArchiveUtils.cjs");

describe("importArchiveUtils", () => {
  it("normalizeZipEntryName flattens Windows paths", () => {
    expect(normalizeZipEntryName(".\\people\\1\\a.jpg")).toBe("people/1/a.jpg");
    expect(normalizeZipEntryName("./tags.json")).toBe("tags.json");
  });

  it("findZipEntry matches nested paths", () => {
    const entries = {
      "backup/tags.json": { name: "backup/tags.json" },
    };
    const hit = findZipEntry(entries, "tags.json");
    expect(hit?.key).toBe("backup/tags.json");
  });

  it("parseArchiveMeta counts people and filters photo folders", () => {
    const meta = parseArchiveMeta({
      appIdentifier: APP_IDENTIFIER,
      people: [{ id: 1 }, { id: 2 }],
      selectedPhotoFolders: ["original", "evil"],
      includeTags: true,
    });
    expect(meta.peopleCount).toBe(2);
    expect(meta.selectedPhotoFolders).toEqual(["original"]);
    expect(meta.includeTags).toBe(true);
  });

  it("isDatabaseArtifact detects sqlite siblings", () => {
    expect(isDatabaseArtifact("foo/genealogy.sqlite-wal")).toBe(true);
    expect(isDatabaseArtifact("notes.txt")).toBe(false);
  });

  it("normalizeTagsPayload tolerates partial input", () => {
    expect(normalizeTagsPayload(null)).toBeNull();
    expect(normalizeTagsPayload({ tags: [1] })).toEqual({
      tags: [1],
      personTags: {},
    });
  });
});
