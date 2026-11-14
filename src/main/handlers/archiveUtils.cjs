// Утилиты подготовки ZIP (archive:create) — без Electron.
const fs = require("fs");
const path = require("path");

function listFilesRecursive(paths) {
  let files = [];

  for (const p of paths) {
    if (!fs.existsSync(p)) continue;

    const stat = fs.statSync(p);
    if (stat.isFile()) {
      files.push(p);
    } else if (stat.isDirectory()) {
      const entries = fs.readdirSync(p);
      const childPaths = entries.map((e) => path.join(p, e));
      const nestedFiles = listFilesRecursive(childPaths);
      files = files.concat(nestedFiles);
    }
  }
  return files;
}

function getTotalSize(files) {
  let total = 0;
  for (const f of files) {
    try {
      total += fs.statSync(f).size;
    } catch {
      // пропускаем недоступные
    }
  }
  return total;
}

function getArchiveRoot(filePaths) {
  const jsonFile = filePaths.find(
    (p) => path.basename(p) === "genealogy-data.json",
  );
  return jsonFile ? path.dirname(jsonFile) : path.dirname(filePaths[0]);
}

function toArchiveEntryName(archiveRoot, src) {
  const rel = path.relative(archiveRoot, src) || path.basename(src);
  return rel.split(path.sep).join("/");
}

module.exports = {
  listFilesRecursive,
  getTotalSize,
  getArchiveRoot,
  toArchiveEntryName,
};
