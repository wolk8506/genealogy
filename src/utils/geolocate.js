// Определение «моего местоположения».
// 1) Пробуем браузерную геолокацию (точная, но в Electron на macOS
//    часто недоступна без системного разрешения).
// 2) Падаем в приблизительную геолокацию по IP через main-процесс.

function browserGeolocation(timeout = 8000) {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) {
      resolve(null);
      return;
    }
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => done(null), timeout + 500);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        done([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        clearTimeout(timer);
        done(null);
      },
      { enableHighAccuracy: true, timeout, maximumAge: 60000 },
    );
  });
}

export async function getMyPosition() {
  const gps = await browserGeolocation();
  if (gps) return { pos: gps, name: "", source: "gps" };
  try {
    const ip = await window.geoAPI?.locate?.();
    if (ip && Number.isFinite(ip.lat) && Number.isFinite(ip.lng)) {
      return { pos: [ip.lat, ip.lng], name: ip.name || "", source: "ip" };
    }
  } catch {
    // ignore
  }
  return null;
}
