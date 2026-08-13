import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Script Studio workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /aria-label="Script Studio"/i);
  assert.match(html, /Hook &amp; intro/);
  assert.match(html, /Recherche &amp; angle/);
  assert.match(html, /Packaging/);
  assert.match(html, /Packaging express/);
  assert.match(html, /Garde-fous actifs/);
  assert.match(html, /28<!-- --> \/ 40/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("removes disposable starter assets and keeps product metadata", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(page, /<ScriptStudio \/>/);
  assert.match(layout, /Script Studio — de l’idée à la publication/);
  assert.match(layout, /\/og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});

test("wires real AI packaging, reference analysis, and image generation", async () => {
  const [studio, modelsRoute, textRoute, imageRoute, referenceRoute, styleRoute, hosting] = await Promise.all([
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openrouter-models/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openrouter-generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openai-image/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reference-thumbnails/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reference-style/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  assert.match(studio, /Clés IA & modèles/);
  assert.match(studio, /in \{formatTokenPrice\(model\.inputPerToken\)\}\/M/);
  assert.match(studio, /Miniatures générées par OpenAI/);
  assert.match(studio, /SESSION UNIQUEMENT/);
  assert.match(studio, /ADN visuel des miniatures/);
  assert.match(studio, /Itérer avec l’IA/);
  assert.match(modelsRoute, /openrouter\.ai\/api\/v1\/models\?sort=most-popular&supported_parameters=response_format/);
  assert.match(textRoute, /openrouter\.ai\/api\/v1\/chat\/completions/);
  assert.match(imageRoute, /api\.openai\.com\/v1\/images\/generations/);
  assert.match(imageRoute, /api\.openai\.com\/v1\/images\/edits/);
  assert.match(imageRoute, /gpt-image-2/);
  assert.match(referenceRoute, /BUCKET/);
  assert.match(styleRoute, /image_url/);
  assert.match(styleRoute, /reference-thumbnails/);
  assert.match(hosting, /"r2": "BUCKET"/);
});
