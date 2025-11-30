import JSZip from "jszip";
import { saveAs } from "file-saver";

const handleBackup = async () => {
  const zip = new JSZip();

  // 1. Сохраняем людей
  const people = await window.peopleAPI.getAll();
  zip.file("people.json", JSON.stringify(people, null, 2));

  // 2. Сохраняем аватары
  const avatarFolder = zip.folder("avatars");
  for (const person of people) {
    const path = await window.avatarAPI.getPath(person.id);
    const blob = await fetch(path).then((res) => res.blob());
    avatarFolder.file(`${person.id}.jpg`, blob);
  }

  // 3. Сохраняем фото (если есть)
  const photos = await window.photosAPI.getAll?.(); // если есть
  if (photos?.length) {
    const photoFolder = zip.folder("photos");
    for (const photo of photos) {
      const path = await window.photosAPI.getPath(photo.id);
      const blob = await fetch(path).then((res) => res.blob());
      photoFolder.file(`${photo.id}.jpg`, blob);
    }
    zip.file("photos.json", JSON.stringify(photos, null, 2));
  }

  // 4. Генерация и скачивание
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `genealogy-backup-${Date.now()}.zip`);
};
