const { deleteReferencesForExternal } = require("../db/faceDb.cjs");
const log = require("../logger.cjs").createLogger("purgeExternal");

function purgeExternalReferences(externalId) {
  const faceResult = deleteReferencesForExternal(externalId);
  log.info(
    `🧹 Очищены вторичные данные для ${externalId}: face_references=${faceResult.deleted}`,
  );
  return faceResult;
}

module.exports = { purgeExternalReferences };
