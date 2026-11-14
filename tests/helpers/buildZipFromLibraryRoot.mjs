/**
 * Тестовый ZIP из существующей папки библиотеки (например после mock:library).
 */
import { createWriteStream } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, posix } from "node:path";
import { finished } from "node:stream/promises";
import { ZipArchive } from "archiver";

const APP_IDENTIFIER = "MY_GENEALOGY_APP";
const PHOTO_FOLDERS = new Set(["original", "thumbs", "webp"]);

async function walkFiles(rootDir) {
  const out = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  await walk(rootDir);
  return out;
}

/**
 * @param {string} libraryRoot — корень с genealogy-data.json и people/
 * @param {string} outPath — путь к .zip
 * @param {{ personIds?: (string|number)[], photoFolders?: string[], includeTags?: boolean }} [opts]
 */
export async function buildZipFromLibraryRoot(libraryRoot, outPath, opts = {}) {
  const raw = await readFile(join(libraryRoot, "genealogy-data.json"), "utf-8");
  const parsed = JSON.parse(raw);
  const allPeople = Array.isArray(parsed.people) ? parsed.people : [];
  const filterIds = opts.personIds
    ? new Set(opts.personIds.map(String))
    : null;
  const people = filterIds
    ? allPeople.filter((p) => filterIds.has(String(p.id)))
    : allPeople.slice(0, 2);

  if (people.length === 0) {
    throw new Error("buildZipFromLibraryRoot: нет людей для архива");
  }

  const photoFolders = (opts.photoFolders ?? ["original", "thumbs", "webp"]).filter(
    (f) => PHOTO_FOLDERS.has(f),
  );

  const manifest = {
    appIdentifier: APP_IDENTIFIER,
    archiveName: "mock-library-backup",
    schemaVersion: parsed.schemaVersion ?? 1,
    people,
    selectedPhotoFolders: photoFolders,
    photoFolders,
    includeTags: opts.includeTags !== false,
    includeHistory: false,
  };

  const genealogyData = {
    ...manifest,
    exportedAt: new Date().toISOString(),
  };

  const output = createWriteStream(outPath);
  const archive = new ZipArchive({ zlib: { level: 1 } });
  archive.pipe(output);

  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
  archive.append(JSON.stringify(genealogyData, null, 2), {
    name: "genealogy-data.json",
  });

  if (opts.includeTags !== false) {
    try {
      const tagsRaw = await readFile(join(libraryRoot, "tags.json"), "utf-8");
      archive.append(tagsRaw, { name: "tags.json" });
    } catch {
      // без меток
    }
  }

  const sqlitePath = join(libraryRoot, "genealogy.sqlite");
  try {
    const sqliteStat = await stat(sqlitePath);
    if (sqliteStat.isFile()) {
      archive.file(sqlitePath, { name: "genealogy.sqlite" });
    }
  } catch {
    // без SQLite
  }

  const idSet = new Set(people.map((p) => String(p.id)));
  for (const personId of idSet) {
    const personRoot = join(libraryRoot, "people", personId);
    let files;
    try {
      files = await walkFiles(personRoot);
    } catch {
      continue;
    }

    for (const filePath of files) {
      const relToPerson = relative(personRoot, filePath);
      const relParts = relToPerson.split(/[/\\]/);
      const photosIndex = relParts.indexOf("photos");
      if (photosIndex >= 0) {
        const folder = relParts[photosIndex + 1];
        if (folder && PHOTO_FOLDERS.has(folder) && !photoFolders.includes(folder)) {
          continue;
        }
      }
      const zipName = posix.join("people", personId, ...relParts.map((p) => p));
      archive.file(filePath, { name: zipName });
    }
  }

  await archive.finalize();
  await finished(output);
}
