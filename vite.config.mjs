import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
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

export default defineConfig({
  base: "./",
  plugins: [react(), copyFaceModelsPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Пути строго в нижнем регистре, без переменных — сборка идёт
        // на macOS/Windows/Linux, Linux чувствителен к регистру.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@vladmandic")) return "lib-face";
          if (id.includes("@milkdown")) return "lib-milkdown";
          if (id.includes("@mui/") || id.includes("@emotion/"))
            return "lib-mui";
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/") ||
            id.includes("node_modules/scheduler/")
          )
            return "lib-react";
          if (
            id.includes("@reduxjs") ||
            id.includes("node_modules/react-redux/") ||
            id.includes("node_modules/zustand/") ||
            id.includes("node_modules/notistack/")
          )
            return "lib-state";
          if (
            id.includes("/d3") ||
            id.includes("d3-") ||
            id.includes("react-d3-tree") ||
            id.includes("react-virtuoso") ||
            id.includes("react-window")
          )
            return "lib-viz";
          if (id.includes("node_modules/framer-motion/")) return "lib-motion";
          if (id.includes("node_modules/dayjs/")) return "lib-date";
          if (
            id.includes("node_modules/jszip/") ||
            id.includes("node_modules/file-saver/")
          )
            return "lib-zip";
          if (
            id.includes("node_modules/exifreader/") ||
            id.includes("node_modules/heic2any/") ||
            id.includes("node_modules/libheif-js/")
          )
            return "lib-exif";
          if (id.includes("node_modules/html-to-image/")) return "lib-img";
          return "vendor";
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
      plugins: [NodeGlobalsPolyfillPlugin({ buffer: true })],
    },
  },
});
