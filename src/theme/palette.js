const ACCENTS_LIGHT = {
  red: "#FF383C",
  orange: "#FF8D28",
  yellow: "#FFCC00",
  green: "#34C759",
  mint: "#00C8B3",
  teal: "#00C3D0",
  cyan: "#00C0E8",
  blue: "#0088FF",
  indigo: "#6155F5",
  purple: "#CB30E0",
  pink: "#FF2D55",
  brown: "#AC7F5E",
  gray: "#8E8E93",
};

const ACCENTS_DARK = {
  red: "#FF4245",
  orange: "#FF9230",
  yellow: "#FFD600",
  green: "#30D158",
  mint: "#00DAC3",
  teal: "#00D2E0",
  cyan: "#3CD3FE",
  blue: "#0091FF",
  indigo: "#6D7CFF",
  purple: "#DB34F2",
  pink: "#FF375F",
  brown: "#B78A66",
  gray: "#98989F",
};

export const getAccents = (mode) =>
  mode === "dark" ? ACCENTS_DARK : ACCENTS_LIGHT;

const mix = (hex, target, weight) => {
  const parse = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(target);
  const channel = (a, b) =>
    Math.round(a + (b - a) * weight)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r1, r2)}${channel(g1, g2)}${channel(b1, b2)}`;
};

const semantic = (main) => ({
  main,
  light: mix(main, "#FFFFFF", 0.2),
  dark: mix(main, "#000000", 0.2),
});

const GLASS_LIGHT = {
  surface: "rgba(249,249,249,0.8)",
  strong: "rgba(255,255,255,0.92)",
  hover: "#FFFFFF",
  highlight: "rgba(255,255,255,0.7)",
  border: "rgba(0,0,0,0.08)",
};

const GLASS_DARK = {
  surface: "rgba(26,26,26,0.5)",
  strong: "rgba(26,26,26,0.72)",
  hover: "rgba(255,255,255,0.12)",
  highlight: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.1)",
};

export const getPalette = (mode) => {
  const dark = mode === "dark";
  const accents = getAccents(mode);

  return {
    mode,
    primary: semantic(accents.blue),
    secondary: semantic(accents.indigo),
    error: semantic(accents.red),
    warning: semantic(accents.orange),
    success: semantic(accents.green),
    info: semantic(accents.cyan),
    background: {
      default: dark ? "#000000" : "#FFFFFF",
      paper: dark ? "#1A1A1A" : "#F9F9F9",
    },
    text: {
      primary: dark ? "#FFFFFF" : "#111111",
      secondary: dark ? "#999999" : "#404040",
      disabled: dark ? "#5A5A5A" : "#8A8A8A",
    },
    divider: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    glass: dark ? GLASS_DARK : GLASS_LIGHT,
    accents,
  };
};
