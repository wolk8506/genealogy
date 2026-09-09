
### Через Терминал (Рекомендуемый)
Подготовьте квадратное PNG-изображение высокой четкости (желательно 1024x1024 px). Назовите его icon.png.

Откройте Терминал и перейдите в папку с вашим изображением (или просто введите cd  и перетащите папку с файлом в окно Терминала).

Выполните следующие команды по очереди:


```bash
# 1. Создаем временную папку для набора иконок
mkdir icon.iconset

# 2. Генерируем все необходимые размеры из исходного icon.png
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png

# 3. Собираем итоговый .icns файл
iconutil -c icns icon.iconset

# 4. Удаляем временную папку
rm -rf icon.iconset
```