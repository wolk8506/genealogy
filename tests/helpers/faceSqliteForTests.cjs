const path = require("path");
const { closeFaceDb, initializeFaceDb } = require("../../src/main/db/faceDb.cjs");

/** Создаёт валидный genealogy.sqlite в `dir` (использует GENEALOGY_TEST_ROOT). */
function createValidFaceSqliteInDir(dir) {
  const prev = process.env.GENEALOGY_TEST_ROOT;
  process.env.GENEALOGY_TEST_ROOT = dir;
  try {
    closeFaceDb();
    initializeFaceDb();
    closeFaceDb();
    return path.join(dir, "genealogy.sqlite");
  } finally {
    if (prev != null) process.env.GENEALOGY_TEST_ROOT = prev;
    else delete process.env.GENEALOGY_TEST_ROOT;
    closeFaceDb();
  }
}

module.exports = { createValidFaceSqliteInDir };
