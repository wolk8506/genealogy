/** object-fit: contain — прямоугольник изображения внутри контейнера */
export function getContainedImageRect(containerW, containerH, imageW, imageH) {
  if (!containerW || !containerH || !imageW || !imageH) {
    return {
      x: 0,
      y: 0,
      width: containerW || 0,
      height: containerH || 0,
      scale: 1,
    };
  }

  const scale = Math.min(containerW / imageW, containerH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;

  return {
    x: (containerW - width) / 2,
    y: (containerH - height) / 2,
    width,
    height,
    scale,
  };
}

export function normalizedBoxToPixels(box, imageRect) {
  if (!box || !imageRect?.width || !imageRect?.height) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  return {
    left: imageRect.x + box.x * imageRect.width,
    top: imageRect.y + box.y * imageRect.height,
    width: box.w * imageRect.width,
    height: box.h * imageRect.height,
  };
}

export function pixelsToNormalizedBox(pixels, imageRect) {
  if (!imageRect?.width || !imageRect?.height) {
    return { x: 0, y: 0, w: 0.1, h: 0.1 };
  }

  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  const x = clamp01((pixels.left - imageRect.x) / imageRect.width);
  const y = clamp01((pixels.top - imageRect.y) / imageRect.height);
  const w = clamp01(pixels.width / imageRect.width);
  const h = clamp01(pixels.height / imageRect.height);

  return {
    x: clamp01(Math.min(x, 1 - w)),
    y: clamp01(Math.min(y, 1 - h)),
    w,
    h,
  };
}

export function clampNormalizedBox(box) {
  const w = Math.min(Math.max(box.w, 0.02), 1);
  const h = Math.min(Math.max(box.h, 0.02), 1);
  const x = Math.min(Math.max(box.x, 0), 1 - w);
  const y = Math.min(Math.max(box.y, 0), 1 - h);
  return { x, y, w, h };
}
