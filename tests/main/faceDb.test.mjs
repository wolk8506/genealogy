import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { withTestLibrary } from "../helpers/testLibraryRoot.mjs";

const require = createRequire(import.meta.url);
const {
  initializeFaceDb,
  closeFaceDb,
  loadFaceIndex,
  saveFaceIndex,
  getFaceDbStats,
} = require("../../src/main/db/faceDb.cjs");

const SAMPLE_DESCRIPTOR = Array.from({ length: 8 }, (_, i) => 0.1 * (i + 1));

describe("faceDb (temp GENEALOGY_TEST_ROOT)", () => {
  it("persists references and reports stats", async () => {
    await withTestLibrary(async () => {
      closeFaceDb();
      initializeFaceDb();

      const before = getFaceDbStats();
      expect(before.totalReferences).toBe(0);

      saveFaceIndex({
        version: 1,
        references: [
          {
            personId: 4242,
            source: "tagged",
            owner: "4242",
            photoId: "p1",
            faceId: "f1",
            descriptor: SAMPLE_DESCRIPTOR,
          },
        ],
        scanState: { pass: "test" },
      });

      const stats = getFaceDbStats();
      expect(stats.totalReferences).toBe(1);
      expect(stats.taggedReferences).toBe(1);
      expect(stats.dbFileSizeBytes).toBeGreaterThan(0);
      expect(stats.scanStatePresent).toBe(1);

      const index = loadFaceIndex();
      expect(index.references).toHaveLength(1);
      expect(index.references[0].personId).toBe(4242);
      expect(index.references[0].descriptor).toHaveLength(8);
      expect(index.scanState).toEqual({ pass: "test" });

      closeFaceDb();
    });
  });
});
