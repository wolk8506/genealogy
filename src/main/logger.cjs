// logger.cjs — единый логгер main-процесса с уровнями.
// Уровень через env: GENEALOGY_LOG_LEVEL=error|warn|info|debug (по умолчанию info).
// Формат: [время] [уровень] [scope] сообщение...
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function currentLevel() {
  const raw = String(
    process.env.GENEALOGY_LOG_LEVEL || "info",
  ).toLowerCase();
  return LEVELS[raw] ?? LEVELS.info;
}

function createLogger(scope) {
  const prefix = () =>
    `[${new Date().toISOString()}]${scope ? ` [${scope}]` : ""}`;

  const emit = (level, args) => {
    if ((LEVELS[level] ?? LEVELS.info) > currentLevel()) return;
    const line = `${prefix()} [${level}]`;
    if (level === "error") console.error(line, ...args);
    else if (level === "warn") console.warn(line, ...args);
    else console.log(line, ...args);
  };

  return {
    error: (...args) => emit("error", args),
    warn: (...args) => emit("warn", args),
    info: (...args) => emit("info", args),
    debug: (...args) => emit("debug", args),
  };
}

module.exports = { createLogger };
