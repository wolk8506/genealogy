# npm audit (snapshot)

**Date:** 2026-11-14  
**Command:** `npm audit` in repo root (after v1.14 dependency bumps).  
**Totals:** 12 issues — **0 critical, 0 high**, 7 moderate, 5 low.

Do **not** run `npm audit fix --force` without a deliberate plan: npm proposes **semver-major downgrades** that conflict with current code (archiver 8, electron-builder 26).

## Direct dependencies involved

| Package | Installed (package.json) | Severity | Chain | npm “fix” | Risk if applied |
|---------|---------------------------|----------|-------|-----------|-----------------|
| `electron-builder` | `^26.18.0` | moderate | `minimatch` → `@electron/universal` → `app-builder-lib` | downgrade to **25.1.0** | Breaks current builder stack; **dev/packaging only**, not runtime in installed app |
| `archiver` | `^8.0.0` | moderate | `readdir-glob` → `minimatch` (GHSA-g3hv-75wg-m249) | downgrade to **7.0.1** | Reverts v1.14 **ZipArchive** path in backups; DoS via crafted paths — only if attacker controls archive **inputs** |
| `@milkdown/react` | `^7.23.0` | low | `remark-math` → `katex` (prototype pollution, GHSA-238p-pmpm-9mq7) | suggests `@milkdown/react@7.6.1` (stale advice) | Bio editor only; trust / untrusted markdown context |

## Runtime vs dev

- **Packaging:** `electron-builder` / `minimatch` — used at `npm run dist:*`, not in the shipped renderer/main logic for daily use.
- **Backups:** `archiver` — main process when user exports ZIP; mitigate by not importing untrusted archives as library root.
- **Bio:** `katex` via milkdown — relevant if biography renders untrusted math; typical use is local family data.

## Recommended posture (no breaking changes)

1. **Leave as-is for v1.14** — highs/criticals already cleared per CHANGELOG; remainder tracked here.
2. **Re-audit** before next release (`npm audit` + this file).
3. **electron-builder / minimatch:** watch upstream `electron-builder` 26.x for patched `app-builder-lib`; bump minor when release notes mention minimatch.
4. **archiver:** watch `archiver` 8.x or `readdir-glob` for minimatch ≥ fixed; avoid downgrade to 7 without re-testing `exportToZip` / import.
5. **milkdown / katex:** optional follow-up — override/resolution on `katex` ≥ 0.18.2 if milkdown tree allows, or isolate math in bio; test editor after any bump.

## Environment noise

`npm warn Unknown env config "devdir"` — local npm config, not a project vulnerability.
