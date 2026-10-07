#!/usr/bin/env node
// Índices y comprobaciones de la documentación.
//
//   pnpm docs:index   regenera las tablas generadas (docs/INDEX.md, docs/decisions/README.md)
//   pnpm docs:check   solo comprueba (la CI lo pasa): falla si algo está desfasado o roto
//
// Lo que se genera sale del código siempre que se puede (eventos, dependencias entre
// funcionalidades, qué archivos compartidos importan cada funcionalidad) y del frontmatter
// de los README (resumen, tipo, preferencias, ADR). Ver docs/templates/feature-readme.md.
//
// Qué comprueba: el frontmatter y las secciones de cada README, sus eventos, preferencias,
// dependencias reales (imports), rutas de integración, historial y «Estado actual»; las ADR
// (nombre, numeración, estado); los enlaces y anclas de toda la documentación, y que los
// símbolos enlazados (`[`símbolo`](archivo.ts)`) existan en su archivo; que no haya cifras
// que caducan, comandos que borren datos del propietario ni archivos ajenos en docs/; y que
// las tablas generadas estén al día. Sin dependencias: Node 20 o más.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join("/");
const abs = (r) => path.join(ROOT, ...r.split("/"));
const read = (r) => fs.readFileSync(abs(r), "utf8").replace(/\r\n/g, "\n");
const exists = (r) => fs.existsSync(abs(r));

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

// ─── Frontmatter y secciones ────────────────────────────────────────────────

/** Frontmatter YAML mínimo: `clave: valor` y `clave: [a, b]`. Las líneas que empiezan por `#` se ignoran. */
function frontmatter(text) {
  if (!text.startsWith("---\n")) return { data: null, body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return { data: null, body: text };
  const data = {};
  for (const raw of text.slice(4, end).split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (!m) continue;
    const v = m[2].trim();
    data[m[1]] = v.startsWith("[")
      ? v.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean)
      : v;
  }
  return { data, body: text.slice(end + 5) };
}

/** Quita los bloques de código (```) para no leer enlaces ni títulos de dentro. */
const stripFences = (text) => text.replace(/^```[\s\S]*?^```/gm, (m) => m.replace(/[^\n]/g, ""));

/** Secciones de nivel 2: [{ title, text }]. */
function sections(body) {
  const lines = stripFences(body).split("\n");
  const raw = body.split("\n");
  const out = [];
  lines.forEach((l, i) => {
    const m = l.match(/^## (.+)$/);
    if (m) out.push({ title: m[1].trim(), start: i });
  });
  return out.map((s, i) => ({
    title: s.title,
    text: raw.slice(s.start + 1, i + 1 < out.length ? out[i + 1].start : raw.length).join("\n"),
  }));
}

/** Ancla de un título al estilo de GitHub. */
const slug = (h) =>
  h
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");

function anchors(text) {
  const seen = new Map();
  const out = new Set();
  for (const l of stripFences(text).split("\n")) {
    const m = l.match(/^#{1,6} (.+)$/);
    if (!m) continue;
    const base = slug(m[1]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.add(n ? `${base}-${n}` : base);
  }
  return out;
}

// ─── Código: eventos, preferencias e imports ────────────────────────────────

const FEATURES_DIR = "src/features";
const featureNames = fs
  .readdirSync(abs(FEATURES_DIR), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const eventTypes = (r) =>
  exists(r) ? [...new Set([...read(r).matchAll(/type:\s*"([a-z_]+)"/g)].map((m) => m[1]))] : [];

/** Eventos del núcleo (src/domain/events.ts), documentados en el informe técnico. */
const CORE_EVENTS = eventTypes("src/domain/events.ts");
const codeEvents = new Map(); // tipo → funcionalidad (según dónde se declara)
for (const t of CORE_EVENTS) codeEvents.set(t, "(núcleo)");
for (const f of featureNames) for (const t of eventTypes(`${FEATURES_DIR}/${f}/events.ts`)) codeEvents.set(t, f);

const sourceFiles = walk(abs("src"), (p) => /\.(ts|tsx)$/.test(p) && !/\.test\.ts$/.test(p)).map(rel);

/** Claves de localStorage / IndexedDB del núcleo y dónde se documentan. */
const CORE_PREFS = {
  "quests.lang": ["idioma de la interfaz", "docs/COMO-FUNCIONA.md#12-idiomas-español-y-japonés"],
  "quests.muted": ["silencio general (efectos y música)", "docs/COMO-FUNCIONA.md#10-el-sonido-sintetizado-sin-archivos"],
  "quests.events": ["eventos (solo en el navegador, `pnpm dev`)", "docs/COMO-FUNCIONA.md#6-almacenamiento-sqlite-y-su-sustituto-en-el-navegador"],
  "quests.deviceId": ["id del dispositivo (solo en el navegador)", "docs/COMO-FUNCIONA.md#6-almacenamiento-sqlite-y-su-sustituto-en-el-navegador"],
  "quests.synced": ["eventos ya subidos (solo en el navegador)", "docs/COMO-FUNCIONA.md#6-almacenamiento-sqlite-y-su-sustituto-en-el-navegador"],
  "quests.blobs": ["base de IndexedDB de los adjuntos (solo en el navegador)", "docs/COMO-FUNCIONA.md#6-almacenamiento-sqlite-y-su-sustituto-en-el-navegador"],
};
const codePrefs = new Set();
for (const f of sourceFiles)
  for (const m of read(f).matchAll(/["'`](quests\.[a-zA-Z]+)["'`]/g)) codePrefs.add(m[1]);

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?[^'"`;]*?\bfrom\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;

/** Funcionalidades que importa un archivo (sin contar la suya). */
function importedFeatures(file) {
  const out = new Set();
  const own = file.match(/^src\/features\/([^/]+)\//)?.[1];
  for (const m of read(file).matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (!spec?.startsWith(".")) continue;
    const target = rel(path.resolve(path.dirname(abs(file)), spec));
    const f = target.match(/^src\/features\/([^/]+)/)?.[1];
    if (f && f !== own && featureNames.includes(f)) out.add(f);
  }
  return out;
}

const featureDeps = new Map(featureNames.map((f) => [f, new Set()]));
const sharedFiles = new Map(); // archivo fuera de features → funcionalidades que importa
for (const file of sourceFiles) {
  const deps = importedFeatures(file);
  const own = file.match(/^src\/features\/([^/]+)\//)?.[1];
  if (own) for (const d of deps) featureDeps.get(own)?.add(d);
  else if (deps.size) sharedFiles.set(file, deps);
}
const usedBy = new Map(featureNames.map((f) => [f, new Set()]));
for (const [f, deps] of featureDeps) for (const d of deps) usedBy.get(d).add(f);

// ─── ADR ────────────────────────────────────────────────────────────────────

const DECISIONS = "docs/decisions";
const ESTADOS = ["aceptada", "ampliada", "sustituida"];
const adrs = [];
for (const name of fs.readdirSync(abs(DECISIONS)).sort()) {
  if (name === "README.md" || name.startsWith(".")) continue;
  const m = name.match(/^ADR-(\d{2})-[a-z0-9-]+\.md$/);
  if (!m) {
    // Un archivo mal nombrado no saldría en el índice ni se comprobaría.
    fail(`${DECISIONS}/${name}`, "nombre fuera de la convención ADR-NN-tema-corto.md (minúsculas, cifras y guiones)");
    continue;
  }
  const file = `${DECISIONS}/${name}`;
  const { data, body } = frontmatter(read(file));
  if (!data) {
    fail(file, "falta el frontmatter");
    continue;
  }
  const id = `ADR-${m[1]}`;
  if (data.adr !== id) fail(file, `adr: «${data.adr}» no coincide con el nombre del archivo (${id})`);
  if (!data.titulo) fail(file, "falta «titulo»");
  if (!ESTADOS.includes(data.estado)) fail(file, `estado «${data.estado}»: tiene que ser ${ESTADOS.join(", ")}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fecha ?? "")) fail(file, "fecha: AAAA-MM-DD");
  if (data.estado !== "aceptada" && !(data.por ?? []).length) fail(file, `una ADR ${data.estado} dice por cuál (por: [ADR-NN])`);
  for (const s of ["## Decisión", "## Alternativas descartadas", "## Motivo", "## Consecuencias"])
    if (!body.includes(`\n${s}\n`)) fail(file, `falta la sección «${s}»`);
  for (const f of data.funcionalidades ?? []) if (!featureNames.includes(f)) fail(file, `funcionalidad desconocida «${f}»`);
  adrs.push({ id, file, name, ...data });
}
const adrIds = new Set(adrs.map((a) => a.id));
for (const a of adrs) for (const p of a.por ?? []) if (!adrIds.has(p)) fail(a.file, `por: «${p}» no existe`);
// Numeración: sin números repetidos ni huecos (ADR-01 … ADR-NN).
const adrNumbers = adrs.map((a) => Number(a.id.slice(4)));
for (const n of new Set(adrNumbers.filter((n, i) => adrNumbers.indexOf(n) !== i)))
  fail(DECISIONS, `hay varias ADR con el número ${String(n).padStart(2, "0")}`);
for (let n = 1; n <= Math.max(0, ...adrNumbers); n++)
  if (!adrNumbers.includes(n)) fail(DECISIONS, `falta la ADR-${String(n).padStart(2, "0")} (la numeración no deja huecos)`);

// ─── README de las funcionalidades ──────────────────────────────────────────

const TIPOS = ["dominio", "presentación", "servicio", "infraestructura"];
const FRONTMATTER_KEYS = ["funcionalidad", "titulo", "resumen", "tipo", "eventos", "preferencias", "adr"];
const REQUIRED = ["Qué hace", "Reglas y decisiones", "Eventos", "Archivos", "Integración", "Dependencias", "Estado actual"];
const ORDER = ["Qué hace", "Reglas y decisiones", "Modelo", "Eventos", "Interfaz", "Archivos", "Integración", "Dependencias", "Estado actual", "Pendiente"];

const features = [];
const declaredEvents = new Map();
const declaredPrefs = new Map();
for (const f of featureNames) {
  const file = `${FEATURES_DIR}/${f}/README.md`;
  if (!exists(file)) {
    fail(`${FEATURES_DIR}/${f}`, "la funcionalidad no tiene README.md (plantilla: docs/templates/feature-readme.md)");
    continue;
  }
  const text = read(file);
  const { data, body } = frontmatter(text);
  if (!data) {
    fail(file, "falta el frontmatter (ver docs/templates/feature-readme.md)");
    continue;
  }
  if (data.funcionalidad !== f) fail(file, `funcionalidad: «${data.funcionalidad}» tiene que ser «${f}»`);
  for (const k of Object.keys(data))
    if (!FRONTMATTER_KEYS.includes(k)) fail(file, `clave «${k}» fuera de la plantilla (las válidas: ${FRONTMATTER_KEYS.join(", ")})`);
  for (const k of ["titulo", "resumen", "tipo"]) if (!data[k]) fail(file, `falta «${k}» en el frontmatter`);
  for (const k of ["eventos", "preferencias", "adr"])
    if (!Array.isArray(data[k])) fail(file, `«${k}» tiene que ser una lista ([] si no hay)`);
  if (data.tipo && !TIPOS.includes(data.tipo)) fail(file, `tipo «${data.tipo}»: tiene que ser ${TIPOS.join(", ")}`);
  if (data.resumen && data.resumen.length > 200) fail(file, "el resumen pasa de 200 caracteres: que sea una frase");

  const secs = sections(body);
  const titles = secs.map((s) => s.title);
  for (const r of REQUIRED) if (!titles.includes(r)) fail(file, `falta la sección «## ${r}»`);
  const known = titles.filter((t) => ORDER.includes(t));
  const sorted = [...known].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  if (known.join("|") !== sorted.join("|")) fail(file, `secciones fuera de orden; el orden es: ${ORDER.join(" · ")}`);
  for (const t of titles) if (!ORDER.includes(t)) fail(file, `sección «## ${t}» fuera de la plantilla (usa ### dentro de una de: ${ORDER.join(", ")})`);
  const sec = (t) => secs.find((s) => s.title === t)?.text ?? "";

  // Eventos: cada uno declarado existe en el código, es de esta carpeta y sale en su sección.
  for (const e of data.eventos ?? []) {
    if (!codeEvents.has(e)) fail(file, `evento «${e}» no existe en el código`);
    else if (codeEvents.get(e) !== f) fail(file, `evento «${e}» se declara en ${codeEvents.get(e)}, no aquí`);
    if (!sec("Eventos").includes(`\`${e}\``)) fail(file, `el evento «${e}» no sale en «## Eventos»`);
    declaredEvents.set(e, f);
  }
  for (const p of data.preferencias ?? []) {
    if (!codePrefs.has(p)) fail(file, `preferencia «${p}» no aparece en el código`);
    declaredPrefs.set(p, f);
  }
  for (const a of data.adr ?? []) if (!adrIds.has(a)) fail(file, `«${a}» no existe en docs/decisions`);

  // Dependencias reales (imports): cada una se explica en «## Dependencias».
  const deps = sec("Dependencias");
  for (const d of featureDeps.get(f))
    if (!new RegExp(`features/${d}\\b|\\.\\./${d}/`).test(deps))
      fail(file, `importa features/${d}: explícalo en «## Dependencias» (con «features/${d}» o un enlace a ../${d}/README.md)`);

  // Integración: las rutas que cita existen.
  for (const m of sec("Integración").matchAll(/`([^`\s]+)`/g)) {
    const p = m[1];
    if (!/^(src|src-tauri|public|scripts|docs|\.github)\/|^(package\.json|vite\.config\.ts|vitest\.config\.ts|tsconfig\.json)$/.test(p)) continue;
    const expanded = p.match(/\{([^}]+)\}/) ? p.match(/\{([^}]+)\}/)[1].split(",").map((x) => p.replace(/\{[^}]+\}/, x)) : [p];
    for (const e of expanded) if (!e.includes("*") && !exists(e.replace(/\/$/, ""))) fail(file, `«## Integración» cita «${e}», que no existe`);
  }

  // Estado actual: la fecha de la última verificación.
  const verified = sec("Estado actual").match(/\*\*Última verificación:\*\*\s*(\d{4}-\d{2}-\d{2})/)?.[1];
  if (!verified) fail(file, "«## Estado actual» necesita «- **Última verificación:** AAAA-MM-DD»");
  if (!sec("Estado actual").includes("**Tests:**")) fail(file, "«## Estado actual» necesita «- **Tests:** …» (qué archivos de test hay, o «ninguno»)");
  const history = `docs/history/verificacion/${f}.md`;
  if (!exists(history)) fail(file, `falta su historial: ${history}`);
  else if (!sec("Estado actual").includes(`history/verificacion/${f}.md`)) fail(file, `«## Estado actual» enlaza su historial (${history})`);

  features.push({ name: f, file, verified, ...data });
}
for (const [t, owner] of codeEvents)
  if (owner !== "(núcleo)" && !declaredEvents.has(t)) fail(`${FEATURES_DIR}/${owner}/README.md`, `el evento «${t}» del código no está en «eventos:»`);
for (const p of codePrefs)
  if (!declaredPrefs.has(p) && !CORE_PREFS[p]) fail("scripts/docs.mjs", `la clave «${p}» del código no está en ningún README («preferencias:») ni en CORE_PREFS`);

// ─── Enlaces y textos prohibidos ────────────────────────────────────────────

const mdFiles = [
  ...["README.md", "AGENTS.md", "CLAUDE.md", "src-tauri/CLAUDE.md"].filter(exists),
  ...walk(abs("docs"), (p) => p.endsWith(".md")).map(rel),
  ...featureNames.map((f) => `${FEATURES_DIR}/${f}/README.md`).filter(exists),
];
/** Comandos que destruirían datos del propietario (su base, su localStorage, sus binarios). */
const DANGEROUS = [
  [/\brm\b[^\n]*(quests\.db|com\.quests\.app)/, "un comando borra la base de datos o la carpeta de la app"],
  [/\b(del|rmdir|Remove-Item)\b[^\n]*(quests\.db|com\.quests\.app)/i, "un comando de Windows borra la base de datos o la carpeta de la app"],
  [/localStorage\.clear\s*\(/, "un comando vacía el localStorage entero"],
  [/indexedDB\.deleteDatabase\s*\(/, "un comando borra la base de IndexedDB"],
  [/\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i, "una sentencia SQL borra datos"],
];
/** Cifras que caducan con cada tarea. */
const STALE_NUMBERS = /\b\d[\d.]*\s+(?:tests?|archivos de tests?|líneas de (?:código|TypeScript|CSS|Rust))\b/g;

const anchorCache = new Map();
const anchorsOf = (r) => {
  if (!anchorCache.has(r)) anchorCache.set(r, anchors(read(r)));
  return anchorCache.get(r);
};
for (const file of mdFiles) {
  const text = read(file);
  // Sin bloques de código ni ejemplos en código con doble acento grave (``[`x`](y.ts)``).
  const plain = stripFences(text).replace(/``[^`\n](?:[^\n]*?)``/g, "");
  for (const m of plain.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = m[1];
    if (/^(https?:|mailto:)/.test(target)) continue;
    const [p, hash] = target.split("#");
    const resolved = p ? rel(path.resolve(path.dirname(abs(file)), decodeURIComponent(p))) : file;
    if (p && !fs.existsSync(abs(resolved))) {
      fail(file, `enlace roto: ${target}`);
      continue;
    }
    if (hash && resolved.endsWith(".md") && !anchorsOf(resolved).has(decodeURIComponent(hash)))
      fail(file, `ancla rota: ${target}`);
  }
  for (const m of text.matchAll(/^@(\S+)$/gm)) if (!fs.existsSync(path.resolve(path.dirname(abs(file)), m[1]))) fail(file, `importa @${m[1]}, que no existe`);

  // Un símbolo enlazado a su archivo, [`nombre`](ruta.tsx), tiene que existir en ese archivo.
  for (const m of plain.matchAll(/\[`([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)(?:\(\))?`\]\(([^)#\s]+\.(?:tsx?|mjs|js|rs))(?:#[^)\s]*)?\)/g)) {
    const [, symbol, target] = m;
    const resolved = path.resolve(path.dirname(abs(file)), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) continue; // ya se avisa como enlace roto
    const source = fs.readFileSync(resolved, "utf8");
    for (const part of symbol.split("."))
      if (!new RegExp(`(^|[^\\w$])${part.replace(/\$/g, "\\$")}([^\\w$]|$)`, "m").test(source))
        fail(file, `el símbolo «${symbol}» no aparece en ${rel(resolved)}`);
  }

  // El progreso del propietario no se borra nunca (AGENTES §3), tampoco en un ejemplo del historial.
  for (const [re, what] of DANGEROUS)
    if (re.test(plain)) fail(file, `${what}: documenta el procedimiento seguro (docs/runbooks/verificar-tauri.md#empezar-de-cero)`);

  if (file.startsWith("docs/history/")) continue;
  // Las cifras cambian con cada tarea: viven en el historial o salen de los comandos (`pnpm test`).
  for (const m of plain.matchAll(STALE_NUMBERS)) fail(file, `cifra que caduca «${m[0]}»: llévala a docs/history/ (la actual la da el comando)`);
}

// ─── Archivos ajenos en docs/ ───────────────────────────────────────────────
// Lo que git subiría (versionado o sin ignorar): solo Markdown e imágenes. Un .DS_Store
// ignorado no cuenta; si .gitignore dejara de ignorarlo, sí.

const DOC_EXTENSIONS = [".md", ".png", ".svg", ".jpg", ".jpeg", ".webp"];
let docFiles;
try {
  docFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "docs"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((f) => fs.existsSync(abs(f)));
} catch {
  docFiles = walk(abs("docs"), () => true).map(rel); // sin git: todo lo que hay (sin ocultos)
}
for (const f of docFiles)
  if (!DOC_EXTENSIONS.includes(path.extname(f).toLowerCase()) || path.basename(f).startsWith("."))
    fail(f, `archivo ajeno a la documentación (en docs/ solo van ${DOC_EXTENSIONS.join(", ")}); si es generado, añádelo a .gitignore`);

// ─── Tablas generadas ───────────────────────────────────────────────────────

const link = (from, to, label) => `[${label}](${path.posix.relative(path.posix.dirname(from), to)})`;
const code = (xs) => (xs.length ? xs.map((x) => `\`${x}\``).join(", ") : "—");

function featuresTable(from) {
  const rows = features.map((f) =>
    `| ${link(from, f.file, f.titulo)} | ${f.tipo} | ${f.resumen} | ${code(f.eventos ?? [])} | ${f.verified ?? "—"} |`,
  );
  return ["| Funcionalidad | Tipo | Qué hace | Eventos | Verificada |", "|---|---|---|---|---|", ...rows].join("\n");
}

function sharedTable(from) {
  const byName = (f) => {
    const x = features.find((y) => y.name === f);
    return x ? link(from, x.file, f) : f;
  };
  const rows = [...sharedFiles]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, deps]) => {
      const list = [...deps].sort();
      const cell = list.length >= Math.ceil(featureNames.length * 0.8) ? `${list.length} funcionalidades (montan sus textos o tipos)` : list.map(byName).join(", ");
      return `| \`${file}\` | ${cell} |`;
    });
  return ["| Archivo | Funcionalidades que importa |", "|---|---|", ...rows].join("\n");
}

function depsTable(from) {
  const rows = features.map((f) => {
    const deps = [...featureDeps.get(f.name)].sort();
    const by = [...usedBy.get(f.name)].sort();
    return `| ${link(from, f.file, f.name)} | ${deps.join(", ") || "—"} | ${by.join(", ") || "—"} |`;
  });
  return ["| Funcionalidad | Usa (importa) | La usan |", "|---|---|---|", ...rows].join("\n");
}

function eventsTable(from) {
  const rows = [...codeEvents]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, owner]) => {
      if (owner === "(núcleo)") return `| \`${t}\` | ${link(from, "docs/INFORME-TECNICO.md", "núcleo (informe)")} |`;
      const f = features.find((x) => x.name === owner);
      return `| \`${t}\` | ${f ? link(from, f.file, owner) : owner} |`;
    });
  return [`${codeEvents.size} tipos de evento en el código.`, "", "| Evento | Dónde se documenta |", "|---|---|", ...rows].join("\n");
}

function prefsTable(from) {
  const rows = [
    ...Object.entries(CORE_PREFS).map(([k, [what, doc]]) => {
      const [p, h] = doc.split("#");
      return [k, `[Núcleo: ${what}](${path.posix.relative(path.posix.dirname(from), p)}#${h})`];
    }),
    ...[...declaredPrefs].map(([k, f]) => {
      const x = features.find((y) => y.name === f);
      return [k, link(from, x.file, x.titulo)];
    }),
  ]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, where]) => `| \`${k}\` | ${where} |`);
  return ["| Clave | Dónde se documenta |", "|---|---|", ...rows].join("\n");
}

function adrTable(from) {
  const rows = adrs.map((a) => {
    const estado = a.estado === "aceptada" ? "aceptada" : `${a.estado} por ${(a.por ?? []).join(", ")}`;
    const feats = (a.funcionalidades ?? []).join(", ") || "—";
    return `| ${link(from, a.file, a.id)} | ${a.titulo} | ${estado} | ${feats} | ${a.fecha} |`;
  });
  return ["| ADR | Decisión | Estado | Funcionalidades | Registrada |", "|---|---|---|---|---|", ...rows].join("\n");
}

/** Va dentro de cada bloque generado: así no se puede olvidar ni quedar fuera de su tabla. */
const GENERATED_NOTICE = "> Esta tabla se genera con `pnpm docs:index`. No editar manualmente: los cambios se pierden al regenerarla.";

const GENERATED = {
  "docs/INDEX.md": {
    funcionalidades: featuresTable,
    "archivos-compartidos": sharedTable,
    dependencias: depsTable,
    eventos: eventsTable,
    preferencias: prefsTable,
  },
  "docs/decisions/README.md": { adr: adrTable },
};

for (const [file, blocks] of Object.entries(GENERATED)) {
  if (!exists(file)) {
    fail(file, "no existe");
    continue;
  }
  const before = read(file);
  let after = before;
  for (const [name, gen] of Object.entries(blocks)) {
    const re = new RegExp(`(<!-- generado:${name} -->)[\\s\\S]*?(<!-- /generado:${name} -->)`);
    if (!re.test(after)) {
      fail(file, `faltan las marcas <!-- generado:${name} --> … <!-- /generado:${name} -->`);
      continue;
    }
    after = after.replace(re, (_, a, b) => `${a}\n${GENERATED_NOTICE}\n\n${gen(file)}\n${b}`);
  }
  if (after !== before) {
    if (CHECK) fail(file, "las tablas generadas están desfasadas: ejecuta `pnpm docs:index`");
    else fs.writeFileSync(abs(file), after);
  }
}

// ─── Resultado ──────────────────────────────────────────────────────────────

if (errors.length) {
  console.error(`Documentación: ${errors.length} problema(s)\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `Documentación correcta: ${features.length} funcionalidades, ${codeEvents.size} eventos, ${adrs.length} ADR, ${mdFiles.length} documentos.${CHECK ? "" : " Tablas regeneradas."}`,
);
