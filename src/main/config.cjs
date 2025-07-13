const path = require("path");
const { app } = require("electron");
const fs = require("fs");

const baseDir = path.join(app.getPath("documents"), "Genealogy");
const dataPath = path.join(baseDir, "genealogy-data.json");

function ensureBaseDir() {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
}

function peopleDir(personId) {
  return path.join(baseDir, "people", String(personId));
}

function photosDir(personId) {
  return path.join(peopleDir(personId), "photos");
}

function photosMetaPath(personId) {
  return path.join(peopleDir(personId), "photos.json");
}

module.exports = {
  baseDir,
  dataPath,
  ensureBaseDir,
  peopleDir,
  photosDir,
  photosMetaPath,
};
