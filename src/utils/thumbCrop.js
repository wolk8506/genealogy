// Кроп фрагмента для превью (thumbs): квадрат до 400px, WebP.
export const THUMB_MAX = 400;

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("Не удалось открыть изображение"));
    img.src = src;
  });
}

export async function cropToThumbWebp(imageSrc, pixels, maxSize = THUMB_MAX) {
  const img = await loadImage(imageSrc);
  const scale = Math.min(
    1,
    maxSize / Math.max(pixels.width, pixels.height),
  );
  const w = Math.max(1, Math.round(pixels.width * scale));
  const h = Math.max(1, Math.round(pixels.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas
    .getContext("2d")
    .drawImage(img, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Не удалось собрать превью")),
      "image/webp",
      0.85,
    );
  });
}

export const CROP_SOURCE_LABEL = {
  original: "Оригинал",
  webp: "WebP",
  legacy: "Файл",
};
