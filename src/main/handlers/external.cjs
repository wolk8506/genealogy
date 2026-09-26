const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const {
  ensureBaseDir,
  externalDataPath,
  externalDir,
} = require("../config.cjs");
const log = require("../logger.cjs").createLogger("external");
const { withWriteLock, writeJsonAtomic } = require("./jsonStore.cjs");
const { purgeExternalReferences } = require("./purgeExternal.cjs");

function normalizeRelations(relations) {
  if (!Array.isArray(relations)) return [];
  return relations
    .map((r) => {
      if (!r) return null;

      const explicitKind = r.targetKind;
      const hasPersonId = r.mainPersonId != null && r.mainPersonId !== "";
      const hasExternalId =
        r.mainExternalEntityId != null &&
        String(r.mainExternalEntityId).trim() !== "";

      let targetKind = explicitKind;
      if (targetKind !== "person" && targetKind !== "external") {
        if (hasExternalId) targetKind = "external";
        else if (hasPersonId) targetKind = "person";
      }

      if (targetKind !== "person" && targetKind !== "external") return null;

      let mainPersonId = null;
      let mainExternalEntityId = null;

      if (targetKind === "person") {
        mainPersonId = hasPersonId ? Number(r.mainPersonId) : null;
        if (mainPersonId == null || Number.isNaN(mainPersonId)) return null;
      }

      if (targetKind === "external") {
        mainExternalEntityId = hasExternalId
          ? String(r.mainExternalEntityId).trim()
          : null;
        if (!mainExternalEntityId) return null;
      }

      return {
        id: r.id || `R${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        targetKind,
        mainPersonId,
        mainExternalEntityId,
        relationType: r.relationType || "other",
        dates: r.dates || "",
        notes: r.notes || "",
      };
    })
    .filter(Boolean);
}

function readEntities() {
  ensureBaseDir();
  const filePath = externalDataPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    log.error("❌ Ошибка чтения external-entities.json:", err);
    return [];
  }
}

async function writeEntities(entities) {
  ensureBaseDir();
  await withWriteLock(() => writeJsonAtomic(externalDataPath(), entities));
}

function generateEntityId(entities) {
  const nums = entities
    .map((e) => e.id)
    .filter((id) => String(id).startsWith("E"))
    .map((id) => Number(String(id).slice(1)))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 10000;
  return `E${max + 1}`;
}

function generateRelationId(entity) {
  const nums = (entity.relations || [])
    .map((r) => r.id)
    .filter((id) => String(id).startsWith("R"))
    .map((id) => Number(String(id).slice(1)))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 10000;
  return `R${max + 1}`;
}

function ensureEntityFolder(entityId) {
  const dir = externalDir(entityId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function normalizeEntity(entity) {
  if (!entity) return null;
  return {
    ...entity,
    archived: Boolean(entity.archived),
    phone: entity.phone || "",
    email: entity.email || "",
    address: entity.address || "",
    birthday: entity.birthday || "",
    relations: normalizeRelations(entity.relations),
  };
}

function stripRelationsToExternal(entities, externalId) {
  let changed = false;
  for (const entity of entities) {
    const before = (entity.relations || []).length;
    entity.relations = (entity.relations || []).filter(
      (r) => r.mainExternalEntityId !== externalId,
    );
    if (entity.relations.length !== before) {
      entity.editedAt = new Date().toISOString();
      changed = true;
    }
  }
  return changed;
}

ipcMain.handle("external:getAll", () =>
  readEntities().map((e) => normalizeEntity(e)),
);

ipcMain.handle("external:getById", (_, id) => {
  const entities = readEntities();
  const entity = entities.find((e) => e.id === id);
  return normalizeEntity(entity);
});

ipcMain.handle("external:add", async (_, entity) => {
  const entities = readEntities();
  const now = new Date().toISOString();
  const id = entity.id || generateEntityId(entities);
  const newEntity = {
    id,
    type: entity.type || "person",
    name: entity.name || "",
    notes: entity.notes || "",
    phone: entity.phone || "",
    email: entity.email || "",
    address: entity.address || "",
    birthday: entity.birthday || "",
    relations: normalizeRelations(entity.relations),
    archived: false,
    createdAt: now,
    editedAt: now,
  };
  entities.push(newEntity);
  await writeEntities(entities);
  ensureEntityFolder(id);
  return newEntity;
});

ipcMain.handle("external:update", async (_, id, updatedData) => {
  const entities = readEntities();
  const index = entities.findIndex((e) => e.id === id);
  if (index === -1) throw new Error(`Внешняя персона ${id} не найдена`);

  entities[index] = {
    ...entities[index],
    ...updatedData,
    phone: updatedData.phone ?? entities[index].phone ?? "",
    email: updatedData.email ?? entities[index].email ?? "",
    address: updatedData.address ?? entities[index].address ?? "",
    birthday: updatedData.birthday ?? entities[index].birthday ?? "",
    relations: normalizeRelations(
      updatedData.relations ?? entities[index].relations,
    ),
    id,
    editedAt: new Date().toISOString(),
  };
  await writeEntities(entities);
  return entities[index];
});

ipcMain.handle("external:delete", async (_, id) => {
  let entities = readEntities();
  entities = entities.filter((e) => e.id !== id);
  stripRelationsToExternal(entities, id);
  await writeEntities(entities);

  purgeExternalReferences(id);

  const dir = externalDir(id);
  if (fs.existsSync(dir)) {
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
  return true;
});

ipcMain.handle("external:addRelation", async (_, entityId, relation) => {
  const entities = readEntities();
  const index = entities.findIndex((e) => e.id === entityId);
  if (index === -1) throw new Error(`Внешняя персона ${entityId} не найдена`);

  const entity = entities[index];
  const relId = relation.id || generateRelationId(entity);
  const [newRelation] = normalizeRelations([
    {
      ...relation,
      id: relId,
    },
  ]);
  if (!newRelation) {
    throw new Error("Для связи требуется корректная цель (из дерева или справочника)");
  }
  entity.relations = [...(entity.relations || []), newRelation];
  entity.editedAt = new Date().toISOString();
  entities[index] = entity;
  await writeEntities(entities);
  return newRelation;
});

ipcMain.handle("external:removeRelation", async (_, entityId, relationId) => {
  const entities = readEntities();
  const index = entities.findIndex((e) => e.id === entityId);
  if (index === -1) throw new Error(`Внешняя персона ${entityId} не найдена`);

  const entity = entities[index];
  entity.relations = (entity.relations || []).filter((r) => r.id !== relationId);
  entity.editedAt = new Date().toISOString();
  entities[index] = entity;
  await writeEntities(entities);
  return true;
});

ipcMain.handle("external:avatar:getPath", (_, entityId) => {
  const dir = externalDir(entityId);
  if (!fs.existsSync(dir)) return null;

  const avatarFile = fs
    .readdirSync(dir)
    .find((f) => f.startsWith("avatar"));
  if (avatarFile) {
    return `file://${path.join(dir, avatarFile)}`;
  }
  return null;
});

ipcMain.handle("external:avatar:save", (_, entityId, buffer) => {
  const dir = ensureEntityFolder(entityId);
  const dest = path.join(dir, "avatar.jpg");
  fs.writeFileSync(dest, Buffer.from(buffer));
});

ipcMain.handle("external:avatar:delete", (_, entityId) => {
  const avatarPath = path.join(externalDir(entityId), "avatar.jpg");
  if (fs.existsSync(avatarPath)) {
    fs.unlinkSync(avatarPath);
    return { success: true };
  }
  return { success: false, message: "Файл не найден" };
});
