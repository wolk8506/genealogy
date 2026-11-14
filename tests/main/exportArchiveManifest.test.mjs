import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  APP_IDENTIFIER,
  buildExportManifest,
  buildGenealogyDataExportPayload,
} = require("../../src/main/handlers/exportArchiveManifest.cjs");

describe("exportArchiveManifest", () => {
  const createdAt = "2026-01-01T12:00:00.000Z";

  it("buildExportManifest matches import expectations", () => {
    const manifest = buildExportManifest({
      archiveName: "backup",
      createdAt,
      photoFolders: ["original", "webp"],
      includeTags: true,
      includeHistory: false,
    });

    expect(manifest.appIdentifier).toBe(APP_IDENTIFIER);
    expect(manifest.kind).toBe("genealogy-archive");
    expect(manifest.version).toBe(2);
    expect(manifest.selectedPhotoFolders).toEqual(["original", "webp"]);
    expect(manifest.includeHistory).toBe(false);
  });

  it("buildGenealogyDataExportPayload carries people and schema", () => {
    const people = [{ id: 1, firstName: "A" }];
    const payload = buildGenealogyDataExportPayload({
      people,
      archiveName: "backup",
      createdAt,
      photoFolders: ["original"],
      includeTags: false,
      includeHistory: true,
    });

    expect(payload.schemaVersion).toBe(1); // GENEALOGY_DATA_SCHEMA_VERSION
    expect(payload.appIdentifier).toBe(APP_IDENTIFIER);
    expect(payload.exportedAt).toBe(createdAt);
    expect(payload.people).toEqual(people);
    expect(payload.includeTags).toBe(false);
    expect(payload.includeHistory).toBe(true);
  });
});
