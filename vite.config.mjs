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
            // Объединяем MUI и Core React в один чанк,
            // так как они слишком тесно связаны внутренними зависимостями
            if (
              id.includes("@mui") ||
              id.includes("@emotion") ||
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("zustand") ||
              id.includes("scheduler") // Важная зависимость реакта
            ) {
              return "vendor_core";
            }

            // Всё остальное (библиотеки для работы с файлами, архивами и т.д.)
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
