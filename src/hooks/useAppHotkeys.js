import { useEffect } from "react";

// Глобальный хоткей приложения (только внутри окна, без globalShortcut):
// Cmd/Ctrl+K — фокус видимого поиска.
export function focusAppSearch() {
  const inputs = Array.from(
    document.querySelectorAll("input[data-app-search]"),
  );
  const visible =
    inputs.find((el) => el.offsetParent !== null) || inputs[0] || null;
  if (visible) {
    visible.focus();
    try {
      visible.select();
    } catch {
      // input без select (не наш случай) — игнорируем
    }
  }
  return !!visible;
}

export default function useAppHotkeys() {
  useEffect(() => {
    const onKeyDown = (event) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod || event.repeat) return;
      const key = String(event.key || "").toLowerCase();

      if (key === "k") {
        event.preventDefault();
        focusAppSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
