import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@mui")) {
              return "vendor_mui";
            }
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("zustand")
            ) {
              return "vendor_core"; // Ядро реакта и стор отдельно
            }
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 4000, // Увеличиваем лимит до 4МБ
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
