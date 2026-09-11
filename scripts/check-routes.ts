/* Route-integrity guard: every nav/palette/feature href must resolve to a
   real page, API route, dynamic parent, or middleware-redirected feature.
   Run: npx tsx scripts/check-routes.ts   (exit 1 = broken links) */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { DISABLED_FEATURES } from "../src/lib/disabled-features";
import { NAV_ENTRIES } from "../src/lib/nav-registry";

/** Intentional non-route targets (public assets, og images) go here. */
const ALLOW = new Set<string>(["/onboarding"]);

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const norm = (href: string): string => {
  let p = href.split("#")[0]!.split("?")[0]!;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
};

const APP = path.join(process.cwd(), "src", "app");
const pages = new Set<string>();
const apis = new Set<string>();
const dynamic: string[] = [];

for (const f of await walk(APP)) {
  const relDir = path.relative(APP, path.dirname(f));
  const segs = relDir
    .split(path.sep)
    .filter(Boolean)
    .filter((s) => !s.startsWith("(") && !s.startsWith("@"));
  const route = segs.length ? "/" + segs.join("/") : "/";
  const base = path.basename(f);
  const isDynamic = segs.some((s) => s.startsWith("["));
  if (base === "page.tsx") {
    if (isDynamic) dynamic.push(route);
    else pages.add(route);
  } else if (base === "route.ts" && segs[0] === "api") {
    if (isDynamic) dynamic.push(route);
    else apis.add(route);
  }
}

const resolves = (h: string): boolean =>
  pages.has(h) ||
  apis.has(h) ||
  dynamic.some((d) => h === d || h.startsWith(d + "/")) ||
  DISABLED_FEATURES.some((f) => h === f.path || h.startsWith(f.path + "/"));

const broken: string[] = [];
let checked = 0;

for (const entry of NAV_ENTRIES) {
  const h = norm(entry.href);
  if (h === "/" || ALLOW.has(h)) continue;
  checked++;
  if (!resolves(h)) {
    broken.push(`  ✗ ${h}  (${entry.label})`);
  }
}

console.log(`pages: ${pages.size} · api: ${apis.size} · dynamic: ${dynamic.length}`);
console.log(`hrefs checked: ${checked} · broken: ${broken.length}`);
for (const b of broken) console.log(b);
if (broken.length) process.exit(1);
