# Tests

**Runner:** [Vitest](https://vitest.dev/) in Node (no Electron UI).

```bash
npm test          # unit: без mockLibraryImport (быстро, PR/сборки)
npm run test:full # всё, включая mock:library (~2–3 с локально)
npm run test:watch
npm run test:coverage   # пороги v8 по import/dataStore/jsonStore (см. vitest.config.mjs)
```

**Location:** `tests/**/*.test.mjs` — Vitest ESM; main code loaded via `createRequire` (`.cjs` handlers).

**Current focus:** logic that must not regress across releases:

| File | Module under test |
|------|-------------------|
| `tests/main/versionUtils.test.mjs` | `isNewerVersion` (auto-updater) |
| `tests/main/dataStore.test.mjs` | `parseGenealogyDataFile` / legacy `genealogy-data.json` |
| `tests/main/formatBytes.test.mjs` | `formatBytes` (диалоги места на диске / импорт) |
| `tests/main/importArchiveUtils.test.mjs` | разбор имён записей ZIP, meta, теги |
| `tests/main/importArchiveInspect.test.mjs` | `inspectArchive` на минимальном ZIP в `os.tmpdir()` |
| `tests/main/importZipApply.test.mjs` | импорт, SQLite, merge тегов/журнала/external, решения конфликтов |
| `tests/main/jsonStore.test.mjs` | атомарная запись JSON/текста, очередь `withWriteLock` |
| `tests/main/mockLibraryImport.test.mjs` | только в `test:full` — mock:library → ZIP → импорт |
| `tests/main/importRoundTrip.test.mjs` | только в `test:full` — mock → ZIP → импорт, сверка people/photos.json |
| `tests/main/faceDb.test.mjs` | save/load reference, `getFaceDbStats` |
| `tests/main/archiveUtils.test.mjs` | пути и обход файлов для `archive:create` |
| `tests/main/exportArchiveManifest.test.mjs` | manifest + genealogy-data для экспорта |
| `tests/renderer/buildFamilyViews.test.mjs` | семьи из spouses + father/mother (чистый JS) |
| `tests/renderer/formatDate.test.mjs` | `formatNotificationDate` (fake timers) |

## Импорт и библиотека данных

**Нельзя** в автотестах трогать рабочую папку `~/Documents/Genealogy` (или активный корень из `storage.json`).

- **Предпросмотр ZIP** (`importArchiveInspect`) — только чтение переданного файла; тесты собирают архив в `tmpdir` через `tests/helpers/buildMinimalImportZip.mjs`.
- **Полный импорт без IPC** — `importZipFromPath` в `importZipApply.cjs`; в тестах корень задаётся **`GENEALOGY_TEST_ROOT`** (см. `config.cjs` → `getBaseDir`) и обёртка `tests/helpers/testLibraryRoot.mjs` (`withTestLibrary`).
- **Большая моковая библиотека** (ручные сценарии): `npm run mock:library -- --out <tmpdir>/genealogy-mock --fresh --seed 1`.

Реальные пользовательские архивы в CI не кладём.

**Not covered yet:** IPC-обёртка `import:zip` (тонкая), экспорт архива.

**CI:**
- `test.yml` — `npm test` (unit) на Ubuntu и **Windows** (`push` / `pull_request`)
- `test-full.yml` — `npm run test:full` по воскресеньям 06:00 UTC и вручную
- `build-*.yml` — `npm test` (unit) после `npm ci`

**Хелперы:** `tests/helpers/buildZipFromLibraryRoot.mjs`, `runMockLibrary.mjs`, `faceSqliteForTests.cjs`.

**Renderer:** тесты в `tests/renderer/` — только функции без DOM/Electron; jsdom не подключали.

**E2E (Playwright + Electron):** пока **не** делаем — дорого в поддержке; ручной сценарий импорта покрыт unit + mock round-trip.

**Coverage:** `@vitest/coverage-v8`, `npm run test:coverage`; в CI — шаг в `test-full.yml` (пороги ~55% lines по выбранным handler-модулям).
