import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {string} outDir — абсолютный путь вывода mock:library
 * @param {number} [seed]
 */
export function runMockLibrary(outDir, seed = 1) {
  return new Promise((resolve, reject) => {
    const script = join(repoRoot, "scripts/make-mock-library/make-mock-library.mjs");
    const child = spawn(
      process.execPath,
      [script, "--out", outDir, "--seed", String(seed)],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
    );

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mock:library exited ${code}\n${stderr}`));
    });
  });
}
