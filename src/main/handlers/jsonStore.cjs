// handlers/jsonStore.cjs
// Атомарная запись JSON (tmp + rename) и общая очередь записей
// для genealogy-data.json, tags.json, external-entities.json и др.
const fs = require("fs");
const path = require("path");

let writeQueue = Promise.resolve();

function withWriteLock(fn) {
  const run = writeQueue.then(() => fn());
  writeQueue = run.catch(() => {});
  return run;
}

async function writeJsonAtomic(filePath, obj) {
  const dir = path.dirname(filePath);
  if (dir && dir !== ".") {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.promises.writeFile(tmp, JSON.stringify(obj, null, 2), "utf-8");
  try {
    await fs.promises.rename(tmp, filePath);
  } catch (err) {
    await fs.promises.unlink(tmp).catch(() => {});
    throw err;
  }
}

async function readJsonFile(filePath, fallback = null) {
  try {
    const txt = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(txt);
  } catch {
    return fallback;
  }
}

async function writeTextAtomic(filePath, text) {
  const dir = path.dirname(filePath);
  if (dir && dir !== ".") {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.promises.writeFile(tmp, text, "utf-8");
  try {
    await fs.promises.rename(tmp, filePath);
  } catch (err) {
    await fs.promises.unlink(tmp).catch(() => {});
    throw err;
  }
}

async function writeBufferAtomic(filePath, buffer) {
  const dir = path.dirname(filePath);
  if (dir && dir !== ".") {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.promises.writeFile(tmp, buffer);
  try {
    await fs.promises.rename(tmp, filePath);
  } catch (err) {
    await fs.promises.unlink(tmp).catch(() => {});
    throw err;
  }
}

module.exports = {
  withWriteLock,
  writeJsonAtomic,
  writeTextAtomic,
  writeBufferAtomic,
  readJsonFile,
};
