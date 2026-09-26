// handlers/dataStore.cjs
// Единственное место работы с genealogy-data.json:
// атомарная запись (tmp + rename) + очередь записей против гонок
// при параллельных read-modify-write (например, массовый импорт).
const fs = require("fs");
const { getDataPath } = require("../config.cjs");
const { withWriteLock, writeJsonAtomic } = require("./jsonStore.cjs");

const CURRENT_SCHEMA_VERSION = 1;

function detectSchemaVersion(parsed) {
  if (Array.isArray(parsed)) return 0;
  if (!parsed || typeof parsed !== "object") return 0;
  if (typeof parsed.schemaVersion === "number" && parsed.schemaVersion >= 0) {
    return parsed.schemaVersion;
  }
  if (Array.isArray(parsed.people)) return 0;
  return 0;
}

function extractPeople(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.people)) return parsed.people;
  return [];
}

function migratePeopleData(parsed, fromVersion) {
  let people = extractPeople(parsed);
  let version = fromVersion;

  // Будущие миграции: if (version < 2) { people = ...; version = 2; }
  if (version < 1) {
    version = 1;
  }

  return { people, schemaVersion: CURRENT_SCHEMA_VERSION };
}

function parseGenealogyDataFile(parsed) {
  const fromVersion = detectSchemaVersion(parsed);
  return migratePeopleData(parsed, fromVersion);
}

function normalizePeopleList(parsed) {
  return parseGenealogyDataFile(parsed).people;
}

function buildGenealogyDataPayload(people) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    people: Array.isArray(people) ? people : [],
  };
}

async function readPeople() {
  try {
    const txt = await fs.promises.readFile(getDataPath(), "utf-8");
    return parseGenealogyDataFile(JSON.parse(txt)).people;
  } catch {
    return [];
  }
}

function writePeople(people) {
  return withWriteLock(() =>
    writeJsonAtomic(getDataPath(), buildGenealogyDataPayload(people)),
  );
}

function writePeoplePayload(people) {
  return writeJsonAtomic(getDataPath(), buildGenealogyDataPayload(people));
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
    await writePeoplePayload(people);
    return true;
  });
}

function addPerson(person) {
  return withWriteLock(async () => {
    const people = await readPeople();
    people.push(person);
    await writePeoplePayload(people);
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
    await writePeoplePayload(people);
    return true;
  });
}

function deletePerson(id) {
  return withWriteLock(async () => {
    const people = await readPeople();
    const updated = people.filter((p) => String(p.id) !== String(id));
    await writePeoplePayload(updated);
    return people.length - updated.length;
  });
}

module.exports = {
  CURRENT_SCHEMA_VERSION,
  parseGenealogyDataFile,
  normalizePeopleList,
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
