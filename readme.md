🧬 Genealogy App
Приложение для построения и управления генеалогическим древом. Создано на базе Electron + React + MUI, с локальным хранением данных в JSON и поддержкой аватаров.
🚀 Запуск проекта
bash
npm install
npm run dev
📁 Структура данных
Каждый человек представлен объектом:
json
{
"id": 20013,
"foto": "00001m.png",
"gender": "male",
"firstName": "Юрий",
"lastName": "Кондратенко",
"children": [30039, 30040],
"father": null,
"mother": null
}
Данные хранятся в:
~/Documents/genealogy-data.json
Аватары — в:
~/Documents/Genealogy/images/avatar/
🖼️ Отображение аватаров
Для загрузки локальных изображений через file:// используется временное отключение защиты:
js
webPreferences: {
preload: path.join(\_\_dirname, 'preload.js'),
contextIsolation: true,
nodeIntegration: false,
webSecurity: false // 👈 разрешает file://
}
⚠️ Важно: в продакшене рекомендуется включить webSecurity: true и использовать protocol.registerFileProtocol для безопасного доступа к локальным файлам.
📌 Возможности
Добавление и просмотр людей
Сохранение данных в JSON
Отображение родителей и детей
Аватары с fallback по инициалам
IPC между React и Electron
