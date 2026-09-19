/*
 * DailyValue API key checker
 * ---------------------------------------------------------------------------
 * Run:  npm run check-keys
 *
 * Answers one question for each key: "is this actually working?"
 *
 * It does NOT just check the key exists. A typo'd key exists too. This makes a
 * real (free, tiny) request to each provider and reports what came back, so a
 * pasted-wrong key is caught here rather than three days later when a search
 * mysteriously falls back to the offline engine.
 *
 * Your keys are never printed in full - only the first and last few characters,
 * so you can confirm WHICH key is loaded without the terminal becoming a place
 * a secret leaks from.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, "..", ".env.local");

/* ------------------------------------------------------------------ colours */
// Plain ANSI escape codes. \x1b[32m turns text green, \x1b[0m turns it back.
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

/* -------------------------------------------------------------- env loading */

/**
 * Read .env.local by hand.
 *
 * Next.js loads this file automatically, but a standalone script like this one
 * is not running inside Next, so nothing has loaded it for us. The format is
 * simple enough to parse in a few lines: NAME=value, one per line, # starts a
 * comment.
 */
async function loadEnv() {
  let raw;
  try {
    raw = await readFile(ENV_PATH, "utf8");
  } catch {
    return null; // file does not exist
  }

  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const name = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    // Strip surrounding quotes if someone added them. They are not needed and
    // become part of the key if left in, which is a confusing failure.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (name) env[name] = value;
  }
  return env;
}

/** Show enough of a key to identify it, never enough to use it. */
function mask(key) {
  if (key.length <= 12) return `${key.slice(0, 2)}…`;
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

/** fetch with a timeout, so a hanging network does not hang the script. */
async function fetchWithTimeout(url, options = {}, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------------------------------------------------------- checkers */

/**
 * Each checker makes the cheapest possible real request. Listing models or
 * fetching one photo costs nothing against a quota worth worrying about, and
 * proves the key is accepted.
 */

async function checkGemini(key) {
  const res = await fetchWithTimeout(
    "https://generativelanguage.googleapis.com/v1beta/models",
    // The header form works for both old and new key types. The older
    // ?key=... query-string form is being phased out.
    { headers: { "x-goog-api-key": key } },
  );

  if (res.ok) {
    const data = await res.json();
    const count = Array.isArray(data.models) ? data.models.length : 0;
    return { status: "ok", detail: `${count} models available` };
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    return { status: "failed", detail: "key rejected — check for a typo or extra space" };
  }
  if (res.status === 429) {
    return { status: "failed", detail: "key is valid but the daily quota is used up" };
  }
  return { status: "failed", detail: `unexpected response ${res.status}` };
}

async function checkGroq(key) {
  const res = await fetchWithTimeout("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (res.ok) {
    const data = await res.json();
    const count = Array.isArray(data.data) ? data.data.length : 0;
    return { status: "ok", detail: `${count} models available` };
  }
  if (res.status === 401) {
    return { status: "failed", detail: "key rejected — Groq keys start with gsk_" };
  }
  if (res.status === 429) {
    return { status: "failed", detail: "key is valid but rate limited right now" };
  }
  return { status: "failed", detail: `unexpected response ${res.status}` };
}

/**
 * Pexels is the awkward one, and it is worth knowing why.
 *
 * Its search endpoint answers 200 for a made-up key, for a typo'd key, and
 * even for no key at all - with identical rate-limit headers in every case.
 * Verified directly: a request with `Authorization: definitely_not_valid` and
 * a request with no Authorization header returned byte-identical limits.
 *
 * So there is NO way to tell a good Pexels key from a bad one by asking
 * Pexels. Claiming otherwise would be worse than useless: you would trust a
 * green tick that means nothing.
 *
 * Instead this reports two separate facts honestly - the service is reachable,
 * and the key looks the right shape - and says plainly that neither proves the
 * key is real.
 */
async function checkPexels(key) {
  const res = await fetchWithTimeout(
    "https://api.pexels.com/v1/search?query=lemon&per_page=1",
    // Pexels wants the key raw, with no "Bearer " prefix. Providers differ.
    { headers: { Authorization: key } },
  );

  if (!res.ok) {
    return { status: "failed", detail: `photo search returned ${res.status}` };
  }

  const data = await res.json().catch(() => null);
  const gotPhotos = Array.isArray(data?.photos) && data.photos.length > 0;

  if (!gotPhotos) {
    return { status: "failed", detail: "reachable, but returned no photos" };
  }

  // Real Pexels keys are a long alphanumeric string. This catches an obviously
  // truncated or pasted-wrong value, and nothing more.
  const looksRight = /^[A-Za-z0-9]{40,}$/.test(key);

  return {
    status: "unknown",
    detail: looksRight
      ? "photos returned; Pexels cannot confirm the key itself"
      : "photos returned, but this does not look like a Pexels key",
  };
}

/* --------------------------------------------------------------------- main */

const KEYS = [
  {
    name: "GEMINI_API_KEY",
    role: "the main brain",
    check: checkGemini,
    missing: "searches fall back to Groq, then to the offline engine",
    where: "https://aistudio.google.com/app/apikey",
  },
  {
    name: "GROQ_API_KEY",
    role: "the backup brain",
    check: checkGroq,
    missing: "no failover if Gemini is down or out of quota",
    where: "https://console.groq.com/keys",
  },
  {
    name: "PEXELS_API_KEY",
    role: "product photos",
    check: checkPexels,
    missing: "product cards show an emoji tile instead of a photo",
    where: "https://www.pexels.com/api/",
  },
];

async function main() {
  console.log("");
  console.log(bold("  DailyValue — API key check"));
  console.log(dim("  ─────────────────────────────────────────────────────────"));

  const env = await loadEnv();

  if (env === null) {
    console.log("");
    console.log(`  ${red("No .env.local file found.")}`);
    console.log("");
    console.log(`  Expected it here:`);
    console.log(dim(`    ${ENV_PATH}`));
    console.log("");
    console.log(`  Create it by copying the template:`);
    console.log(dim(`    cp .env.example .env.local`));
    console.log("");
    console.log(
      `  ${yellow("The app still runs without it")} — on the built-in offline engine.`,
    );
    console.log("");
    return;
  }

  let geminiOk = false;
  let groqOk = false;

  for (const spec of KEYS) {
    const value = (env[spec.name] ?? "").trim();
    const label = `  ${spec.name.padEnd(16)}`;

    if (!value) {
      console.log("");
      console.log(`${label}${yellow("not set")}  ${dim(`(${spec.role})`)}`);
      console.log(dim(`                  → ${spec.missing}`));
      console.log(dim(`                  → get one at ${spec.where}`));
      continue;
    }

    // The "checking…" line is overwritten in place when the result arrives.
    // That only works on a real terminal - piped into a file or another
    // program there is no cursor to move, and the escape codes would show up
    // as literal rubbish. So only do it when stdout is a terminal.
    const isTty = Boolean(process.stdout.isTTY);
    if (isTty) process.stdout.write(`${label}${dim(mask(value))}  checking…`);

    let result;
    try {
      result = await spec.check(value);
    } catch (err) {
      const aborted = err?.name === "AbortError";
      result = {
        status: "failed",
        detail: aborted ? "timed out — is the internet reachable?" : String(err.message),
      };
    }

    // \r returns the cursor to the start of the line; \x1b[K clears to the end.
    if (isTty) process.stdout.write("\r\x1b[K");

    if (result.status === "ok") {
      if (spec.name === "GEMINI_API_KEY") geminiOk = true;
      if (spec.name === "GROQ_API_KEY") groqOk = true;
      console.log(`${label}${green("works ")}  ${dim(mask(value))}  ${dim(result.detail)}`);
    } else if (result.status === "unknown") {
      console.log(`${label}${yellow("set   ")}  ${dim(mask(value))}  ${dim(result.detail)}`);
    } else {
      console.log(`${label}${red("failed")}  ${dim(mask(value))}  ${red(result.detail)}`);
    }
  }

  console.log("");
  console.log(dim("  ─────────────────────────────────────────────────────────"));

  // The summary turns on Gemini alone, because that is the key that decides
  // whether the app is actually running on AI. Groq only matters when Gemini
  // fails, and Pexels only changes whether cards show photos or emoji.
  if (geminiOk) {
    console.log(`  ${green("Gemini is working.")} Restart the dev server and search.`);
    if (!groqOk) {
      console.log(dim("  No Groq fallback, so a Gemini outage drops you to the offline engine."));
    }
  } else {
    console.log(
      `  ${yellow("Gemini is not working")} — the app runs, but on the offline engine.`,
    );
    console.log(dim("  That means no mattresses, no air conditioners, and no list revisions."));
  }

  console.log(
    dim("  Environment variables load at startup, so restart `npm run dev` after changes."),
  );
  console.log("");
}

main().catch((err) => {
  console.error(red(`\n  Key check crashed: ${err.message}\n`));
  process.exitCode = 1;
});
