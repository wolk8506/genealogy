import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

function copyFaceModelsPlugin() {
  const src = resolve("node_modules/@vladmandic/face-api/model");
  const dest = resolve("public/face-models");

  const copy = () => {
    if (!existsSync(src)) return;
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
  };

  return {
    name: "copy-face-models",
    buildStart: copy,
    configureServer() {
      copy();
    },
  };
}

// Порядок групп важен: модуль попадает в первую совпавшую группу с наибольшим
// приоритетом, поэтому частные пакеты идут раньше catch-all vendor.
const chunkGroups = [
  { name: "lib-face", test: /node_modules\/@vladmandic\//, priority: 100 },
  { name: "lib-milkdown", test: /node_modules\/@milkdown\//, priority: 100 },
  {
    name: "lib-exif",
    test: /node_modules\/(exifreader|heic2any|libheif-js)\//,
    priority: 100,
  },
  {
    name: "lib-mui",
    test: /node_modules\/(@mui\/|@emotion\/)/,
    priority: 100,
  },
  {
    name: "lib-motion",
    test: /node_modules\/(framer-motion|motion|motion-dom)\//,
    priority: 100,
  },
  {
    name: "lib-react",
    test: /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//,
    priority: 90,
  },
  {
    name: "lib-state",
    test: /node_modules\/(@reduxjs|react-redux|zustand|notistack)\//,
    priority: 90,
  },
  { name: "lib-viz", test: /node_modules\/react-virtuoso\//, priority: 90 },
  { name: "lib-date", test: /node_modules\/dayjs\//, priority: 90 },
  { name: "vendor", test: /node_modules\//, priority: 10 },
];

export default defineConfig({
  base: "./",
  define: {
    global: "globalThis",
  },
  plugins: [react(), copyFaceModelsPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      input: {
        main: resolve("index.html"),
        help: resolve("help.html"),
      },
      output: {
        codeSplitting: {
          groups: chunkGroups,
        },
      },
    },
  },
});
