import JSZip from "jszip";
import { saveAs } from "file-saver";

const handleBackup = async () => {
  const zip = new JSZip();

  // СОЗДАЕМ ПАСПОРТ АРХИВА
  const manifest = {
    app: "FamilyTreePro", // Уникальный ID вашего приложения
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    contents: {
      hasPeople: true,
      hasPhotos: false,
      count: 0,
    },
  };

  // 1. Сохраняем людей
  const people = await window.peopleAPI.getAll();
  manifest.contents.count = people.length;

  // Сохраняем манифест первым файлом
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

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
