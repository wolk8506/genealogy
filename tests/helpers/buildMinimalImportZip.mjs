/**
 * Минимальный ZIP как у бэкапа Genealogy — только в переданный путь (обычно os.tmpdir()).
 * Не трогает Documents/Genealogy и рабочую библиотеку.
 */
import { createWriteStream } from "node:fs";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { finished } from "node:stream/promises";
import { ZipArchive } from "archiver";

const require = createRequire(import.meta.url);
const { createValidFaceSqliteInDir } = require("./faceSqliteForTests.cjs");

const APP_IDENTIFIER = "MY_GENEALOGY_APP";

const DEFAULT_PEOPLE = [
  { id: 90001, firstName: "Тест", lastName: "Импортов" },
  { id: 90002, firstName: "Мок", lastName: "Архивный" },
];

/**
 * @param {string} outPath — абсолютный путь к создаваемому .zip
 * @param {{
 *   people?: object[],
 *   withTags?: boolean,
 *   withDbArtifact?: boolean,
 *   tagsPayload?: { tags: object[], personTags: object },
 *   includeHistory?: boolean,
 *   historyLines?: string[],
 *   externalEntities?: object[],
 *   externalFiles?: { entityId: string, relPath: string, content: string }[],
 * }} [opts]
 */
export async function buildMinimalImportZip(outPath, opts = {}) {
  const people = opts.people ?? DEFAULT_PEOPLE;
  const withTags = opts.withTags !== false;
  const withDbArtifact = opts.withDbArtifact === true;
  const includeHistory = opts.includeHistory === true;
  const historyLines = opts.historyLines ?? [
    '{"at":"2026-01-01T00:00:00.000Z","action":"test-import","detail":"line-1"}',
    '{"at":"2026-01-02T00:00:00.000Z","action":"test-import","detail":"line-2"}',
  ];

  const manifest = {
    appIdentifier: APP_IDENTIFIER,
    archiveName: "test-mock-backup",
    schemaVersion: 1,
    people,
    selectedPhotoFolders: ["original", "thumbs"],
    includeTags: withTags,
    includeHistory,
  };

  const genealogyData = {
    schemaVersion: 1,
    appIdentifier: APP_IDENTIFIER,
    archiveName: manifest.archiveName,
    exportedAt: new Date().toISOString(),
    selectedPhotoFolders: manifest.selectedPhotoFolders,
    photoFolders: manifest.selectedPhotoFolders,
    includeTags: manifest.includeTags,
    includeHistory: manifest.includeHistory,
    people,
  };

  const tagsPayload = opts.tagsPayload ?? {
    tags: [{ id: "t1", name: "семья" }],
    personTags: { 90001: ["t1"] },
  };

  const output = createWriteStream(outPath);
  const archive = new ZipArchive({ zlib: { level: 1 } });
  archive.pipe(output);

  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
  archive.append(JSON.stringify(genealogyData, null, 2), {
    name: "genealogy-data.json",
  });

  if (withTags) {
    archive.append(JSON.stringify(tagsPayload, null, 2), { name: "tags.json" });
  }

  if (includeHistory) {
    archive.append(`${historyLines.join("\n")}\n`, { name: "history.jsonl" });
  }

  const externalEntities = opts.externalEntities ?? [];
  if (externalEntities.length > 0) {
    archive.append(JSON.stringify(externalEntities, null, 2), {
      name: "external-entities.json",
    });
  }
  for (const file of opts.externalFiles ?? []) {
    archive.append(file.content, {
      name: `external/${file.entityId}/${file.relPath}`,
    });
  }

  archive.append("mock", { name: "people/90001/photos/original/placeholder.txt" });
  archive.append("mock", { name: "people/90001/photos/thumbs/placeholder.txt" });

  if (withDbArtifact) {
    const sqliteWork = await mkdtemp(join(tmpdir(), "genealogy-sqlite-"));
    try {
      createValidFaceSqliteInDir(sqliteWork);
      const sqliteBytes = await readFile(join(sqliteWork, "genealogy.sqlite"));
      archive.append(sqliteBytes, { name: "genealogy.sqlite" });
    } finally {
      await rm(sqliteWork, { recursive: true, force: true });
    }
  }

  await archive.finalize();
  await finished(output);
}
