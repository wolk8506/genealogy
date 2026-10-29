// Генерация фирменных картинок установщика Windows (NSIS).
//
// NSIS принимает только BMP, поэтому рисуем SVG, растрируем sharp'ом
// и вручную кодируем 24-битный BMP (BI_RGB, строки снизу вверх).
//
//   installerSidebar.bmp — 164×314, MUI_WELCOMEFINISHPAGE_BITMAP
//   installerHeader.bmp  — 150×57,  MUI_HEADERIMAGE_BITMAP
//
// Запуск: npm run win:assets
// Версия берётся из package.json — при релизе картинки нужно перегенерировать.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const icon = readFileSync(join(root, "build", "icons", "icon.png")).toString(
  "base64",
);
const developer = readFileSync(
  join(root, "build", "icons", "developer.png"),
).toString("base64");

const { version } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);

const WHITE = "#ffffff";
const INK = "#0a394e";

const sidebarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0" stop-color="#41c3bd"/>
      <stop offset="0.45" stop-color="#259aa3"/>
      <stop offset="1" stop-color="#0a394e"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.05" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <style>
      .title, .tagline, .brand, .site { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
    </style>
  </defs>

  <rect width="164" height="314" fill="url(#bg)"/>
  <rect width="164" height="314" fill="url(#glow)"/>

  <image href="data:image/png;base64,${icon}" x="50" y="26" width="64" height="64"/>

  <text class="title" x="82" y="124" text-anchor="middle" font-size="19"
        font-weight="700" letter-spacing="-0.3" fill="${WHITE}">Genealogy</text>

  <rect x="64" y="138" width="36" height="1" fill="${WHITE}" fill-opacity="0.35"/>

  <text class="tagline" x="82" y="160" text-anchor="middle" font-size="10.5"
        letter-spacing="0.2" fill="${WHITE}" fill-opacity="0.82">Версия ${version}</text>

  <image href="data:image/png;base64,${developer}" x="59" y="214" width="46" height="46"/>

  <text class="brand" x="82" y="282" text-anchor="middle" font-size="12"
        font-weight="600" letter-spacing="0.2" fill="${WHITE}" fill-opacity="0.92">nebula.9371</text>
  <text class="site" x="82" y="296" text-anchor="middle" font-size="8"
        letter-spacing="0.1" fill="${WHITE}" fill-opacity="0.6">github.com/wolk8506/genealogy</text>
</svg>`;

const headerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="57" viewBox="0 0 150 57">
  <defs>
    <style>
      .name, .sub { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
    </style>
  </defs>

  <rect width="150" height="57" fill="${WHITE}"/>

  <image href="data:image/png;base64,${icon}" x="10" y="11" width="34" height="34"/>

  <text class="name" x="52" y="30" font-size="15" font-weight="700"
        letter-spacing="-0.3" fill="${INK}">Genealogy</text>
  <text class="sub" x="52" y="43" font-size="8.5"
        letter-spacing="0.2" fill="#6b7c85">УСТАНОВКА</text>
</svg>`;

// Иконка самого установщика: фирменная плитка со стрелкой «установить»,
// чтобы в проводнике и в списке программ её не путали с иконкой приложения.
const installerIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#41c3bd"/>
      <stop offset="0.45" stop-color="#259aa3"/>
      <stop offset="1" stop-color="#0a394e"/>
    </linearGradient>
    <radialGradient id="shine" cx="0.5" cy="0.06" r="0.78">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect x="8" y="8" width="240" height="240" rx="54" fill="url(#tile)"/>
  <rect x="8" y="8" width="240" height="240" rx="54" fill="url(#shine)"/>
  <rect x="8.75" y="8.75" width="238.5" height="238.5" rx="53.25"
        fill="none" stroke="${WHITE}" stroke-opacity="0.18" stroke-width="1.5"/>

  <rect x="60" y="184" width="136" height="20" rx="10"
        fill="${WHITE}" fill-opacity="0.92"/>

  <path d="M128 58 V148 M84 112 L128 156 L172 112"
        fill="none" stroke="${WHITE}" stroke-width="22"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const ICON_SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256];

/**
 * Кодирует RGBA/RGB-буфер sharp в 24-битный BMP (BI_RGB, bottom-up).
 */
function encodeBmp({ data, info }) {
  const { width, height, channels } = info;
  const rowStride = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowStride * height;
  const file = Buffer.alloc(54 + pixelBytes);

  file.write("BM", 0, "ascii");
  file.writeUInt32LE(54 + pixelBytes, 2);
  file.writeUInt32LE(54, 10);

  file.writeUInt32LE(40, 14);
  file.writeInt32LE(width, 18);
  file.writeInt32LE(height, 22);
  file.writeUInt16LE(1, 26);
  file.writeUInt16LE(24, 28);
  file.writeUInt32LE(0, 30);
  file.writeUInt32LE(pixelBytes, 34);
  file.writeInt32LE(2835, 38);
  file.writeInt32LE(2835, 42);
  file.writeUInt32LE(0, 46);
  file.writeUInt32LE(0, 50);

  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * width * channels;
    const dstRow = 54 + y * rowStride;
    for (let x = 0; x < width; x++) {
      const src = srcRow + x * channels;
      const dst = dstRow + x * 3;
      file[dst] = data[src + 2]; // B
      file[dst + 1] = data[src + 1]; // G
      file[dst + 2] = data[src]; // R
    }
  }

  return file;
}

/**
 * Кодирует набор RGBA-картинок в ICO с несжатыми 32-битными BMP-записями
 * (PNG-записи NSIS не понимает). Размеры 16…256 px.
 */
function encodeIco(images) {
  const dir = Buffer.alloc(6 + images.length * 16);

  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(images.length, 4);

  let offset = dir.length;
  const blobs = [];

  images.forEach(({ size, data }, index) => {
    const xorRow = size * 4;
    const andRow = Math.ceil(size / 32) * 4;
    const xorSize = xorRow * size;
    const andSize = andRow * size;
    const blob = Buffer.alloc(40 + xorSize + andSize);

    blob.writeUInt32LE(40, 0);
    blob.writeInt32LE(size, 4);
    blob.writeInt32LE(size * 2, 8);
    blob.writeUInt16LE(1, 12);
    blob.writeUInt16LE(32, 14);
    blob.writeUInt32LE(0, 16);
    blob.writeUInt32LE(xorSize + andSize, 20);

    for (let y = 0; y < size; y++) {
      const srcRow = (size - 1 - y) * size * 4;
      const dstRow = 40 + y * xorRow;
      for (let x = 0; x < size; x++) {
        const src = srcRow + x * 4;
        const dst = dstRow + x * 4;
        blob[dst] = data[src + 2]; // B
        blob[dst + 1] = data[src + 1]; // G
        blob[dst + 2] = data[src]; // R
        blob[dst + 3] = data[src + 3]; // A
      }
    }

    // AND-маска остаётся нулевой: прозрачность задаёт альфа-канал.
    const entry = 6 + index * 16;
    const dimension = size >= 256 ? 0 : size;
    dir.writeUInt8(dimension, entry);
    dir.writeUInt8(dimension, entry + 1);
    dir.writeUInt8(0, entry + 2);
    dir.writeUInt8(0, entry + 3);
    dir.writeUInt16LE(1, entry + 4);
    dir.writeUInt16LE(32, entry + 6);
    dir.writeUInt32LE(blob.length, entry + 8);
    dir.writeUInt32LE(offset, entry + 12);

    offset += blob.length;
    blobs.push(blob);
  });

  return Buffer.concat([dir, ...blobs]);
}

async function renderIco(svg, pngPath, icoPath) {
  const raster = sharp(Buffer.from(svg), { density: 72 });

  await raster.clone().png().toFile(pngPath);

  const images = [];
  for (const size of ICON_SIZES) {
    const { data } = await raster
      .clone()
      .resize(size, size)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    images.push({ size, data });
  }

  writeFileSync(icoPath, encodeIco(images));
}

async function render(svg, width, height, pngPath, bmpPath) {
  const raster = sharp(Buffer.from(svg), { density: 72 });

  await raster
    .clone()
    .flatten({ background: WHITE })
    .png()
    .toFile(pngPath);

  const { data, info } = await raster
    .flatten({ background: WHITE })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.width !== width || info.height !== height) {
    throw new Error(
      `Неверный размер ${bmpPath}: ${info.width}×${info.height}, ожидалось ${width}×${height}`,
    );
  }

  writeFileSync(bmpPath, encodeBmp({ data, info }));
}

await render(
  sidebarSvg,
  164,
  314,
  join(here, "installerSidebar.png"),
  join(here, "installerSidebar.bmp"),
);

await render(
  headerSvg,
  150,
  57,
  join(here, "installerHeader.png"),
  join(here, "installerHeader.bmp"),
);

await renderIco(
  installerIconSvg,
  join(here, "installerIcon.png"),
  join(here, "installerIcon.ico"),
);

console.log(
  "installerSidebar.bmp, installerHeader.bmp, installerIcon.ico готовы",
);
