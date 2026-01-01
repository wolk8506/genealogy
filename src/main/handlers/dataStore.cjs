// handlers/dataStore.cjs
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const DATA_FILE = path.join(
  app.getPath("documents"),
  "Genealogy",
  "genealogy-data.json"
);

async function readPeople() {
  try {
    const txt = await fs.promises.readFile(DATA_FILE, "utf-8");
    return JSON.parse(txt);
  } catch (e) {
    return [];
  }
}

async function writePeople(people) {
  await fs.promises.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.promises.writeFile(
    DATA_FILE,
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

module.exports = { readPeople, writePeople, upsertPerson, DATA_FILE };
