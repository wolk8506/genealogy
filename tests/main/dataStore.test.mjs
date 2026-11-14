import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  CURRENT_SCHEMA_VERSION,
  parseGenealogyDataFile,
  normalizePeopleList,
} = require("../../src/main/handlers/dataStore.cjs");

describe("parseGenealogyDataFile", () => {
  const alice = { id: 1, firstName: "Алиса" };

  it("migrates legacy root array to schemaVersion 1", () => {
    const result = parseGenealogyDataFile([alice]);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.people).toEqual([alice]);
  });

  it("migrates { people } without schemaVersion", () => {
    const result = parseGenealogyDataFile({ people: [alice] });
    expect(result.schemaVersion).toBe(1);
    expect(result.people).toEqual([alice]);
  });

  it("keeps explicit schemaVersion and people", () => {
    const payload = { schemaVersion: 1, people: [alice] };
    expect(parseGenealogyDataFile(payload)).toEqual(payload);
  });

  it("normalizePeopleList returns people only", () => {
    expect(normalizePeopleList([alice])).toEqual([alice]);
  });

  it("returns empty people for invalid input", () => {
    expect(parseGenealogyDataFile(null).people).toEqual([]);
    expect(parseGenealogyDataFile({}).people).toEqual([]);
  });
});
