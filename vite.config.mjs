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
