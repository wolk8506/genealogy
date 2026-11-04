import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Определяем путь к исходной иконке (предполагается, что icon.png лежит рядом со скриптом или в корне)
// Можете изменить путь на нужный вам
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Путь к icon.png рядом со скриптом
const iconPng = path.join(__dirname, 'icon.png');
const iconSetDir = path.join(__dirname, 'icon.iconset');

try {
  console.log('1. Создаем временную папку для набора иконок...');
  if (fs.existsSync(iconSetDir)) {
    fs.rmSync(iconSetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(iconSetDir);

  console.log('2. Генерируем все необходимые размеры с помощью sips...');
  const sizes = [
    [16, 'icon_16x16.png'],
    [32, 'icon_16x16@2x.png'],
    [32, 'icon_32x32.png'],
    [64, 'icon_32x32@2x.png'],
    [128, 'icon_128x128.png'],
    [256, 'icon_128x128@2x.png'],
    [256, 'icon_256x256.png'],
    [512, 'icon_256x256@2x.png'],
    [512, 'icon_512x512.png'],
    [1024, 'icon_512x512@2x.png'],
  ];

  for (const [size, filename] of sizes) {
    const outPath = path.join(iconSetDir, filename);
    execSync(`sips -z ${size} ${size} "${iconPng}" --out "${outPath}"`, { stdio: 'inherit' });
  }

  console.log('3. Собираем итоговый .icns файл...');
  execSync(`iconutil -c icns "${iconSetDir}"`, { stdio: 'inherit' });

  console.log('4. Удаляем временную папку...');
  fs.rmSync(iconSetDir, { recursive: true, force: true });

  console.log('✨ Готово! Файл .icns успешно создан.');
} catch (error) {
  console.error('❌ Ошибка при выполнении скрипта:', error.message);
  // На всякий случай пытаемся убрать за собой временную папку при ошибке
  if (fs.existsSync(iconSetDir)) {
    fs.rmSync(iconSetDir, { recursive: true, force: true });
  }
  process.exit(1);
}