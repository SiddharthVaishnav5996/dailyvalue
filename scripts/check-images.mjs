/*
 * DailyValue image reference checker
 * ---------------------------------------------------------------------------
 * Run:  npm run check-images
 * Also runs automatically before every `npm run build` (see package.json).
 *
 * It answers one question: "does every image the code points at actually exist
 * on disk?"
 *
 * Why this exists
 * ---------------
 * A card's photo is chosen by a STRING, e.g. "/stores/.../Salted Butter.avif".
 * Nothing in the normal toolchain checks that string. TypeScript checks types,
 * not whether a path is a real file. So when a photo is re-saved under a
 * slightly different name and the string is not updated, the reference "drifts"
 * - the code now points at a file that is no longer there.
 *
 * At runtime a missing local image makes Next's image optimizer answer 400, the
 * <img> breaks, and the card shows its alt text (grey words) instead of a photo.
 * That is a shopper looking at a broken card. This script turns that runtime
 * surprise into a build-time failure: if any reference is missing it prints the
 * offenders and exits non-zero, which stops `next build` before anything ships.
 *
 * (This is the automated version of a one-off audit done by hand, which found
 * three drifted filenames in lib/catalog/curated.ts. See the AI Integration
 * Field Notes, Chapter 14.)
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");

/* ------------------------------------------------------------------ colours */
// Plain ANSI escape codes, same as check-keys.mjs. \x1b[31m is red, \x1b[0m resets.
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

/* ------------------------------------------------------------------- config */

// Folders that can mention an image path. We deliberately do NOT scan
// node_modules, .next, or public itself - only the project's own source.
const SCAN_DIRS = ["app", "components", "data", "lib"];

// File types that can hold a path string.
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"]);

// A quoted or backticked string whose contents start with "/" and end in an
// image extension. The leading "/" is what makes it a public-folder path in
// Next.js: src="/a/b.png" is served from public/a/b.png.
//   Remote photos (https://images.pexels.com/...) start with "http", not "/",
//   so they never match - correct, because they are not files on our disk.
const PATH_RE = /["'`](\/[^"'`]+?\.(?:png|jpe?g|avif|webp|svg|gif))["'`]/gi;

/* -------------------------------------------------------------- the walker */

/** Every file under `dir` (recursively) whose extension we care about. */
function sourceFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue; // folder does not exist - fine, skip it
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else {
        const dot = entry.name.lastIndexOf(".");
        const ext = dot === -1 ? "" : entry.name.slice(dot).toLowerCase();
        if (SCAN_EXTS.has(ext)) out.push(full);
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------- the scan */

function main() {
  const refs = []; // { file, line, path } - every reference found
  const dynamic = []; // paths built at runtime, which we cannot check here

  for (const relDir of SCAN_DIRS) {
    for (const file of sourceFiles(join(ROOT, relDir))) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        PATH_RE.lastIndex = 0;
        let m;
        while ((m = PATH_RE.exec(line))) {
          const raw = m[1];

          // A template literal like `/stores/${id}.png` cannot be checked here:
          // the real name is only known when the app runs. Note it, don't fail.
          if (raw.includes("${")) {
            dynamic.push({ file, line: i + 1, path: raw });
            continue;
          }

          // Drop any ?query or #hash - never part of the file name on disk.
          const clean = raw.split(/[?#]/)[0];
          refs.push({ file, line: i + 1, path: clean });
        }
      });
    }
  }

  // One path can be referenced from many places. Check each unique path once,
  // but remember the first place it appeared so a failure can point somewhere.
  const seen = new Map(); // path -> { file, line }
  for (const r of refs) if (!seen.has(r.path)) seen.set(r.path, r);

  const missing = [];
  for (const [p, where] of seen) {
    const onDisk = join(PUBLIC_DIR, p.replace(/^\/+/, ""));
    if (!existsSync(onDisk)) missing.push({ ...where, path: p });
  }

  /* ------------------------------------------------------------------ report */

  const rel = (f) => relative(ROOT, f).replace(/\\/g, "/");

  console.log("");
  console.log(bold("  DailyValue — image reference check"));
  console.log(dim("  ─────────────────────────────────────────────────────────"));
  console.log(
    `  scanned ${bold(String(refs.length))} references ` +
      `(${seen.size} unique) across ${SCAN_DIRS.map((d) => d + "/").join(", ")}`,
  );
  if (dynamic.length) {
    console.log(
      dim(`  ${dynamic.length} built-at-runtime path(s) skipped — cannot be checked here`),
    );
  }
  console.log("");

  if (missing.length === 0) {
    console.log(`  ${green("All image references resolve to a real file.")}`);
    console.log("");
    return;
  }

  console.log(`  ${red(`${missing.length} reference(s) point at a file that is not there:`)}`);
  console.log("");
  for (const m of missing.sort((a, b) => a.path.localeCompare(b.path))) {
    console.log(`    ${red("missing")}  ${m.path}`);
    console.log(dim(`             first referenced in ${rel(m.file)}:${m.line}`));
  }
  console.log("");
  console.log(dim("  Fix the path to match the real file name, or add the file to public/."));
  console.log(red("  Build stopped: a broken image would ship otherwise."));
  console.log("");
  process.exitCode = 1; // <- non-zero exit is what fails `npm run build` and CI
}

try {
  main();
} catch (err) {
  console.error(red(`\n  Image check crashed: ${err.message}\n`));
  process.exitCode = 1;
}
