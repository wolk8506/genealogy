import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      enabled: false,
      include: [
        "src/main/handlers/importArchiveUtils.cjs",
        "src/main/handlers/importZipApply.cjs",
        "src/main/handlers/dataStore.cjs",
        "src/main/handlers/exportArchiveManifest.cjs",
        "src/main/handlers/archiveUtils.cjs",
        "src/main/handlers/jsonStore.cjs",
      ],
      reporter: ["text", "text-summary"],
      thresholds: {
        lines: 55,
        functions: 50,
        branches: 45,
        statements: 55,
      },
    },
  },
});
