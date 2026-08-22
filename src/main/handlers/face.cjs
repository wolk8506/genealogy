const { ipcMain, app } = require("electron");
const path = require("path");
const fs = require("fs");
const {
  loadFaceIndex,
  saveFaceIndex,
  saveFaceScanState,
  getFaceScanState,
  reassignReferencesToPerson,
} = require("../db/faceDb.cjs");

function getPeopleDir() {
  return path.join(app.getPath("documents"), "Genealogy", "people");
}

ipcMain.handle("face:loadIndex", async () => loadFaceIndex());

ipcMain.handle("face:saveIndex", async (event, index) => {
  return saveFaceIndex(index);
});

ipcMain.handle("face:saveScanState", async (event, scanState) => {
  return saveFaceScanState(scanState);
});

ipcMain.handle("face:getScanState", async () => {
  return getFaceScanState() || null;
});

ipcMain.handle("face:mergePersonIds", async (event, { keepPersonId, removePersonIds }) => {
  const keep = Number(keepPersonId);
  const removeSet = new Set((removePersonIds || []).map(Number));

  if (!keep || removeSet.size === 0) {
    return { updatedPhotos: 0, updatedFaces: 0 };
  }

  removeSet.delete(keep);

  const peopleDir = getPeopleDir();
  if (!fs.existsSync(peopleDir)) {
    return { updatedPhotos: 0, updatedFaces: 0 };
  }

  let updatedPhotos = 0;
  let updatedFaces = 0;

  const folders = fs
    .readdirSync(peopleDir)
    .filter((f) => fs.statSync(path.join(peopleDir, f)).isDirectory());

  for (const folder of folders) {
    const jsonPath = path.join(peopleDir, folder, "photos.json");
    if (!fs.existsSync(jsonPath)) continue;

    let photos;
    try {
      photos = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    } catch {
      continue;
    }

    let changed = false;

    for (const photo of photos) {
      if (Array.isArray(photo.faces)) {
        for (const face of photo.faces) {
          if (removeSet.has(Number(face.personId))) {
            face.personId = keep;
            updatedFaces += 1;
            changed = true;
          }
          if (removeSet.has(Number(face.suggestedPersonId))) {
            face.suggestedPersonId = keep;
            changed = true;
          }
        }
      }

      if (Array.isArray(photo.people)) {
        const nextPeople = photo.people.map((id) =>
          removeSet.has(Number(id)) ? keep : id,
        );
        const unique = [...new Set(nextPeople)];
        if (JSON.stringify(unique) !== JSON.stringify(photo.people)) {
          photo.people = unique;
          changed = true;
        }
      }
    }

    if (changed) {
      fs.writeFileSync(jsonPath, JSON.stringify(photos, null, 2), "utf-8");
      updatedPhotos += 1;
    }
  }

  const { updatedReferences } = reassignReferencesToPerson(keep, Array.from(removeSet));

  return { updatedPhotos, updatedFaces, updatedReferences };
});
