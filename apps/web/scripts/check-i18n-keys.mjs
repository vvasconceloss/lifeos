#!/usr/bin/env node
/**
 * i18n key-completeness verification.
 *
 * Compares the translation keys across `en`, `pt` and `uk` for every namespace
 * under `apps/web/src/i18n/locales`. Exits non-zero when a key is missing in one
 * of the languages, so CI prevents merging incomplete translations.
 *
 * Plural suffixes (`_one`, `_few`, `_many`, `_other`) are normalized away before
 * comparison, since they are valid per-language plural categories.
 *
 * Optional: `--check-orphans` reports keys defined but never referenced in the
 * code (as warnings; does not fail the build).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, "../src/i18n/locales");
const LANGUAGES = ["en", "pt", "uk"];

const PLURAL_SUFFIX = /_(one|few|many|other)$/;

function collectKeys(node, prefix = "") {
  const keys = new Set();
  for (const [key, value] of Object.entries(node)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      // Recurse arrays by index so `steps.0.title` becomes a real key.
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        const itemKey = `${full}.${i}`;
        if (item && typeof item === "object") {
          for (const k of collectKeys(item, itemKey)) keys.add(k);
        } else {
          keys.add(itemKey);
        }
      }
    } else if (value && typeof value === "object") {
      for (const k of collectKeys(value, full)) keys.add(k);
    } else {
      keys.add(full);
    }
  }
  return keys;
}

function normalize(key) {
  return key.replace(PLURAL_SUFFIX, "");
}

function main() {
  const checkOrphans = process.argv.includes("--check-orphans");
  const languages = fs
    .readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => LANGUAGES.includes(name));

  if (languages.length === 0) {
    console.error("i18n: no language folders found under src/i18n/locales");
    process.exit(1);
  }

  // namespace -> lang -> keys
  const bundles = new Map();

  for (const lang of languages) {
    const dir = path.join(LOCALES_DIR, lang);
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      const namespace = file.replace(/\.json$/, "");
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      const keys = new Set([...collectKeys(raw)].map(normalize));
      if (!bundles.has(namespace)) bundles.set(namespace, {});
      bundles.get(namespace)[lang] = keys;
    }
  }

  let failures = 0;

  // 1. Key completeness across languages.
  for (const [namespace, byLang] of bundles) {
    const langsInNs = Object.keys(byLang);
    const reference = byLang[langsInNs[0]];
    for (const lang of langsInNs) {
      const current = byLang[lang];
      for (const key of reference) {
        if (!current.has(key)) {
          console.error(`i18n: missing key "${key}" in ${lang}/${namespace}.json`);
          failures++;
        }
      }
    }
    for (const lang of langsInNs) {
      const current = byLang[lang];
      for (const key of current) {
        if (!reference.has(key)) {
          console.error(`i18n: extra key "${key}" in ${lang}/${namespace}.json (not in ${langsInNs[0]})`);
          failures++;
        }
      }
    }
  }

  // 2. Orphan detection (keys never referenced in the codebase).
  if (checkOrphans) {
    const srcDir = path.resolve(__dirname, "../src");
    const codeFiles = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "i18n" || entry.name === "test") continue;
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          codeFiles.push(full);
        }
      }
    };
    walk(srcDir);

      // Collect every t("key") / t('key') call per file, resolving the namespace
      // from `useTranslation("ns")`/`useTranslation(['a','b'])` in that file.
      const usedByNs = new Map(); // ns -> Set(keys)
      const knownNamespaces = new Set(bundles.keys());
      for (const ns of knownNamespaces) usedByNs.set(ns, new Set());

      for (const file of codeFiles) {
        const source = fs.readFileSync(file, "utf8");
        const namespaces = new Set();

        const useTrans = /useTranslation\(\s*(\[[^\]]*\]|"[^"]*"|'[^']*'|\S+)?\s*\)/g;
        let ut;
        while ((ut = useTrans.exec(source)) !== null) {
          const arg = ut[1] ?? "common";
          const inner = arg.trim();
          if (inner.startsWith("[")) {
            for (const m of inner.matchAll(/["']([^"']+)["']/g)) namespaces.add(m[1]);
          } else {
            const bare = inner.replace(/^["']|["']$/g, "");
            if (bare) namespaces.add(bare);
          }
        }
        if (namespaces.size === 0) continue;

        // 1) Direct t("...") calls (string + template-literal forms).
        const tCalls = new Set();
        const tRegex = /\bt\(\s*`([^`]+)`|\bt\(\s*"([^"]+)"|\bt\(\s*'([^']+)'/g;
        let m;
        while ((m = tRegex.exec(source)) !== null) {
          const key = m[1] ?? m[2] ?? m[3];
          if (key) tCalls.add(key);
        }

        // 2) Dynamic prefixes from template literals, e.g. `ranks.titles.${rank}`,
        //    `status.${s.toLowerCase()}`, `dashboard:daysOfWeek.${key}`.
        const dynamicPrefixes = new Set();
        const prefixRegex = /(["'`])([a-zA-Z0-9_:-]+(?:\.[a-zA-Z0-9_:-]+)*)\.\$\{/g;
        while ((m = prefixRegex.exec(source)) !== null) {
          dynamicPrefixes.add(m[2]);
        }

        // 3) Static "ns.key" literals used via data (arrays/objects/variables),
        //    e.g. `labelKey: "stats.frequencies.label"` or `["DAILY", "frequency.daily"]`.
        const staticLiterals = new Set();
        const literalRegex = /["']((?:common|auth|dashboard|habits|goals|projects|journal|progression|statistics|settings|onboarding|landing):[a-zA-Z0-9_.]+|[a-zA-Z0-9]+\.[a-zA-Z0-9_.]+)["']/g;
        while ((m = literalRegex.exec(source)) !== null) {
          staticLiterals.add(m[1]);
        }

        for (const ns of namespaces) {
          if (!usedByNs.has(ns)) usedByNs.set(ns, new Set());
          for (const key of tCalls) {
            if (key.includes(":")) {
              const [prefix, rest] = key.split(":");
              if (usedByNs.has(prefix)) usedByNs.get(prefix).add(rest);
            } else {
              usedByNs.get(ns).add(key);
            }
          }
          for (const prefix of dynamicPrefixes) {
            if (prefix.includes(":")) {
              const [pns, rest] = prefix.split(":");
              if (usedByNs.has(pns)) usedByNs.get(pns).add(rest);
            } else if (prefix.startsWith(`${ns}.`)) {
              usedByNs.get(ns).add(prefix.slice(ns.length + 1));
            } else if (!prefix.includes(".")) {
              usedByNs.get(ns).add(prefix);
            } else {
              // Relative dotted prefix inside this file's namespace.
              usedByNs.get(ns).add(prefix);
            }
          }
          for (const lit of staticLiterals) {
            if (lit.includes(":")) {
              const [pns, rest] = lit.split(":");
              if (usedByNs.has(pns)) usedByNs.get(pns).add(rest);
            } else if (lit.startsWith(`${ns}.`)) {
              usedByNs.get(ns).add(lit.slice(ns.length + 1));
            } else {
              // Relative dotted literal inside this file's namespace.
              usedByNs.get(ns).add(lit);
            }
          }
        }
      }

      // Cross-namespace references (e.g. t(`dashboard:daysOfWeek.${key}`) inside a
      // file whose useTranslation namespace is different) must still mark the
      // target namespace's keys as used. Re-scan dynamic prefixes and literals.
      for (const file of codeFiles) {
        const source = fs.readFileSync(file, "utf8");
        const prefixRegex = /(["'`])([a-zA-Z0-9_:-]+(?:\.[a-zA-Z0-9_:-]+)*)\.\$\{/g;
        let m;
        while ((m = prefixRegex.exec(source)) !== null) {
          const full = m[2];
          const colon = full.indexOf(":");
          if (colon > 0 && knownNamespaces.has(full.slice(0, colon))) {
            usedByNs.get(full.slice(0, colon)).add(full.slice(colon + 1));
          }
        }
        const literalRegex = /["']((?:common|auth|dashboard|habits|goals|projects|journal|progression|statistics|settings|onboarding|landing):[a-zA-Z0-9_.]+|[a-zA-Z0-9]+\.[a-zA-Z0-9_.]+)["']/g;
        while ((m = literalRegex.exec(source)) !== null) {
          const full = m[1];
          const colon = full.indexOf(":");
          if (colon > 0 && knownNamespaces.has(full.slice(0, colon))) {
            usedByNs.get(full.slice(0, colon)).add(full.slice(colon + 1));
          }
        }
      }

    let orphans = 0;
    for (const [namespace, byLang] of bundles) {
      const reference = byLang.en;
      const used = usedByNs.get(namespace) ?? new Set();
      // A used key counts as covering itself and every descendant (dynamic
      // prefixes like `ranks.titles` cover `ranks.titles.E` etc.).
      const covers = (key) =>
        used.has(key) || [...used].some((p) => key.startsWith(`${p}.`));
      for (const key of reference) {
        if (covers(key)) continue;
        const base = key.replace(PLURAL_SUFFIX, "");
        if (covers(base)) continue;
        console.warn(`i18n: orphan key "${namespace}.${key}" (defined but never used)`);
        orphans++;
      }
    }
    console.log(`i18n: ${orphans} orphan key(s) detected (warnings only).`);
  }

  if (failures > 0) {
    console.error(`i18n: ${failures} translation issue(s) found — fix before merging.`);
    process.exit(1);
  }

  console.log(
    `i18n: OK — ${bundles.size} namespace(s) complete across ${languages.join(", ")}.`,
  );
}

main();
