import JSZip from "jszip";
import { saveAs } from "file-saver";

export const exportPeopleToZip = async ({
  people,
  onProgress = () => {},
  filename = `Genealogy_export_${Date.now()}.zip`,
  save = true,
}) => {
  const zip = new JSZip();
  const total = people.length;

  zip.file("genealogy-data.json", JSON.stringify({ people }, null, 2));

  for (let i = 0; i < total; i++) {
    const person = people[i];
    const personPath = `people/${person.id}`;
    const personFolder = zip.folder(personPath);
    let hasContent = false;

    // 1. Аватар
    try {
      const avatarPath = await window.avatarAPI.getPath(person.id);
      const res = await fetch(avatarPath);
      if (res.ok) {
        const avatarBlob = await res.blob();
        if (avatarBlob && avatarBlob.size >= 1024) {
          personFolder.file("avatar.jpg", avatarBlob);
          hasContent = true;
        }
      }
    } catch {}

    // 2. Биография и изображения
    try {
      const bioText = await window.bioAPI.read(person.id);
      if (bioText) {
        personFolder.file("bio.md", bioText);
        hasContent = true;

        const imageMatches = [...bioText.matchAll(/!\[.*?\]\((.*?)\)/g)];
        const imagePaths = imageMatches.map((m) => m[1]);

        for (const relPath of imagePaths) {
          try {
            const blob = await window.bioAPI.readImage(person.id, relPath);
            personFolder.file(relPath, blob);
            hasContent = true;
          } catch {}
        }
      }
    } catch {}

    // 3. Фото
    try {
      const photos = await window.photosAPI.getByOwner(person.id);
      if (photos.length) {
        personFolder.file("photos.json", JSON.stringify(photos, null, 2));
        hasContent = true;

        const photoFolder = personFolder.folder("photos");

        for (const photo of photos) {
          try {
            const photoPath = await window.photosAPI.getPath(photo.id);
            if (!photoPath) continue;

            const ext = photoPath.split(".").pop().split("?")[0];
            const res = await fetch(photoPath);
            if (!res.ok) continue;

            const blob = await res.blob();
            const filename = photo.filename || `${photo.id}.${ext}`;
            photoFolder.file(filename, blob);
            hasContent = true;
          } catch {}
        }
      }
    } catch {}

    if (!hasContent) {
      zip.remove(personPath);
    }

    onProgress(Math.round(((i + 1) / total) * 100));
  }

  const blob = await zip.generateAsync({ type: "blob" });

  if (save) {
    saveAs(blob, filename);
  }

  return blob;
};
