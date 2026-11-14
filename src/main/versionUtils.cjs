// Обновлением считается только более новая версия: лента релизов может отставать
// от установленной сборки, и тогда предложение «обновиться» понизило бы приложение.
function isNewerVersion(remote, current) {
  const parts = (v) => String(v).split(".").map((p) => parseInt(p, 10) || 0);
  const a = parts(remote);
  const b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

module.exports = { isNewerVersion };
