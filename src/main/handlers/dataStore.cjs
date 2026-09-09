// handlers/dataStore.cjs
// Единственное место работы с genealogy-data.json:
// атомарная запись (tmp + rename) + очередь записей против гонок
// при параллельных read-modify-write (например, массовый импорт).
const fs = require("fs");
const path = require("path");
const { getDataPath } = require("../config.cjs");

let writeQueue = Promise.resolve();

function withWriteLock(fn) {
  const run = writeQueue.then(() => fn());
  writeQueue = run.catch(() => {});
  return run;
}

function normalizePeopleList(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.people)) return parsed.people;
  return [];
}

async function readPeople() {
  try {
    const txt = await fs.promises.readFile(getDataPath(), "utf-8");
    return normalizePeopleList(JSON.parse(txt));
  } catch {
    return [];
  }
}

async function writeJsonAtomic(filePath, obj) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.promises.writeFile(tmp, JSON.stringify(obj, null, 2), "utf-8");
  try {
    await fs.promises.rename(tmp, filePath);
  } catch (err) {
    await fs.promises.unlink(tmp).catch(() => {});
    throw err;
  }
}

function writePeople(people) {
  return withWriteLock(() => writeJsonAtomic(getDataPath(), people));
}

function upsertPerson(person) {
  return withWriteLock(async () => {
    const people = await readPeople();
    const idx = people.findIndex((p) => String(p.id) === String(person.id));
    if (idx >= 0) {
      // merge: сохраняем существующие поля, перезаписываем только те, что пришли
      people[idx] = { ...people[idx], ...person };
    } else {
      people.push(person);
    }
    await writeJsonAtomic(getDataPath(), people);
    return true;
  });
}

function addPerson(person) {
  return withWriteLock(async () => {
    const people = await readPeople();
    people.push(person);
    await writeJsonAtomic(getDataPath(), people);
    return true;
  });
}

async function getPersonById(id) {
  const people = await readPeople();
  return people.find((p) => String(p.id) === String(id)) ?? null;
}

function updatePerson(id, updatedData) {
  return withWriteLock(async () => {
    const people = await readPeople();
    const index = people.findIndex((p) => String(p.id) === String(id));
    if (index === -1) {
      throw new Error(`Человек с id=${id} не найден`);
    }
    people[index] = { ...people[index], ...updatedData };
    await writeJsonAtomic(getDataPath(), people);
    return true;
  });
}

function deletePerson(id) {
  return withWriteLock(async () => {
    const people = await readPeople();
    const updated = people.filter((p) => String(p.id) !== String(id));
    await writeJsonAtomic(getDataPath(), updated);
    return people.length - updated.length;
  });
}

module.exports = {
  readPeople,
  writePeople,
  upsertPerson,
  addPerson,
  getPersonById,
  updatePerson,
  deletePerson,
  get DATA_FILE() {
    return getDataPath();
  },
};
