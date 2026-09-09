const fs = require("fs");
const path = require("path");

const {
  ensureBaseDir,
  getBaseDir,
  getFaceDbPath,
  getFaceIndexJsonPath,
} = require("../config.cjs");
const MIGRATION_META_KEY = "face_index_migrated";
const FACE_INDEX_VERSION_META_KEY = "face_index_version";

let dbInstance = null;

function createEmptyIndex() {
  return {
    version: 1,
    references: [],
    scanState: null,
  };
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeDescriptor(descriptor) {
  if (!Array.isArray(descriptor)) return null;
  const next = descriptor
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  return next.length > 0 ? next : null;
}

function normalizeReferenceEntity(reference) {
  if (reference?.externalEntityId) {
    return { kind: "external", id: String(reference.externalEntityId) };
  }

  if (reference?.personId == null || reference.personId === "") {
    return null;
  }

  const personId = Number(reference.personId);
  if (Number.isFinite(personId) && personId > 0) {
    return { kind: "person", id: personId };
  }

  const raw = String(reference.personId);
  if (raw.startsWith("E")) {
    return { kind: "external", id: raw };
  }

  return null;
}

function normalizeDbEntityId(value) {
  if (value == null) return null;

  const raw = String(value);
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return { kind: "person", id: numeric };
  }

  if (raw.startsWith("E")) {
    return { kind: "external", id: raw };
  }

  return null;
}

function normalizeReference(reference) {
  const entity = normalizeReferenceEntity(reference);
  const descriptor = normalizeDescriptor(reference?.descriptor);

  if (!entity || !descriptor) {
    return null;
  }

  const source = reference?.source === "avatar" ? "avatar" : "tagged";

  return {
    personId: entity.kind === "person" ? entity.id : null,
    externalEntityId: entity.kind === "external" ? entity.id : undefined,
    descriptor,
    source,
    owner: reference?.owner != null ? String(reference.owner) : null,
    photoId: reference?.photoId != null ? String(reference.photoId) : null,
    faceId: reference?.faceId != null ? String(reference.faceId) : null,
  };
}

function buildReferenceKey(reference) {
  if (reference.source === "avatar") {
    return `avatar:${reference.externalEntityId ?? reference.personId}`;
  }

  const owner = reference.owner ?? "";
  const photoId = reference.photoId ?? "";
  const faceId = reference.faceId ?? "";
  return `face:${owner}:${photoId}:${faceId}`;
}

function normalizeFaceIndex(index) {
  if (!index || typeof index !== "object") {
    return createEmptyIndex();
  }

  const references = Array.isArray(index.references)
    ? index.references.map(normalizeReference).filter(Boolean)
    : [];

  const dedupedByKey = new Map();
  for (const reference of references) {
    dedupedByKey.set(buildReferenceKey(reference), reference);
  }

  return {
    version: Number(index.version) > 0 ? Number(index.version) : 1,
    references: Array.from(dedupedByKey.values()),
    scanState: index.scanState ?? null,
  };
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS face_references (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_key TEXT NOT NULL UNIQUE,
      person_id TEXT NOT NULL,
      source TEXT NOT NULL,
      owner TEXT,
      photo_id TEXT,
      face_id TEXT,
      descriptor_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_face_references_person
      ON face_references(person_id);

    CREATE INDEX IF NOT EXISTS idx_face_references_source
      ON face_references(source);

    CREATE INDEX IF NOT EXISTS idx_face_references_owner
      ON face_references(owner);

    CREATE INDEX IF NOT EXISTS idx_face_references_photo
      ON face_references(photo_id);

    CREATE TABLE IF NOT EXISTS face_scan_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      scan_state_json TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.prepare(
    `
      INSERT OR IGNORE INTO schema_migrations (version, description)
      VALUES (1, 'initial face sqlite schema');
    `,
  ).run();
}

function readMeta(db, key) {
  const row = db.prepare("SELECT value FROM app_meta WHERE key = ?").get(key);
  return row?.value ?? null;
}

function writeMeta(db, key, value) {
  db.prepare(
    `
      INSERT INTO app_meta (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP;
    `,
  ).run(key, String(value));
}

function replaceReferencesTx(db, references) {
  const removeAll = db.prepare("DELETE FROM face_references");
  const insertReference = db.prepare(`
    INSERT INTO face_references (
      reference_key,
      person_id,
      source,
      owner,
      photo_id,
      face_id,
      descriptor_json,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  removeAll.run();

  for (const reference of references) {
    const entityId =
      reference.externalEntityId != null
        ? String(reference.externalEntityId)
        : reference.personId;

    insertReference.run(
      buildReferenceKey(reference),
      entityId,
      reference.source,
      reference.owner,
      reference.photoId,
      reference.faceId,
      JSON.stringify(reference.descriptor),
    );
  }
}

function replaceScanStateTx(db, scanState) {
  const payload = scanState == null ? null : JSON.stringify(scanState);

  db.prepare(
    `
      INSERT INTO face_scan_state (id, scan_state_json, updated_at)
      VALUES (1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        scan_state_json = excluded.scan_state_json,
        updated_at = CURRENT_TIMESTAMP;
    `,
  ).run(payload);
}

function tryBackupLegacyJson() {
  const legacyJsonPath = getFaceIndexJsonPath();
  if (!fs.existsSync(legacyJsonPath)) return;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(getBaseDir(), `face-index.migrated-${stamp}.json.bak`);

  try {
    fs.renameSync(legacyJsonPath, backupPath);
  } catch {
    try {
      fs.copyFileSync(legacyJsonPath, backupPath);
      fs.unlinkSync(legacyJsonPath);
    } catch (error) {
      console.warn("Failed to backup legacy face-index.json", error.message);
    }
  }
}

function migrateLegacyJsonIfNeeded(db) {
  const alreadyMigrated = readMeta(db, MIGRATION_META_KEY) === "1";
  if (alreadyMigrated) return;

  let legacyIndex = createEmptyIndex();
  const legacyJsonPath = getFaceIndexJsonPath();

  if (fs.existsSync(legacyJsonPath)) {
    const raw = fs.readFileSync(legacyJsonPath, "utf-8");
    legacyIndex = normalizeFaceIndex(safeJsonParse(raw, createEmptyIndex()));
  }

  const importTransaction = db.transaction(() => {
    replaceReferencesTx(db, legacyIndex.references);
    replaceScanStateTx(db, legacyIndex.scanState);
    writeMeta(db, FACE_INDEX_VERSION_META_KEY, legacyIndex.version);
    writeMeta(db, MIGRATION_META_KEY, "1");
  });

  importTransaction();
  tryBackupLegacyJson();
}

function ensureDriver() {
  try {
    // eslint-disable-next-line global-require
    return require("better-sqlite3");
  } catch (error) {
    throw new Error(
      "Missing dependency: better-sqlite3. Run `npm install better-sqlite3`.",
    );
  }
}

function initializeFaceDb() {
  if (dbInstance) return dbInstance;

  ensureBaseDir();

  const Database = ensureDriver();
  const db = new Database(getFaceDbPath());

  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("temp_store = MEMORY");
  db.pragma("foreign_keys = ON");

  ensureSchema(db);
  migrateLegacyJsonIfNeeded(db);

  dbInstance = db;
  return dbInstance;
}

function closeFaceDb() {
  if (!dbInstance) return;

  try {
    dbInstance.close();
  } finally {
    dbInstance = null;
  }
}

function getDb() {
  return dbInstance || initializeFaceDb();
}

function readReferences(db) {
  const rows = db
    .prepare(
      `
        SELECT person_id, source, owner, photo_id, face_id, descriptor_json
        FROM face_references
        ORDER BY id ASC
      `,
    )
    .all();

  const references = [];

  for (const row of rows) {
    const descriptor = normalizeDescriptor(
      safeJsonParse(row.descriptor_json, []),
    );

    if (!descriptor) continue;

    const entity = normalizeDbEntityId(row.person_id);
    if (!entity) continue;

    references.push({
      personId: entity.kind === "person" ? entity.id : null,
      externalEntityId: entity.kind === "external" ? entity.id : undefined,
      source: row.source,
      owner: row.owner,
      photoId: row.photo_id,
      faceId: row.face_id,
      descriptor,
    });
  }

  return references;
}

function readScanState(db) {
  const row = db
    .prepare("SELECT scan_state_json FROM face_scan_state WHERE id = 1")
    .get();

  if (!row || !row.scan_state_json) return null;
  return safeJsonParse(row.scan_state_json, null);
}

function loadFaceIndex() {
  const db = getDb();
  const versionMeta = Number(readMeta(db, FACE_INDEX_VERSION_META_KEY));

  return {
    version: Number.isFinite(versionMeta) && versionMeta > 0 ? versionMeta : 1,
    references: readReferences(db),
    scanState: readScanState(db),
  };
}

function saveFaceIndex(index) {
  const db = getDb();
  const normalized = normalizeFaceIndex(index);

  const persistTransaction = db.transaction(() => {
    replaceReferencesTx(db, normalized.references);
    replaceScanStateTx(db, normalized.scanState);
    writeMeta(db, FACE_INDEX_VERSION_META_KEY, normalized.version);
  });

  persistTransaction();
  return { success: true };
}

function saveFaceScanState(scanState) {
  const db = getDb();
  replaceScanStateTx(db, scanState);
  return { success: true };
}

function getFaceScanState() {
  const db = getDb();
  return readScanState(db);
}

function reassignReferencesToPerson(keepPersonId, removePersonIds) {
  const keep = Number(keepPersonId);
  const removeSet = new Set((removePersonIds || []).map((id) => Number(id)));

  if (!Number.isFinite(keep) || keep <= 0 || removeSet.size === 0) {
    return { updatedReferences: 0 };
  }

  removeSet.delete(keep);

  const index = loadFaceIndex();
  let updatedReferences = 0;

  const rewritten = index.references.map((reference) => {
    if (!removeSet.has(Number(reference.personId))) return reference;
    updatedReferences += 1;
    return { ...reference, personId: keep };
  });

  saveFaceIndex({
    ...index,
    references: rewritten,
  });

  return { updatedReferences };
}

function getFaceDbStats() {
  const db = getDb();

  const totalReferences =
    db.prepare("SELECT COUNT(*) AS count FROM face_references").get()?.count || 0;
  const avatarReferences =
    db
      .prepare("SELECT COUNT(*) AS count FROM face_references WHERE source = 'avatar'")
      .get()?.count || 0;
  const taggedReferences =
    db
      .prepare("SELECT COUNT(*) AS count FROM face_references WHERE source = 'tagged'")
      .get()?.count || 0;
  const scanStatePresent =
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM face_scan_state WHERE id = 1 AND scan_state_json IS NOT NULL",
      )
      .get()?.count || 0;

  const dbFileSizeBytes = fs.existsSync(getFaceDbPath())
    ? fs.statSync(getFaceDbPath()).size
    : 0;

  return {
    dbPath: getFaceDbPath(),
    dbFileSizeBytes,
    totalReferences,
    avatarReferences,
    taggedReferences,
    scanStatePresent,
  };
}

function runFaceDbVacuumAnalyze() {
  const db = getDb();
  db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  db.exec("VACUUM;");
  db.exec("ANALYZE;");
}

function runFaceDbIntegrityCheck() {
  const db = getDb();
  const rows = db.prepare("PRAGMA integrity_check;").all();
  const messages = rows.map((row) => row.integrity_check).filter(Boolean);
  const ok = messages.length > 0 && messages.every((message) => message === "ok");

  return {
    ok,
    messages: messages.length > 0 ? messages : ["unknown"],
  };
}

module.exports = {
  get FACE_DB_PATH() {
    return getFaceDbPath();
  },
  initializeFaceDb,
  closeFaceDb,
  loadFaceIndex,
  saveFaceIndex,
  saveFaceScanState,
  getFaceScanState,
  reassignReferencesToPerson,
  getFaceDbStats,
  runFaceDbVacuumAnalyze,
  runFaceDbIntegrityCheck,
};
