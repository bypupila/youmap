import { chromium } from "playwright";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const baseUrl = (process.env.VISUAL_LIBRARY_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const version = process.env.VISUAL_LIBRARY_VERSION || new Date().toISOString().slice(0, 10);
const outDir = path.join(projectRoot, "docs", "visual-library", "versions", version);
const pagesDir = path.join(outDir, "pages");
const componentsDir = path.join(outDir, "components");
const issuesDir = path.join(outDir, "ui-issues");
const responsiveDir = path.join(outDir, "responsive");

const routes = [
  { name: "HomePage", path: "/" },
  { name: "CountryCardProposalsPage", path: "/country-card-proposals" },
  { name: "DemoDisenoPage", path: "/demo-diseno" },
  { name: "OnboardingPageDemo", path: "/onboarding?demo=1" },
  { name: "AuthPage", path: "/auth" },
  { name: "ExplorePage", path: "/explore" },
  { name: "TermsPage", path: "/terms" },
  { name: "PrivacyPage", path: "/privacy" },
  { name: "MapPageDemo", path: "/map?channelId=demo" },
  { name: "MapProposalPage2", path: "/map-proposal-2" },
  { name: "MapProposalPage", path: "/map-proposal" },
  { name: "MapProposalV1Page", path: "/map-proposal-v1" },
];

function slugify(value) {
  return String(value || "item")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    if (entry.isFile() && absolute.endsWith(".tsx")) files.push(absolute);
  }
  return files;
}

function routeFromPageFile(file) {
  const relative = path.relative(path.join(projectRoot, "src", "app"), file);
  if (!relative.endsWith("page.tsx")) return null;
  const route = `/${relative.replace(/\/page\.tsx$/, "").replace(/^page\.tsx$/, "")}`;
  return route === "/" ? "/" : route.replace(/\/$/, "");
}

async function buildInventory() {
  const files = await walk(path.join(projectRoot, "src"));
  const components = [];
  const pages = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const relative = path.relative(projectRoot, file);
    const pageRoute = routeFromPageFile(file);

    if (pageRoute) {
      const pageName =
        source.match(/export\s+default\s+(?:async\s+)?function\s+([A-Z][A-Za-z0-9_]*)/)?.[1] ||
        path.basename(path.dirname(file)).replace(/[^a-zA-Z0-9]/g, "") ||
        "Page";
      pages.push({ name: pageName, route: pageRoute, file: relative });
    }

    for (const match of source.matchAll(/(?:export\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g)) {
      components.push({ name: match[1], file: relative });
    }

    for (const match of source.matchAll(/(?:export\s+)?const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>/g)) {
      components.push({ name: match[1], file: relative });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    baseUrl,
    version,
    pages: pages.sort((a, b) => a.route.localeCompare(b.route)),
    components: components
      .filter((item, index, list) => list.findIndex((candidate) => candidate.name === item.name && candidate.file === item.file) === index)
      .sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name)),
  };
}

async function preparePage(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route("**/*", async (requestRoute) => {
    const requestUrl = requestRoute.request().url();
    const parsedUrl = new URL(requestUrl);
    if (parsedUrl.pathname.startsWith("/ingest") || parsedUrl.hostname.includes("posthog") || parsedUrl.hostname.includes("sentry.io")) {
      await requestRoute.abort();
      return;
    }
    await requestRoute.continue();
  });
  return page;
}

async function captureRoute(browser, route) {
  const page = await preparePage(browser);
  const url = `${baseUrl}${route.path}`;
  const routeSlug = slugify(`${route.name}-${route.path === "/" ? "root" : route.path}`);
  const pageFile = path.join(pagesDir, `${routeSlug}.png`);
  const issueFile = path.join(issuesDir, `${routeSlug}.png`);
  const components = [];

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await hideCaptureOverlays(page);
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await waitForVisualReadiness(page, route);
    const finalUrl = page.url();
    await page.screenshot({ path: pageFile, fullPage: true });

    const handles = await page.locator("[data-component]").elementHandles();
    const seen = new Map();

    for (const handle of handles) {
      const name = await handle.getAttribute("data-component");
      const visible = await handle.isVisible().catch(() => false);
      const box = await handle.boundingBox().catch(() => null);
      if (!name || !visible || !box || box.width < 20 || box.height < 20) continue;

      const count = (seen.get(name) || 0) + 1;
      seen.set(name, count);
      const fileName = `${slugify(name)}__${routeSlug}${count > 1 ? `__${count}` : ""}.png`;
      const filePath = path.join(componentsDir, fileName);
      await handle.screenshot({ path: filePath }).catch(async () => {
        const clipped = {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width: Math.max(1, Math.min(box.width, 1440 - Math.max(0, box.x))),
          height: Math.max(1, Math.min(box.height, 1000 - Math.max(0, box.y))),
        };
        await page.screenshot({ path: filePath, clip: clipped });
      });

      components.push({
        name,
        route: route.path,
        screenshot: path.relative(outDir, filePath),
        width: Math.round(box.width),
        height: Math.round(box.height),
      });
    }

    return {
      ...route,
      url,
      finalUrl,
      status: "captured",
      screenshot: path.relative(outDir, pageFile),
      components,
    };
  } catch (error) {
    await page.screenshot({ path: issueFile, fullPage: true }).catch(() => {});
    return {
      ...route,
      url,
      finalUrl: page.url(),
      status: "visual_issue",
      error: error instanceof Error ? error.message : String(error),
      screenshot: path.relative(outDir, issueFile),
      components,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function waitForVisualReadiness(page, route) {
  await page.waitForTimeout(600);
  await page.waitForFunction(() => document.fonts?.status === "loaded", null, { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(
    () =>
      [...document.images]
        .filter((image) => image.getBoundingClientRect().width > 8 && image.getBoundingClientRect().height > 8)
        .every((image) => image.complete && image.naturalWidth > 0),
    null,
    { timeout: 20000 }
  ).catch(() => {});

  const hasMapShell = await page.locator("[data-component='MapExperienceCore']").count();
  if (!hasMapShell) return;

  await page.waitForFunction(
    () => {
      const sidebarText = document.querySelector("[data-component='ProposalSidebar2']")?.textContent || "";
      const railText = document.querySelector("[data-component='VideoInspirationRail2']")?.textContent || "";
      return sidebarText.length > 80 && railText.length > 80;
    },
    null,
    { timeout: 25000 }
  );

  await page.waitForFunction(
    () => document.querySelectorAll("[data-globe-marker]").length > 0,
    null,
    { timeout: 25000 }
  );

  const globeIsVisible = await page.waitForFunction(
    () => {
      const canvas = document.querySelector("canvas");
      if (!canvas || canvas.width < 100 || canvas.height < 100) return false;

      const sample = document.createElement("canvas");
      sample.width = 80;
      sample.height = 80;
      const context = sample.getContext("2d");
      if (!context) return false;
      context.drawImage(canvas, 0, 0, sample.width, sample.height);
      const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
      let nonDarkPixels = 0;
      let maxBrightness = 0;

      for (let index = 0; index < pixels.length; index += 4) {
        const brightness = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
        if (brightness > 26) nonDarkPixels += 1;
        if (brightness > maxBrightness) maxBrightness = brightness;
      }

      return nonDarkPixels > 160 && maxBrightness > 60;
    },
    null,
    { timeout: 30000 }
  ).catch(() => null);

  if (!globeIsVisible) {
    throw new Error(`Globe canvas did not render visible pixels for ${route.name}`);
  }
}

async function hideCaptureOverlays(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal,
      [data-nextjs-toast],
      [data-next-badge-root],
      [id^="feedback-tool"],
      .nextjs-toast {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `,
  }).catch(() => {});
}

async function captureMobileMenu(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.route("**/*", async (requestRoute) => {
    const parsedUrl = new URL(requestRoute.request().url());
    if (parsedUrl.pathname.startsWith("/ingest") || parsedUrl.hostname.includes("posthog") || parsedUrl.hostname.includes("sentry.io")) {
      await requestRoute.abort();
      return;
    }
    await requestRoute.continue();
  });

  const route = { name: "MapPageDemoMobileMenu", path: "/map?channelId=demo" };
  const url = `${baseUrl}${route.path}`;
  const filePath = path.join(responsiveDir, "MapPageDemo-mobile-menu-open.png");
  const issuePath = path.join(issuesDir, "MapPageDemo-mobile-menu-open.png");

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await hideCaptureOverlays(page);
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await waitForVisualReadiness(page, route);
    const menuButton = page.getByLabel("Abrir menú lateral");
    await menuButton.waitFor({ state: "visible", timeout: 15000 });
    await menuButton.click({ timeout: 10000 });
    await page.locator("[data-component='MobileDrawer2']").waitFor({ state: "visible", timeout: 10000 });
    await page.screenshot({ path: filePath, fullPage: true });
    return {
      ...route,
      url,
      finalUrl: page.url(),
      status: "captured",
      screenshot: path.relative(outDir, filePath),
    };
  } catch (error) {
    await page.screenshot({ path: issuePath, fullPage: true }).catch(() => {});
    return {
      ...route,
      url,
      finalUrl: page.url(),
      status: "visual_issue",
      error: error instanceof Error ? error.message : String(error),
      screenshot: path.relative(outDir, issuePath),
    };
  } finally {
    await page.close().catch(() => {});
  }
}

function renderIndex(results, responsiveResults, inventory) {
  const capturedComponents = results.flatMap((result) => result.components);
  const issueResults = [...results, ...responsiveResults].filter((result) => result.status === "visual_issue");
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TravelYourMap Visual Library ${version}</title>
  <style>
    body { margin: 0; background: #0b0d0f; color: #edf0f4; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width: min(1180px, calc(100vw - 32px)); margin: 0 auto; padding: 40px 0 64px; }
    h1, h2 { letter-spacing: -0.04em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .card { border: 1px solid rgba(255,255,255,.12); border-radius: 18px; background: rgba(255,255,255,.04); overflow: hidden; }
    .card img { display: block; width: 100%; height: auto; background: #05070a; }
    .meta { padding: 12px 14px 14px; }
    .meta p { margin: 4px 0 0; color: #aeb7c2; font-size: 12px; }
    code { color: #ff9a82; }
    a { color: inherit; }
  </style>
</head>
<body>
  <main>
    <h1>TravelYourMap Visual Library</h1>
    <p>Version <code>${version}</code>. Base URL <code>${baseUrl}</code>. Generado ${inventory.generatedAt}.</p>
    <p>Inventario: ${inventory.pages.length} paginas y ${inventory.components.length} componentes/funciones React detectados en <code>src</code>.</p>

    <h2>Paginas Capturadas</h2>
    <section class="grid">
      ${results.map((result) => `
        <article class="card">
          ${result.status === "captured" ? `<a href="${result.screenshot}"><img src="${result.screenshot}" alt="${result.name}" loading="lazy" /></a>` : ""}
          <div class="meta">
            <strong>${result.name}</strong>
            <p><code>${result.path}</code> · ${result.status}</p>
            ${result.error ? `<p>${result.error}</p>` : ""}
          </div>
        </article>
      `).join("")}
    </section>

    <h2>Responsive</h2>
    <section class="grid">
      ${responsiveResults.map((result) => `
        <article class="card">
          ${result.screenshot ? `<a href="${result.screenshot}"><img src="${result.screenshot}" alt="${result.name}" loading="lazy" /></a>` : ""}
          <div class="meta">
            <strong>${result.name}</strong>
            <p><code>${result.path}</code> · ${result.status}</p>
            ${result.error ? `<p>${result.error}</p>` : ""}
          </div>
        </article>
      `).join("")}
    </section>

    <h2>Componentes Capturados</h2>
    <section class="grid">
      ${capturedComponents.map((item) => `
        <article class="card">
          <a href="${item.screenshot}"><img src="${item.screenshot}" alt="${item.name}" loading="lazy" /></a>
          <div class="meta">
            <strong>${item.name}</strong>
            <p><code>${item.route}</code> · ${item.width}x${item.height}</p>
          </div>
        </article>
      `).join("")}
    </section>

    <h2>UI Issues</h2>
    <section class="grid">
      ${issueResults.length ? issueResults.map((result) => `
        <article class="card">
          ${result.screenshot ? `<a href="${result.screenshot}"><img src="${result.screenshot}" alt="${result.name}" loading="lazy" /></a>` : ""}
          <div class="meta">
            <strong>${result.name}</strong>
            <p><code>${result.path}</code> · requiere correccion visual</p>
            ${result.error ? `<p>${result.error}</p>` : ""}
          </div>
        </article>
      `).join("") : `<p>No visual issues detected by the capture readiness checks.</p>`}
    </section>
  </main>
</body>
</html>`;
}

await mkdir(pagesDir, { recursive: true });
await mkdir(componentsDir, { recursive: true });
await mkdir(issuesDir, { recursive: true });
await mkdir(responsiveDir, { recursive: true });

const inventory = await buildInventory();
const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const results = [];

for (const route of routes) {
  console.log(`Capturing ${route.name} ${route.path}`);
  results.push(await captureRoute(browser, route));
}

console.log("Capturing responsive MapPageDemo mobile menu");
const responsiveResults = [await captureMobileMenu(browser)];

await browser.close();

const manifest = {
  ...inventory,
  capturedRoutes: results,
  responsiveCaptures: responsiveResults,
};

await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(outDir, "index.html"), renderIndex(results, responsiveResults, inventory));
await writeFile(
  path.join(projectRoot, "docs", "visual-library", "LATEST.md"),
  `# Visual Library Latest\n\nVersion: ${version}\n\nOpen: [index.html](versions/${version}/index.html)\n\nManifest: [manifest.json](versions/${version}/manifest.json)\n`
);

console.log(`Visual library written to ${path.relative(projectRoot, outDir)}`);
