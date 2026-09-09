// handlers/dataStore.cjs
const fs = require("fs");
const path = require("path");
const { getDataPath } = require("../config.cjs");

const DATA_FILE = getDataPath();

async function readPeople() {
  try {
    const txt = await fs.promises.readFile(getDataPath(), "utf-8");
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.people)) return parsed.people;
    return [];
  } catch (e) {
    return [];
  }
}

async function writePeople(people) {
  await fs.promises.mkdir(path.dirname(getDataPath()), { recursive: true });
  await fs.promises.writeFile(
    getDataPath(),
    JSON.stringify(people, null, 2),
    "utf-8"
  );
}

async function upsertPerson(person) {
  const people = await readPeople();
  const idx = people.findIndex((p) => String(p.id) === String(person.id));
  if (idx >= 0) {
    // merge: сохраняем существующие поля, перезаписываем только те, что пришли
    people[idx] = { ...people[idx], ...person };
  } else {
    people.push(person);
  }
  await writePeople(people);
  return true;
}

module.exports = {
  readPeople,
  writePeople,
  upsertPerson,
  get DATA_FILE() {
    return getDataPath();
  },
};
