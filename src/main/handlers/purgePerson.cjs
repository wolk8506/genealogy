// handlers/purgePerson.cjs
// Очистка вторичных индексов при полном удалении человека.
const { getTagsPath } = require("../config.cjs");
const { deleteReferencesForPerson } = require("../db/faceDb.cjs");
const { withWriteLock, writeJsonAtomic, readJsonFile } = require("./jsonStore.cjs");
const log = require("../logger.cjs").createLogger("purgePerson");

async function purgePersonTags(personId) {
  const id = String(personId);
  const tagsPath = getTagsPath();

  await withWriteLock(async () => {
    const data = await readJsonFile(tagsPath, null);
    if (!data?.personTags || !(id in data.personTags)) return;

    const { [id]: _removed, ...rest } = data.personTags;
    await writeJsonAtomic(tagsPath, { ...data, personTags: rest });
  });
}

async function purgePersonReferences(personId) {
  const faceResult = deleteReferencesForPerson(personId);
  await purgePersonTags(personId);

  log.info(
    `🧹 Очищены вторичные данные для человека ${personId}: face_references=${faceResult.deleted}`,
  );

  return faceResult;
}

module.exports = { purgePersonReferences, purgePersonTags };
