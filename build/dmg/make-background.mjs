// Генерация фона окна DMG в стиле фирменного установщика.
//
// Рисуем SVG 600×693, затем растрируем в 600×693 (1x) и 1200×1386 (2x)
// и склеиваем в HiDPI-TIFF через tiffutil. Скрипт читает версию из
// package.json, поэтому фон не нужно править руками при релизе.
//
// Дизайн занимает верхние 600 px. Нижние 93 px — белый запас под панель
// окна Finder: фон рисуется в области содержимого, а WindowBounds
// задаётся по размеру картинки. У установщика MacFamilyTree то же самое:
// фон 600×600 при окне 600×693.
//
// Запуск: node build/dmg/make-background.mjs

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const { version } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
const icon = readFileSync(join(root, "build", "icons", "icon.png")).toString(
  "base64",
);
const icon_developer = readFileSync(join(root, "build", "icons", "developer.png")).toString(
  "base64",
);

const DESIGN_WIDTH = 600;
const DESIGN_HEIGHT = 600;
const WINDOW_CHROME = 93;
const WIDTH = DESIGN_WIDTH;
const HEIGHT = DESIGN_HEIGHT + WINDOW_CHROME;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="header" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#41c3bd"/>
      <stop offset="0.42" stop-color="#259aa3"/>
      <stop offset="1" stop-color="#0a394e"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.1" r="0.75">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="titleShadow" x="-10%" y="-20%" width="120%" height="150%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.4" flood-color="#032b3a" flood-opacity="0.38"/>
    </filter>
    <style>
      .title { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; }
      .subtitle, .caption, .brand, .site { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }
    </style>
  </defs>

  <!-- Белый запас под панель Finder (за пределами области содержимого) -->
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>

  <!-- Шапка -->
  <rect x="0" y="0" width="600" height="200" fill="url(#header)"/>
  <rect x="0" y="0" width="600" height="200" fill="url(#glow)"/>

  <image href="data:image/png;base64,${icon}" x="261" y="11" width="78" height="78"/>

  <text class="title" x="300" y="132" text-anchor="middle" font-size="47"
        letter-spacing="-1.4" fill="#ffffff" filter="url(#titleShadow)">Genealogy</text>
  <text class="subtitle" x="300" y="156" text-anchor="middle" font-size="13.5"
        letter-spacing="0.2" fill="#ffffff" fill-opacity="0.82">Версия ${version}</text>

  <!-- Зоны перетаскивания -->
  <rect x="85" y="232" width="175" height="166" rx="10" fill="#f4f5f7"/>
  <rect x="340" y="232" width="175" height="166" rx="10" fill="#f4f5f7"/>

  <!-- Стрелка -->
  <path d="M 271 315 H 317 M 305 302 L 321 315 L 305 328"
        fill="none" stroke="#1f1f1f" stroke-width="7.5"
        stroke-linecap="round" stroke-linejoin="round"/>

  <text class="caption" x="300" y="426" text-anchor="middle" font-size="15.5"
        fill="#3a3a3a">Перетащите Genealogy в папку „Программы“</text>

  <!-- Подпись внизу -->
  <image href="data:image/png;base64,${icon_developer}" x="277" y="470" width="46" height="46"/>
  <text class="brand" x="300" y="542" text-anchor="middle" font-size="22"
        font-weight="600" letter-spacing="0.2" fill="#123b4d">nebula.9371</text>
  <text class="site" x="300" y="567" text-anchor="middle" font-size="11.5"
        letter-spacing="0.2" fill="#8a9299">github.com/wolk8506/genealogy</text>
</svg>
`;

const svgPath = join(here, "background.svg");
const png1x = join(here, "background.png");
const png2x = join(here, "background@2x.png");
const tiff = join(here, "background.tiff");

writeFileSync(svgPath, svg);

const render = (scale, out) =>
  sharp(Buffer.from(svg), { density: 72 * scale })
    .resize(WIDTH * scale, HEIGHT * scale)
    .png()
    .toFile(out);

await render(1, png1x);
await render(2, png2x);

execFileSync("tiffutil", [
  "-cathidpicheck",
  png1x,
  png2x,
  "-out",
  tiff,
]);

console.log(`background.tiff: ${tiff}`);
