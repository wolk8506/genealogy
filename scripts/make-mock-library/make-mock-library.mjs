#!/usr/bin/env node
// Генератор маленькой моковой библиотеки Genealogy для тестов.
//
// Собирает ~30 человек в 6 поколениях: семьи с браками и разводом, большая
// семья, человек без потомков, события с географией, факты, биографии разной
// длины, фотоальбом (original/webp/thumbs + аватары), теги и справочник
// внешних сущностей. Всё детерминировано: один seed — один и тот же набор.
//
// Имена, фамилии и места генерируются случайно из вымышленных справочников и
// не пересекаются с реальной семейной базой; украинских мест нет.
//
// Часть снимков — фотореалистичные заготовки из scripts/mock-assets: аватары
// «моей семьи», старших поколений и справочника, плюс четыре фотографии. Они
// нужны для скриншотов в инструкцию; лица и питомцы вымышленные, остальные
// участники остаются процедурными силуэтами.
//
// Запуск: npm run mock:library
//         npm run mock:library -- --out /tmp/genealogy-mock --seed 7 --fresh
//
// Папка вывода намеренно вне репозитория: в git не попадают ни скриптовые
// данные, ни изображения.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import sharp from "sharp";

const MARKER = "MOCK_README.txt";

// Кандидат в «Это я» по умолчанию: средний внук, у которого есть и предки, и
// потомки, — дерево сразу показывает несколько поколений.
const HOME_ID = 50001;

const HELP = `Генератор моковой библиотеки Genealogy

  --out <папка>   куда писать (по умолчанию ~/Documents/Genealogy-Mock)
  --seed <число>  зерно: от него зависят имена, места, даты и снимки (20261101)
  --fresh         сначала удалить папку вывода (только если в ней есть ${MARKER})
  --help          эта справка`;

function parseArgs(argv) {
  const opts = {
    out: join(homedir(), "Documents", "Genealogy-Mock"),
    seed: 20261101,
    fresh: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      console.log(HELP);
      process.exit(0);
    } else if (arg === "--out") {
      const value = argv[i + 1];
      if (!value) throw new Error("--out: нужен путь к папке");
      opts.out = isAbsolute(value) ? value : resolve(value);
      i += 1;
    } else if (arg === "--seed") {
      opts.seed = Number.parseInt(argv[i + 1], 10);
      if (!Number.isFinite(opts.seed)) throw new Error("--seed: нужно число");
      i += 1;
    } else if (arg === "--fresh") {
      opts.fresh = true;
    } else {
      throw new Error(`Неизвестный аргумент: ${arg}`);
    }
  }

  return opts;
}

const opts = parseArgs(process.argv.slice(2));

// ─── справочники ────────────────────────────────────────────────────────────
// Имена, фамилии, названия мест и предприятий вымышлены и выбираются случайно
// по зерну: мок нельзя спутать с реальной семейной базой. Места лежат севернее
// и восточнее Украины (широта 52.8+, долгота 43.5+), украинских топонимов нет.

// Область пишется целиком: «обл.» дало бы двойную точку в конце предложений.
const REGION_POOL = ["Заречская область", "Верхнеозёрская область", "Ключевская область"];

// kind + core дают «г. Ясногорск», adj — «Ясногорский» для учреждений.
const PLACE_POOL = [
  { kind: "г.", core: "Ясногорск", adj: "Ясногорский", slug: "ясногорск" },
  { kind: "с.", core: "Ветляны", adj: "Ветлянский", slug: "ветляны" },
  { kind: "д.", core: "Сухое Оземье", adj: "Оземьевский", slug: "сухое-оземье" },
  { kind: "г.", core: "Купавинск", adj: "Купавинский", slug: "купавинск" },
  { kind: "с.", core: "Таврино", adj: "Тавринский", slug: "таврино" },
  { kind: "пгт", core: "Чащобка", adj: "Чащобский", slug: "чащобка" },
  { kind: "г.", core: "Полулесск", adj: "Полулесский", slug: "полулесск" },
  { kind: "с.", core: "Крутояр", adj: "Крутоярский", slug: "крутояр" },
  { kind: "д.", core: "Ключище", adj: "Ключищенский", slug: "ключище" },
  { kind: "г.", core: "Слюднянь", adj: "Слюднянский", slug: "слюднянь" },
  { kind: "с.", core: "Урканово", adj: "Уркановский", slug: "урканово" },
  { kind: "х.", core: "Ясный Дол", adj: "Яснодолский", slug: "ясный-дол" },
];

// Все имена оканчиваются на твёрдую согласную — отчество строится одним
// правилом (имена на -ий дали бы «Лаврентийович», этого в пуле нет).
const MALE_FIRST = [
  "Иларион", "Куприян", "Ростислав", "Макар", "Нестор", "Онисим", "Прохор",
  "Ратибор", "Остромир", "Устин", "Фрол", "Хрисанф", "Всеволод", "Игнат",
  "Тарас", "Изяслав", "Архип", "Пересвет", "Радомир", "Любим",
];

const FEMALE_FIRST = [
  "Аграфена", "Устинья", "Пелагея", "Ярослава", "Радомира", "Любомира",
  "Доброслава", "Бояна", "Цветана", "Снежана", "Милена", "Велена", "Лада",
  "Забава", "Купава", "Рогнеда", "Весна", "Злата", "Любава", "Милана",
];

// Мужские формы; женская — суффиксом (-ский → -ская, остальное → +а).
const SURNAME_POOL = [
  "Ветлянов", "Оземцов", "Заржицкий", "Ясновин", "Купавин", "Таврин",
  "Урканов", "Плесоцкий", "Вьюжанин", "Чащобин", "Неводский", "Крутояров",
  "Слюдянов", "Гремяченский",
];

const CHURCHES = [
  "Церковь Покрова на Язе",
  "Михайло-Архангельский храм",
  "Николаевская церковь",
  "Казанская часовня",
];

const FARMS = ["«Светочь»", "«Вершки»", "«Рассвет-2»", "«Колосок»", "«Пахарь»"];

const SHOPS = ["«Ясень»", "«Полесье»", "«Кедр»", "«Надежда»"];

const STREETS = [
  "ул. Ясеневая",
  "ул. Ключевая",
  "переулок Тихий",
  "проспект Заречный",
  "ул. Степная Ветка",
  "набережная Ременная",
  "ул. Гончарная",
];

const PET_NAMES = ["Барсик", "Уголёк", "Капитан", "Мурка", "Снежок", "Полкан", "Рич", "Кнопка"];

// Список кодов страны берём из самого приложения: fact «Национальность»
// отображается только для значения из этого справочника, а «Украина» здесь
// исключена — мест и народностей из неё в моке нет.
const NATIONALITIES = JSON.parse(
  readFileSync(new URL("../src/pages/Page_Person/Facts/nationalities.json", import.meta.url), "utf8"),
)
  .filter((entry) => entry.country !== "Ukraine")
  .map((entry) => entry.country);

// Пол, даты и связи. Имена, фамилии, отчества и места генерируются выше по
// зерну. generation берётся из id: 60001 → 6-е поколение.
// parents — оба родителя, порядок не важен: отец и мать определяются по полу.
// spouse достаточно указать у одного из пары.
const PEOPLE = [
  // Поколение 1 — прапрадеды
  { id: 10001, gender: "male", birth: [1874, 1, 12], died: [1943, 7, 3], spouse: [10002] },
  { id: 10002, gender: "female", birth: [1878, 3, 27], died: [1951, 11, 8], parents: null },

  // Поколение 2 — прадеды
  { id: 20001, gender: "male", birth: [1901, 5, 9], died: [1978, 2, 14], spouse: [20002], parents: [10001, 10002] },
  { id: 20002, gender: "female", birth: [1905, 8, 21], died: [1984, 6, 30] },
  { id: 20003, gender: "female", birth: [1904, 2, 3], died: [1992, 10, 17], spouse: [20004], parents: [10001, 10002] },
  { id: 20004, gender: "male", birth: [1900, 12, 1], died: [1968, 4, 22] },

  // Поколение 3 — деды
  { id: 30001, gender: "male", birth: [1932, 4, 18], died: [2011, 9, 2], spouse: [30002], parents: [20001, 20002] },
  { id: 30002, gender: "female", birth: [1936, 7, 6], died: [2019, 1, 25] },
  { id: 30003, gender: "female", birth: [1935, 10, 14], died: [2018, 5, 6], spouse: [30004], divorce: [1979, 4, 11], parents: [20001, 20002] },
  { id: 30004, gender: "male", birth: [1933, 6, 30], died: [2005, 12, 12] },
  { id: 30005, gender: "male", birth: [1940, 11, 23], died: null, parents: [20001, 20002], bio: "short" },
  { id: 30006, gender: "female", birth: [1944, 3, 11], died: [2021, 8, 19], spouse: [30007], parents: [20003, 20004] },
  { id: 30007, gender: "male", birth: [1942, 1, 30], died: [2019, 3, 4] },

  // Поколение 4 — родители
  { id: 40001, gender: "male", birth: [1960, 9, 5], spouse: [40002], parents: [30001, 30002], bio: "long" },
  { id: 40002, gender: "female", birth: [1963, 2, 17] },
  { id: 40003, gender: "female", birth: [1964, 12, 9], spouse: [40004], parents: [30001, 30002] },
  { id: 40004, gender: "male", birth: [1962, 4, 26] },
  { id: 40005, gender: "male", birth: [1968, 7, 13], spouse: [40006], parents: [30003, 30004] },
  { id: 40006, gender: "female", birth: [1970, 10, 2] },
  { id: 40007, gender: "female", birth: [1972, 5, 20], spouse: [40008], parents: [30006, 30007], bio: "medium" },
  { id: 40008, gender: "male", birth: [1969, 8, 8] },

  // Поколение 5 — внуки
  { id: 50001, gender: "male", birth: [1988, 2, 4], spouse: [50002], parents: [40001, 40002], bio: "long" },
  { id: 50002, gender: "female", birth: [1990, 6, 21] },
  { id: 50003, gender: "female", birth: [1992, 3, 15], parents: [40001, 40002], bio: "medium" },
  { id: 50004, gender: "female", birth: [1990, 11, 27], parents: [40003, 40004] },
  { id: 50005, gender: "male", birth: [1997, 1, 8], parents: [40001, 40002] },
  { id: 50006, gender: "male", birth: [1995, 9, 30], parents: [40003, 40004] },
  { id: 50007, gender: "male", birth: [1998, 4, 12], parents: [40005, 40006] },
  { id: 50008, gender: "female", birth: [2003, 12, 16], parents: [40007, 40008] },

  // Поколение 6 — правнуки
  { id: 60001, gender: "female", birth: [2015, 5, 2], parents: [50001, 50002] },
  { id: 60002, gender: "male", birth: [2019, 8, 19], parents: [50001, 50002] },
];

// Большая семья: у 40001+40002 трое детей (50001, 50003, 50005).
// Развод: 30003 и 30004. Без пары и потомков: 30005.

const TAGS = [
  { id: "tag-1", name: "Родственник", color: "#2196f3" },
  { id: "tag-2", name: "Исследуется", color: "#ff9800" },
  { id: "tag-3", name: "Ветка по отцу", color: "#3f51b5" },
  { id: "tag-4", name: "Ветка по матери", color: "#e91e63" },
  { id: "tag-5", name: "Требует уточнения", color: "#f44336" },
];

const PERSON_TAGS = {
  10001: ["tag-3"],
  10002: ["tag-4"],
  20001: ["tag-3"],
  20003: ["tag-4", "tag-2"],
  30001: ["tag-3"],
  30003: ["tag-4", "tag-5"],
  30004: ["tag-5"],
  30005: ["tag-2"],
  30007: ["tag-4"],
  40001: ["tag-1", "tag-3"],
  40003: ["tag-4"],
  50001: ["tag-1"],
  50004: ["tag-2", "tag-5"],
  50008: ["tag-2"],
};

// Справочник: связи фиксированы, а клички, имена, контакты и роли берутся из
// тех же случайных пулов, что и люди.
const EXTERNAL = [
  {
    id: "E10001",
    type: "pet",
    species: "Дворняжка",
    relations: [
      { mainPersonId: 50001, relationType: "pet_owner", dates: "1996—2009" },
      { mainPersonId: 50002, relationType: "pet_owner", dates: "1996—2009" },
    ],
  },
  {
    id: "E10002",
    type: "pet",
    species: "Кошка",
    relations: [{ mainPersonId: 40001, relationType: "pet_owner", dates: "2004—2018" }],
  },
  {
    id: "E10003",
    type: "person",
    gender: "female",
    role: "Крёстная мать, хранит семейные фотографии.",
    phone: true,
    address: true,
    relations: [{ mainPersonId: 40002, relationType: "godmother", dates: "" }],
  },
  {
    id: "E10004",
    type: "person",
    gender: "male",
    role: "Одноклассник, свидетель на браке.",
    address: true,
    relations: [
      { mainPersonId: 50001, relationType: "friend_m", dates: "с 1995" },
      { mainPersonId: 40001, relationType: "colleague", dates: "1985—2001" },
    ],
  },
];

// Кому генерировать галерейные фото: [ownerId, количество, [ещё люди на фото]]
const PHOTO_PLAN = [
  [10002, 1, []],
  [20001, 2, [20002]],
  [20003, 1, [20004]],
  [30001, 2, [30002]],
  [30003, 1, [30004]],
  [30006, 2, [30007]],
  [40001, 3, [40002, 50001]],
  [40003, 1, [40004]],
  [40005, 2, [40006]],
  [50001, 1, [50002, 60001, 60002]],
  [50003, 2, []],
  [60001, 1, [60002]],
];

// Фотореалистичные заготовки для скриншотов инструкции лежат в mock-assets:
// avatar-<id> — аватар человека или внешней сущности, photo-* — снимок в
// галерее. Лица и питомцы сгенерированы нейросетью, людей из реальной базы
// среди них нет; пращурам достались портреты «под старину» их эпохи. Кого нет
// в mock-assets, тот получает процедурный силуэт.

// Ключ — «владелец:номер снимка в PHOTO_PLAN». Дату, людей и подпись заданы
// явно: кадр подобран под них, и от зерна эти поля зависеть не должны.
// `hashtags` — список целиком, `tag` — постоянный хэштег к хэштегу места.
const REAL_PHOTOS = new Map([
  [
    "50001:0",
    {
      asset: "photo-family_01",
      datePhoto: "2024-09-19",
      shape: { w: 1200, h: 800, ratio: "3/2" },
      title: "Вся семья",
      description: "Летний вечер в саду, сняты все четверо.",
      hashtags: [],
    },
  ],
  [
    "40001:0",
    {
      asset: "photo-grandparents",
      datePhoto: "2024-08-10",
      people: [40001, 40002], // сына на этом кадре нет
      shape: { w: 900, h: 1200, ratio: "3/4" },
      title: "Домашний портрет",
      description: "Отпечаток из домашнего архива, оцифрован.",
      hashtags: [],
    },
  ],
  [
    "60001:0",
    {
      asset: "photo-kids",
      datePhoto: "2024-09-19",
      tag: "#портрет",
      shape: { w: 1000, h: 1000, ratio: "1/1" },
      title: "Дети в саду",
      description: "Рассматривают гусеницу у калитки.",
    },
  ],
  [
    "30001:0",
    {
      asset: "photo-vintage",
      datePhoto: "1958-02-19",
      tag: "#дерево",
      shape: { w: 900, h: 1200, ratio: "3/4" },
      title: "Снимок 1958 года",
      description: "Плёнка, потёртости по краям отпечатка.",
    },
  ],
]);

// Кадры, которые в библиотеку импортировало само приложение: оригинал
// копируется без изменений, метаданные — как в карточке фото.
const IMPORT_DATE = "2026-11-01";
const IMPORTED_PHOTOS = [
  { owner: 60001, asset: "photo-family_03", datePhoto: "2024-08-10", ratio: "4/3" },
  { owner: 60001, asset: "photo-family_04", datePhoto: "2024-09-18", ratio: "4/3" },
  { owner: 60001, asset: "photo-60001", datePhoto: "2024-09-19", ratio: "1/1" },
  { owner: 60002, asset: "photo-family_05", datePhoto: "2024-08-10", ratio: "1/1" },
  { owner: 60002, asset: "photo-family_02", datePhoto: "2024-09-19", ratio: "1/1" },
];

// Файл из mock-assets — .jpg или .jpeg. Нет файла → null, и на его место
// встанет процедурный силуэт.
function realAsset(name) {
  for (const ext of ["jpg", "jpeg"]) {
    const url = new URL(`./mock-assets/${name}.${ext}`, import.meta.url);
    if (existsSync(url)) {
      return { buffer: readFileSync(url), filename: `${name}.${ext}` };
    }
  }
  return null;
}

// ─── утилиты ────────────────────────────────────────────────────────────────

function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(opts.seed);
const pick = (list) => list[Math.floor(rng() * list.length)];
const chance = (probability) => rng() < probability;
const between = (min, max) => min + Math.floor(rng() * (max - min + 1));

const pad = (value) => String(value).padStart(2, "0");
const dmy = ([year, month, day]) => `${pad(day)}.${pad(month)}.${year}`;
const iso = ([year, month, day]) => `${year}-${pad(month)}-${pad(day)}`;

function addYears([year, month, day], years) {
  return [year + years, month, day];
}

function addDays([year, month, day], days) {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
}

function initials(person) {
  return `${person.firstName[0]}${person.lastName[0]}`.toUpperCase();
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Женская форма: «Заржицкий» → «Заржицкая», «Ветлянов» → «Ветлянова».
const femaleSurname = (masculine) =>
  masculine.endsWith("ий")
    ? `${masculine.slice(0, -2)}ая`
    : `${masculine}а`;

// «Ветлянов» → «Ветляновых», «Заржицкий» → «Заржицких».
const familyGenitive = (masculine) =>
  masculine.endsWith("ий")
    ? `${masculine.slice(0, -2)}их`
    : `${masculine}ых`;

// ─── места, имена и фамилии ─────────────────────────────────────────────────

// Семь вымышленных мест на случайных координатах: карта, события и фото
// ссылаются на них по ключу p1…p7.
function buildPlaces() {
  const region = pick(REGION_POOL);
  const places = {};

  for (const [index, entry] of shuffle(PLACE_POOL).slice(0, 7).entries()) {
    places[`p${index + 1}`] = {
      label: `${entry.kind} ${entry.core}, ${region}`,
      core: entry.core,
      adj: entry.adj,
      adjFem: femaleSurname(entry.adj),
      adjNeu: `${entry.adj.slice(0, -2)}ое`,
      slug: entry.slug,
      lat: Number((52.8 + rng() * 5.4).toFixed(4)),
      lng: Number((43.5 + rng() * 15.5).toFixed(4)),
    };
  }

  return places;
}

const PLACES = buildPlaces();
const PLACE_KEYS = Object.keys(PLACES);

const rawById = new Map(PEOPLE.map((entry) => [entry.id, entry]));
const spousesTable = new Map(PEOPLE.map((entry) => [entry.id, new Set()]));

for (const entry of PEOPLE) {
  for (const spouseId of entry.spouse ?? []) {
    spousesTable.get(entry.id).add(spouseId);
    spousesTable.get(spouseId).add(entry.id);
  }
}

// Порядок parents в таблице не важен: отец и мать определяются по полу, чтобы
// фамилия и отчество всегда шли по отцовской линии.
const parentByGender = (entry, gender) =>
  (entry.parents ?? []).map((id) => rawById.get(id)).find((parent) => parent?.gender === gender) ?? null;

// Родовая фамилия достаётся детям от отца, женам — от мужа (своя уходит в
// maidenName). Имена не повторяются: пулы заведомо больше числа людей.
function buildNames() {
  const byId = new Map();
  const ownSurname = new Map();
  const used = new Set();
  const surnames = shuffle(SURNAME_POOL);
  let surnameCursor = 0;

  const takeFirst = (gender) => {
    const pool = gender === "female" ? FEMALE_FIRST : MALE_FIRST;
    const name =
      shuffle(pool).find((entry) => !used.has(`${gender}:${entry}`)) ?? pick(pool);
    used.add(`${gender}:${name}`);
    return name;
  };

  for (const entry of [...PEOPLE].sort((a, b) => a.id - b.id)) {
    const father = parentByGender(entry, "male");
    ownSurname.set(
      entry.id,
      (father && ownSurname.get(father.id)) || surnames[surnameCursor++ % surnames.length],
    );
  }

  const firstName = new Map();
  for (const entry of PEOPLE) firstName.set(entry.id, takeFirst(entry.gender));

  for (const entry of [...PEOPLE].sort((a, b) => a.id - b.id)) {
    const father = parentByGender(entry, "male");
    const fatherFirst = father
      ? firstName.get(father.id)
      : pick(MALE_FIRST); // «дед», которого нет в базе
    const suffix = entry.gender === "female" ? "овна" : "ович";

    const husbands = [...spousesTable.get(entry.id)]
      .map((id) => rawById.get(id))
      .filter((spouse) => spouse.gender === "male");
    const maidenKey = entry.gender === "female" && husbands.length ? ownSurname.get(husbands[0].id) : null;
    const familyName = maidenKey || ownSurname.get(entry.id);

    byId.set(entry.id, {
      first: firstName.get(entry.id),
      last: entry.gender === "female" ? femaleSurname(familyName) : familyName,
      maiden: maidenKey ? femaleSurname(ownSurname.get(entry.id)) : null,
      patronymic: `${fatherFirst}${suffix}`,
      place: (() => {
        const fatherPlace = father ? byId.get(father.id)?.place : null;
        return fatherPlace && chance(0.7) ? fatherPlace : pick(PLACE_KEYS);
      })(),
    });
  }

  return { byId, lineSurname: ownSurname.get(10001) };
}

// Фамилия родовой линии — она же «семья N» в подписях справочника.
const { byId: NAMES, lineSurname: LINE_SURNAME } = buildNames();

// ─── сборка графа ───────────────────────────────────────────────────────────

const byId = new Map();

for (const raw of PEOPLE) {
  const name = NAMES.get(raw.id);
  const person = {
    id: raw.id,
    archived: false,
    gender: raw.gender,
    firstName: name.first,
    lastName: name.last,
    maidenName: name.maiden,
    patronymic: name.patronymic,
    birthday: dmy(raw.birth),
    died: raw.died ? dmy(raw.died) : null,
    children: [],
    siblings: [],
    spouse: [...(raw.spouse ?? [])],
    generation: Math.floor(raw.id / 10000),
    father: parentByGender(raw, "male")?.id ?? null,
    mother: parentByGender(raw, "female")?.id ?? null,
    facts: [],
    events: [],
    createdAt: "2026-01-05T09:00:00.000Z",
    editedAt: "2026-10-30T18:00:00.000Z",
  };
  byId.set(person.id, person);
}

// spouse симметрично, дети и сиблинги — из parents
for (const person of byId.values()) {
  for (const spouseId of person.spouse) {
    const spouse = byId.get(spouseId);
    if (spouse && !spouse.spouse.includes(person.id)) spouse.spouse.push(person.id);
  }
}

const couples = new Map();

for (const person of byId.values()) {
  if (!person.father || !person.mother) continue;
  const key = [person.father, person.mother].join("-");
  if (!couples.has(key)) couples.set(key, []);
  couples.get(key).push(person.id);
}

for (const [key, children] of couples) {
  const [fatherId, motherId] = key.split("-").map(Number);
  for (const childId of children) {
    for (const parentId of [fatherId, motherId]) {
      const parent = byId.get(parentId);
      if (!parent.children.includes(childId)) parent.children.push(childId);
    }
  }
  for (const childId of children) {
    const child = byId.get(childId);
    child.children.sort((a, b) => a - b);
    child.siblings = children.filter((id) => id !== childId);
  }
}

for (const person of byId.values()) {
  person.children.sort((a, b) => a - b);
  person.siblings.sort((a, b) => a - b);
}

// ─── факты и события ────────────────────────────────────────────────────────

// Учреждения и производства называются по вымышленному месту человека, поэтому
// ни одно не совпадает с реальной семейной базой.
const occupationsFor = (placeKey) => {
  const p = PLACES[placeKey];
  return [
    `Агроном, совхоз ${pick(FARMS)}`,
    `Наладчик станков, ${p.adj} механический завод`,
    `Учитель математики, ${p.adjFem} средняя школа №${between(1, 11)}`,
    `Инженер-электронщик, ${p.adjNeu} конструкторское бюро`,
    `Врач-терапевт, ${p.adjFem} районная больница`,
    `Продавец, универмаг ${pick(SHOPS)}`,
    `Сварщик, ${p.adj} авторемонтный комбинат`,
    `Экономист, ${p.adj} финотдел`,
  ];
};

const schoolsFor = (placeKey) => {
  const p = PLACES[placeKey];
  return [
    `Средняя школа №${between(1, 12)} (${p.core})`,
    `${p.adj} аграрный техникум`,
    `${p.adj} педагогический институт`,
    `${p.adj} политехнический университет`,
    `${p.adjNeu} мореходное училище`,
    `${p.adjFem} лесотехническая академия`,
  ];
};

const eyeColors = ["Карие", "Зелёные", "Голубые", "Серые"];
const hairColors = ["Тёмно-русые", "Русые", "Светло-русые", "Седые"];
const bloodTypes = ["O(I) Rh+", "A(II) Rh+", "B(III) Rh-", "AB(IV) Rh+"];

let eventSeq = 0;
function pushEvent(person, event) {
  person.events.push({
    type: event.type,
    date: event.date ? dmy(event.date) : "",
    description: event.description ?? "",
    notes: event.notes ?? "",
    place: event.place ? PLACES[event.place].label : "",
    participants: event.participants ?? [],
    ...(event.place && PLACES[event.place].lat != null && event.geo !== false
      ? { lat: PLACES[event.place].lat, lng: PLACES[event.place].lng }
      : {}),
    externalParticipants: [],
    id: (eventSeq += 1),
    createdAt: "2026-01-05T09:00:00.000Z",
    editedAt: "2026-01-05T09:00:00.000Z",
  });
}

function pushFact(person, type, value) {
  person.facts.push({
    type,
    value,
    createdAt: "2026-01-06T10:00:00.000Z",
    editedAt: "2026-01-06T10:00:00.000Z",
  });
}

for (const person of byId.values()) {
  const raw = rawById.get(person.id);
  const placeKey = NAMES.get(person.id).place;

  pushEvent(person, {
    type: "Рождение",
    date: raw.birth,
    description: chance(0.4) ? `${PLACES[placeKey].adj} роддом` : "",
    place: placeKey,
    geo: false,
  });

  // Крещение — только у ранних поколений, как в настоящих архивах.
  if (person.generation <= 2) {
    pushEvent(person, {
      type: "Крещение",
      date: addDays(raw.birth, between(8, 40)),
      description: pick(CHURCHES),
      place: placeKey,
    });
  }

  if (person.generation >= 3 && person.generation <= 5) {
    const studyKey = pick(PLACE_KEYS);
    pushEvent(person, {
      type: "Образование",
      date: addYears(raw.birth, 18),
      description: pick(schoolsFor(studyKey)),
      place: studyKey,
    });
  }

  if (person.generation >= 3) {
    pushEvent(person, {
      type: "Род занятий",
      date: addYears(raw.birth, 23),
      description: pick(occupationsFor(placeKey)),
      place: placeKey,
    });
  }

  if (chance(0.5)) {
    pushEvent(person, {
      type: "Место жительства",
      date: addYears(raw.birth, between(25, 45)),
      description: `${pick(STREETS)}, ${between(1, 60)}${chance(0.4) ? `, кв. ${between(1, 40)}` : ""}`,
      place: placeKey,
    });
  }

  for (const spouseId of person.spouse) {
    if (person.id > spouseId) continue; // одна запись на пару
    const spouse = byId.get(spouseId);
    const wedding = addYears(raw.birth, between(21, 29));
    pushEvent(person, {
      type: "Брак",
      date: wedding,
      description: pick([
        `${PLACES[placeKey].adj} дворец бракосочетания`,
        `Сельский совет, ${PLACES[placeKey].core}`,
        pick(CHURCHES),
      ]),
      place: placeKey,
      participants: [spouseId],
    });
    pushEvent(spouse, {
      type: "Брак",
      date: wedding,
      description: "Запись акта о браке",
      place: placeKey,
      participants: [person.id],
    });
  }

  if (raw.divorce) {
    pushEvent(person, {
      type: "Развод",
      date: raw.divorce,
      description: "Решение народного суда",
      place: placeKey,
      participants: person.spouse,
    });
  }

  if (raw.died) {
    pushEvent(person, {
      type: "Смерть",
      date: raw.died,
      description: "",
      place: placeKey,
    });
  }

  if (person.generation >= 3 && chance(0.75)) {
    pushFact(person, "Рост", String(between(158, 186)));
    pushFact(person, "Цвет глаз", pick(eyeColors));
    pushFact(person, "Цвет волос", pick(hairColors));
    pushFact(person, "Группа крови", pick(bloodTypes));
  }

  if (person.generation >= 4 && chance(0.6)) {
    pushFact(person, "Национальность", pick(NATIONALITIES));
  }

  if (person.generation >= 5 && chance(0.5)) {
    pushFact(person, "Номер телефона", `+7 9${between(10, 89)} ${between(100, 999)} ${pad(between(10, 99))}-${pad(between(10, 99))}`);
    pushFact(person, "Email", `${person.firstName.toLowerCase()}@example.test`);
  }
}

// ─── биографии ──────────────────────────────────────────────────────────────

const BIOS = {
  short: (person) => {
    const raw = rawById.get(person.id);
    return `${person.firstName} ${person.patronymic} ${person.lastName} — ${dmy(raw.birth)} года рождения, ${PLACES[NAMES.get(person.id).place].label}.\n`;
  },

  medium: (person) => {
    const raw = rawById.get(person.id);
    const partners = person.spouse
      .map((id) => `${byId.get(id).firstName} ${byId.get(id).lastName}`)
      .join(" и ");
    return `# ${person.firstName} ${person.patronymic} ${person.lastName}

Родил${person.gender === "female" ? "ась" : "ся"} ${dmy(raw.birth)} в ${PLACES[NAMES.get(person.id).place].label}.

## Семья

${partners ? `Супруг(а): ${partners}.` : "Супруг(а) в базе не указана."} Детей заведено: ${person.children.length}.

## Воспоминания

Истории передавались устно, часть записана со слов родственников. Даты стоит сверить с метрическими книгами.
`;
  },

  long: (person) => {
    const raw = rawById.get(person.id);
    const kids = person.children.map((id) => byId.get(id)).filter(Boolean);
    const born = person.gender === "female" ? "родилась" : "родился";
    return `# ${person.firstName} ${person.patronymic} ${person.lastName}

> «Главное — чтобы дети знали, откуда они.» — фразу помнят несколько поколений.

## Детство и образование

${person.firstName} ${born} ${dmy(raw.birth)} в ${PLACES[NAMES.get(person.id).place].label}. Школьные годы прошли в послевоенное время, затем — училище и распределение.

## Работа

Более тридцати лет на производстве: от ученика до наладчика оборудования. Курировал практику студентов, вел кружок рационализаторов.

## Семья

${
      kids.length
        ? kids
            .map(
              (child) =>
                `- ${child.firstName} ${child.patronymic} — ${child.birthday}${
                  child.spouse.length
                    ? `, в браке с ${child.spouse.map((id) => byId.get(id).firstName).join(" и ")}`
                    : ""
                }`,
            )
            .join("\n")
        : "- Детей в базе пока не заведено."
    }

## Источники

1. Метрическая книга, фонд 45, опись 2, дело 118.
2. Домашний архив: ${PHOTO_PLAN.some(([id]) => id === person.id) ? "оцифрованные фотографии, см. фотоальбом" : "фотографии не сохранились"}.
3. Запись со слов ${person.gender === "female" ? "сестры" : "брата"} (2019 год).

## Что проверить

- [ ] Дату переезда в ${PLACES[pick(PLACE_KEYS)].label}.
- [ ] Отчество деда: в одних документах ${pick(MALE_FIRST)}ович, в других — ${pick(MALE_FIRST)}ович.
- [ ] Фотографии 1970-х: подписи на обороте читаются частично.
`;
  },
};

function bioFor(person) {
  const raw = rawById.get(person.id);
  if (!raw.bio) return null;
  return BIOS[raw.bio](person);
}

// ─── изображения ─────────────────────────────────────────────────────────────

function hueFor(id) {
  return (id * 47) % 360;
}

function avatarSvg(person) {
  const hue = hueFor(person.id);
  const size = 400;
  const headR = 60;
  const headCy = 156;
  const shoulder = silhouette(200, headCy, headR, size);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="hsl(${hue}, 55%, 62%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 30) % 360}, 62%, 24%)"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g fill="#ffffff" fill-opacity="0.9">
    <circle cx="200" cy="${headCy}" r="${headR}"/>
    <ellipse cx="200" cy="${shoulder.cy}" rx="${shoulder.rx}" ry="${shoulder.ry}"/>
  </g>
  <text x="26" y="382" font-family="Helvetica Neue, Arial, sans-serif" font-size="44"
        font-weight="700" fill="#0a2230" fill-opacity="0.32">${initials(person)}</text>
</svg>`;
}

// Плечи как эллипс, нижняя часть которого уходит за кадр: получается
// привычный силуэт «портрет», а не снеговик из двух окружностей.
function silhouette(cx, headCy, headR, height) {
  const shoulderTop = headCy + headR * 0.95;
  const ry = (height - shoulderTop) * 1.7;
  return { cy: Math.round(shoulderTop + ry), rx: Math.round(headR * 2.05), ry: Math.round(ry) };
}

function photoSvg(person, width, height, year, variant) {
  const hue = hueFor(person.id + variant * 13);
  const cx = Math.round(width / 2);
  const headR = Math.round(Math.min(width, height) * 0.16);
  const cy = Math.round(height * 0.4);
  const shoulder = silhouette(cx, cy, headR, height);
  const landscape = width > height;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0" stop-color="hsl(${hue}, 48%, 72%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 45) % 360}, 55%, 30%)"/>
    </linearGradient>
    <radialGradient id="light" cx="0.7" cy="0.15" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#sky)"/>
  <rect width="${width}" height="${height}" fill="url(#light)"/>
  ${
    landscape
      ? `<path d="M0 ${Math.round(height * 0.78)} L${Math.round(width * 0.28)} ${Math.round(height * 0.62)} L${Math.round(width * 0.58)} ${Math.round(height * 0.8)} L${Math.round(width * 0.82)} ${Math.round(height * 0.6)} L${width} ${Math.round(height * 0.76)} V${height} H0 Z" fill="#0a2230" fill-opacity="0.28"/>`
      : ""
  }
  <circle cx="${cx}" cy="${cy}" r="${headR}" fill="#ffffff" fill-opacity="0.9"/>
  <ellipse cx="${cx}" cy="${shoulder.cy}" rx="${shoulder.rx}" ry="${shoulder.ry}" fill="#ffffff" fill-opacity="0.9"/>
  <rect x="0" y="${height - 54}" width="${width}" height="54" fill="#0a2230" fill-opacity="0.45"/>
  <text x="18" y="${height - 20}" font-family="Helvetica Neue, Arial, sans-serif" font-size="24"
        fill="#ffffff" fill-opacity="0.92">${person.firstName} ${person.lastName} · ${year}</text>
</svg>`;
}

// ─── запись библиотеки ──────────────────────────────────────────────────────

const root = opts.out;
const peopleRoot = join(root, "people");

if (opts.fresh) {
  if (!existsSync(join(root, MARKER))) {
    throw new Error(
      `--fresh: в ${root} нет маркера ${MARKER} — не хочу удалять чужую папку`,
    );
  }
  rmSync(root, { recursive: true, force: true });
}

mkdirSync(peopleRoot, { recursive: true });

let photoCount = 0;
let realPhotoCount = 0;
let importedPhotoCount = 0;
let realAvatarCount = 0;

async function writePhotoFiles(owner, photo, source) {
  const dir = join(peopleRoot, String(owner.id), "photos");
  mkdirSync(join(dir, "original"), { recursive: true });
  mkdirSync(join(dir, "webp"), { recursive: true });
  mkdirSync(join(dir, "thumbs"), { recursive: true });

  const base = photo.filename.replace(/\.[a-z]+$/i, "");
  const original = join(dir, "original", photo.filename);
  const buffer = await sharp(source)
    .resize(photo.imageSize.width, photo.imageSize.height, { fit: "cover" })
    .jpeg({ quality: 82 })
    .toBuffer();

  writeFileSync(original, buffer);
  await sharp(buffer)
    .webp({ quality: 80 })
    .toFile(join(dir, "webp", `${base}.webp`));
  // Превью — таким же размером, как делает photo:saveWithFilename.
  await sharp(buffer)
    .resize(300, 300, { fit: "inside" })
    .webp({ quality: 50 })
    .toFile(join(dir, "thumbs", `${base}.webp`));
}

async function buildPhotos() {
  const perOwner = new Map();

  for (const [ownerId, count, alsoIn] of PHOTO_PLAN) {
    const owner = byId.get(ownerId);
    const raw = rawById.get(ownerId);
    const ownerPlace = NAMES.get(ownerId).place;
    const ownerPlaceSlug = PLACES[ownerPlace].slug;
    const list = [];

    for (let index = 0; index < count; index += 1) {
      const real = REAL_PHOTOS.get(`${ownerId}:${index}`);
      const asset = real ? realAsset(real.asset) : null;
      // У каждого кадра свой поток случайных чисел: удаление или добавление
      // снимка у одного человека больше не сдвигает даты и форму у всех
      // остальных и не трогает биографии со справочником.
      const prng = makeRng(opts.seed + ownerId * 131 + index);
      const pickShot = (list) => list[Math.floor(prng() * list.length)];
      const betweenShot = (min, max) =>
        min + Math.floor(prng() * (max - min + 1));
      const shape = asset
        ? real.shape
        : pickShot([
            { w: 900, h: 1200, ratio: "3/4" },
            { w: 1200, h: 800, ratio: "3/2" },
            { w: 1000, h: 1000, ratio: "1/1" },
          ]);
      const year = asset
        ? Number(real.datePhoto.slice(0, 4))
        : raw.birth[0] + betweenShot(owner.generation <= 2 ? 20 : 5, owner.generation <= 2 ? 45 : 40);
      const shotDate = `${year}-${pad(betweenShot(1, 12))}-${pad(betweenShot(1, 28))}`;
      const randomTag = pickShot([
        "#семья",
        "#архив",
        "#портрет",
        "#дерево",
        "#лето",
      ]);
      const hasCoords = prng() < 0.5;
      const filename = `p${ownerId}_img${index + 1}.jpg`;
      const caption =
        real && asset
          ? { title: real.title, description: real.description }
          : {
              title: index === 0 ? "Семейный портрет" : "",
              description:
                index === 0 ? "Отпечаток из домашнего архива, оцифрован." : "",
            };
      const photo = {
        id: 1750000000000 + ownerId * 100 + index,
        filename,
        title: caption.title,
        description: caption.description,
        people: asset && real.people ? real.people : [ownerId, ...alsoIn.filter((id) => id !== ownerId)],
        owner: ownerId,
        date: iso([2026, 1, 5 + index]),
        aspectRatio: shape.ratio,
        datePhoto: asset ? real.datePhoto : shotDate,
        imageSize: { width: shape.w, height: shape.h },
        locationName: PLACES[ownerPlace].label,
        hashtags: asset
          ? real.hashtags ?? [real.tag ?? randomTag, `#${ownerPlaceSlug}`]
          : [randomTag, `#${ownerPlaceSlug}`],
        externalPeople: [],
        faces: [],
        faceScanNoFaces: false,
        ...(hasCoords ? { lat: PLACES[ownerPlace].lat, lng: PLACES[ownerPlace].lng } : {}),
      };

      await writePhotoFiles(
        owner,
        photo,
        asset ? asset.buffer : Buffer.from(photoSvg(owner, shape.w, shape.h, year, index)),
      );
      list.push(photo);
      photoCount += 1;
      if (asset) realPhotoCount += 1;
    }

    perOwner.set(ownerId, list);
  }

  return perOwner;
}

const perOwner = await buildPhotos();

// Импортированные кадры: оригинал копируется байт в байт, webp и превью
// собираются так же, как это делает photo:saveWithFilename.
async function buildImportedPhotos() {
  for (const [index, entry] of IMPORTED_PHOTOS.entries()) {
    const asset = realAsset(entry.asset);
    if (!asset) continue;

    const dir = join(peopleRoot, String(entry.owner), "photos");
    mkdirSync(join(dir, "original"), { recursive: true });
    mkdirSync(join(dir, "webp"), { recursive: true });
    mkdirSync(join(dir, "thumbs"), { recursive: true });

    const base = asset.filename.replace(/\.[a-z]+$/i, "");
    const size = await sharp(asset.buffer).metadata();
    writeFileSync(join(dir, "original", asset.filename), asset.buffer);
    await sharp(asset.buffer)
      .rotate()
      .webp({ quality: 80 })
      .toFile(join(dir, "webp", `${base}.webp`));
    await sharp(asset.buffer)
      .rotate()
      .resize(300, 300, { fit: "inside" })
      .webp({ quality: 50 })
      .toFile(join(dir, "thumbs", `${base}.webp`));

    const list = perOwner.get(entry.owner) ?? [];
    list.push({
      title: "",
      description: "",
      hashtags: [],
      people: [entry.owner],
      externalPeople: [],
      owner: entry.owner,
      date: IMPORT_DATE,
      datePhoto: entry.datePhoto,
      aspectRatio: entry.ratio,
      lat: null,
      lng: null,
      faces: [],
      imageSize: { width: size.width, height: size.height },
      id: 1750000000000 + entry.owner * 100 + 10 + index,
      filename: asset.filename,
      locationName: null,
    });
    perOwner.set(entry.owner, list);
    photoCount += 1;
    importedPhotoCount += 1;
  }
}

await buildImportedPhotos();

for (const person of byId.values()) {
  const dir = join(peopleRoot, String(person.id));
  mkdirSync(dir, { recursive: true });

  const realAvatar = realAsset(`avatar-${person.id}`);
  if (realAvatar) realAvatarCount += 1;

  const avatar = await sharp(
    realAvatar ? realAvatar.buffer : Buffer.from(avatarSvg(person)),
  )
    .resize(400, 400, { fit: "cover" })
    .jpeg({ quality: 84 })
    .toBuffer();
  writeFileSync(join(dir, "avatar.jpg"), avatar);

  const bio = bioFor(person);
  if (bio) writeFileSync(join(dir, "bio.md"), bio);

  writeFileSync(
    join(dir, "photos.json"),
    JSON.stringify(perOwner.get(person.id) ?? [], null, 2),
  );
}

// Справочник внешних сущностей: файл + аватары.
const externalRoot = join(root, "external");
mkdirSync(externalRoot, { recursive: true });

const now = "2026-10-30T18:00:00.000Z";
const externalEntities = [];

for (const [index, entity] of EXTERNAL.entries()) {
  const dir = join(externalRoot, entity.id);
  mkdirSync(dir, { recursive: true });

  const isPet = entity.type === "pet";
  const first = isPet
    ? pick(PET_NAMES)
    : pick(entity.gender === "female" ? FEMALE_FIRST : MALE_FIRST);
  const surname = pick(SURNAME_POOL);
  const displayName = isPet
    ? first
    : `${first} ${entity.gender === "female" ? femaleSurname(surname) : surname}`;
  const notes = isPet
    ? `${entity.species} семьи ${familyGenitive(LINE_SURNAME)}, годы рядом: ${entity.relations[0].dates}.`
    : entity.role;
  const homePlace = PLACES[pick(PLACE_KEYS)];

  const contact = {
    ...(entity.phone
      ? { phone: `+7 9${between(10, 89)} ${between(100, 999)} ${pad(between(10, 99))}-${pad(between(10, 99))}` }
      : {}),
    ...(isPet || !entity.address ? {} : { address: `${homePlace.label}, ${pick(STREETS)}, ${between(1, 60)}` }),
    ...(isPet ? {} : { email: `${first.toLowerCase()}@example.test` }),
  };
  const hue = hueFor(index * 977 + 13);
  const shoulder = silhouette(200, 156, 58, 400);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
    <stop offset="0" stop-color="hsl(${hue}, 60%, 66%)"/>
    <stop offset="1" stop-color="hsl(${(hue + 40) % 360}, 55%, 26%)"/>
  </linearGradient></defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <g fill="#ffffff" fill-opacity="0.9">
    <circle cx="200" cy="156" r="58"/>
    <ellipse cx="200" cy="${shoulder.cy}" rx="${shoulder.rx}" ry="${shoulder.ry}"/>
  </g>
</svg>`;

  const realAvatar = realAsset(`avatar-${entity.id}`);
  if (realAvatar) realAvatarCount += 1;

  writeFileSync(
    join(dir, "avatar.jpg"),
    await sharp(realAvatar ? realAvatar.buffer : Buffer.from(svg))
      .resize(400, 400, { fit: "cover" })
      .jpeg({ quality: 84 })
      .toBuffer(),
  );

  externalEntities.push({
    id: entity.id,
    type: entity.type,
    name: displayName,
    notes,
    ...contact,
    relations: (entity.relations || []).map((rel, relIndex) => ({
      id: `R${1760000000000 + index * 10 + relIndex}`,
      mainPersonId: rel.mainPersonId,
      relationType: rel.relationType,
      dates: rel.dates ?? "",
      notes: "",
    })),
    createdAt: now,
    editedAt: now,
  });
}

writeFileSync(
  join(root, "genealogy-data.json"),
  JSON.stringify({ schemaVersion: 1, people: [...byId.values()] }, null, 2),
);

writeFileSync(
  join(root, "tags.json"),
  JSON.stringify(
    {
      tags: TAGS,
      personTags: Object.fromEntries(
        [...byId.keys()].map((id) => [String(id), PERSON_TAGS[id] ?? []]),
      ),
    },
    null,
    2,
  ),
);

writeFileSync(
  join(root, "external-entities.json"),
  JSON.stringify(externalEntities, null, 2),
);

writeFileSync(
  join(root, MARKER),
  `Мок-библиотека Genealogy для тестов. Это вымышленные люди и вымышленные места.\n` +
    `Имена, фамилии, отчества, топонимы, учреждения и контакты случайны и не\n` +
    `соответствуют реальной семье; координаты лежат севернее и восточнее Украины.\n` +
    `Часть аватаров и фотографий фотореалистичны — это сгенерированные лица\n` +
    `вымышленных людей (scripts/mock-assets), они нужны для скриншотов.\n\n` +
    `Сгенерировано scripts/make-mock-library.mjs, seed=${opts.seed}.\n` +
    `Перегенерировать: npm run mock:library -- --out "${root}" --seed ${opts.seed} --fresh\n` +
    `Другие имена и места — другое зерно, например --seed 7.\n\n` +
    `Подключить в приложении: Настройки → Места хранения данных → добавить папку и сделать активной.\n` +
    `Отметку «Это я» задайте в Настройки → Это я: удобнее всего ID ${HOME_ID} ` +
    `(${byId.get(HOME_ID).firstName} ${byId.get(HOME_ID).lastName} ${byId.get(HOME_ID).patronymic}).\n`,
);

console.log(
  `Готово: ${root}\n` +
    `  людей: ${byId.size}, поколений: ${new Set([...byId.values()].map((p) => p.generation)).size}\n` +
    `  событий: ${eventSeq}, фактов: ${[...byId.values()].reduce((sum, p) => sum + p.facts.length, 0)}\n` +
    `  фотографий: ${photoCount} (фотореалистичных ${realPhotoCount},` +
    ` импортированных ${importedPhotoCount}),` +
    ` аватаров: ${byId.size} (фотореалистичных ${realAvatarCount}),` +
    ` внешних сущностей: ${externalEntities.length}`,
);
