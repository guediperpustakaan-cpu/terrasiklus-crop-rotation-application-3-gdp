/**
 * Membuat paket source code TerraSiklus (public/terrasiklus-source.zip).
 *
 * Dipakai oleh script `prebuild` dan `predev` supaya tombol unduh source code
 * selalu tersedia di aplikasi, baik saat development maupun setelah deploy.
 *
 * Catatan keamanan: berkas rahasia (`.env` dan sejenisnya) tidak pernah ikut
 * dikemas.
 */

import { createWriteStream } from "node:fs";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const outputDir = path.join(rootDir, "public");
const outputFile = path.join(outputDir, "terrasiklus-source.zip");
const archiveRoot = "terrasiklus-source";

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".github",
  ".vercel",
  ".turbo",
  "out",
  "coverage",
  ".cache",
]);

const EXCLUDED_FILES = new Set([
  ".DS_Store",
  "Thumbs.db",
  "npm-debug.log",
  "yarn-error.log",
  "terrasiklus-source.zip",
]);

/** Berkas `.env` dan variannya tidak boleh masuk paket. */
function isSecretFile(name) {
  if (name === ".env.example") return false;
  return name === ".env" || name.startsWith(".env.");
}

function isExcludedFile(name) {
  return EXCLUDED_FILES.has(name) || isSecretFile(name) || name.endsWith(".tsbuildinfo");
}

async function collect(dir, relativeDir = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    const relative = relativeDir ? path.join(relativeDir, entry.name) : entry.name;

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      files.push(...(await collect(absolute, relative)));
      continue;
    }

    if (!entry.isFile()) continue;
    if (isExcludedFile(entry.name)) continue;

    files.push({ absolute, relative });
  }

  return files;
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const files = await collect(rootDir);
  if (files.length === 0) throw new Error("Tidak ada berkas sumber yang dikemas.");

  await new Promise((resolve, reject) => {
    const output = createWriteStream(outputFile);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("warning", (error) => {
      if (error.code === "ENOENT") return;
      reject(error);
    });
    archive.on("error", reject);

    archive.pipe(output);
    for (const file of files) {
      archive.file(file.absolute, { name: path.join(archiveRoot, file.relative) });
    }
    archive.finalize().catch(reject);
  });

  const { size } = await stat(outputFile);
  const sizeKb = (size / 1024).toFixed(1);
  console.log(`[source-zip] ${files.length} berkas -> public/terrasiklus-source.zip (${sizeKb} KB)`);
}

main().catch((error) => {
  console.warn(`[source-zip] Gagal membuat paket source code: ${error.message}`);
  console.warn("[source-zip] Tombol unduh source code tidak akan tersedia, build tetap dilanjutkan.");
});
