import { useEffect, useState } from "react";

export const isMac =
  typeof navigator !== "undefined" &&
  /Mac/i.test(navigator.platform || navigator.userAgent || "");

export const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

const COLORS = {
  light: {
    content: "#ffffff",
    sidebar: isMac ? "rgba(236,236,238,0.55)" : "#f2f2f4",
    text: "#1d1d1f",
    secondary: "rgba(60,60,67,0.62)",
    divider: "rgba(0,0,0,0.1)",
    selected: "rgba(0,0,0,0.09)",
    hover: "rgba(0,0,0,0.045)",
    control: "rgba(0,0,0,0.05)",
    controlHover: "rgba(0,0,0,0.09)",
    link: "#0066cc",
    mark: "rgba(255,204,0,0.45)",
  },
  dark: {
    content: "#1e1e1e",
    sidebar: isMac ? "rgba(36,36,38,0.45)" : "#2a2a2c",
    text: "#f5f5f7",
    secondary: "rgba(235,235,245,0.6)",
    divider: "rgba(255,255,255,0.1)",
    selected: "rgba(255,255,255,0.1)",
    hover: "rgba(255,255,255,0.05)",
    control: "rgba(255,255,255,0.08)",
    controlHover: "rgba(255,255,255,0.14)",
    link: "#4da3ff",
    mark: "rgba(255,214,0,0.35)",
  },
};

export const getHelpColors = (mode) => COLORS[mode === "dark" ? "dark" : "light"];

// Та же логика, что и в главном окне: авто — по системе, иначе ручной выбор.
// localStorage общий для окон приложения, поэтому смену темы ловим через storage.
export function useHelpThemeMode() {
  const [mode, setMode] = useState(() =>
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );

  useEffect(() => {
    let active = true;
    const isAuto = () => localStorage.getItem("theme-auto") !== "false";

    const apply = () => {
      if (isAuto()) {
        window.themeAPI
          ?.get?.()
          .then((systemMode) => active && systemMode && setMode(systemMode))
          .catch(() => {});
      } else {
        setMode(localStorage.getItem("theme-user") || "light");
      }
    };

    apply();
    window.themeAPI?.onChange?.((systemMode) => {
      if (active && isAuto()) setMode(systemMode);
    });

    const onStorage = (event) => {
      if (event.key === "theme-auto" || event.key === "theme-user") apply();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return mode;
}
