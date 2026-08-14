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
  assert.doesNotMatch(layout, /next\/font/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});

test("wires real AI packaging, key validation, hook iteration, reference analysis, and image generation", async () => {
  const [studio, modelsRoute, textRoute, keyRoute, hookRoute, imageRoute, referenceRoute, styleRoute, hosting] = await Promise.all([
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openrouter-models/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openrouter-generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openrouter-key/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/studio-hook/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openai-image/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reference-thumbnails/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reference-style/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  assert.match(studio, /Clés IA & modèles/);
  assert.match(studio, /in \{formatTokenPrice\(model\.inputPerToken\)\}\/M/);
  assert.match(studio, /Miniatures générées par OpenAI/);
  assert.match(studio, /MÉMORISÉ SUR CET APPAREIL/);
  assert.match(studio, /Mémoriser mes clés sur cet appareil/);
  assert.match(studio, /Tester la clé/);
  assert.match(studio, /script-studio-ai-credentials/);
  assert.match(studio, /ADN visuel des miniatures/);
  assert.match(studio, /Itérer avec l’IA/);
  assert.match(studio, /Bloc automatique de description/);
  assert.match(studio, /JPmF6GBrDAEB1ETlq3pWYh/);
  assert.match(studio, /5 quiz à trois choix/);
  assert.match(studio, /Meilleur packaging en anglais/);
  assert.match(studio, /COMMENTAIRE À ÉPINGLER/);
  assert.match(studio, /Affiner avec l’IA/);
  assert.match(studio, /Appliquer mes orientations/);
  assert.match(modelsRoute, /openrouter\.ai\/api\/v1\/models\?sort=most-popular&supported_parameters=response_format/);
  assert.match(textRoute, /openrouter\.ai\/api\/v1\/chat\/completions/);
  assert.match(keyRoute, /openrouter\.ai\/api\/v1\/key/);
  assert.match(keyRoute, /openrouter_key_rejected/);
  assert.match(textRoute, /"options":\["answer A","answer B","answer C"\]/);
  assert.match(textRoute, /correctOption/);
  assert.match(textRoute, /descriptionFooter/);
  assert.match(textRoute, /englishTitle/);
  assert.match(textRoute, /englishDescription/);
  assert.match(textRoute, /pinnedComment/);
  assert.match(hookRoute, /openrouter\.ai\/api\/v1\/chat\/completions/);
  assert.match(hookRoute, /CURRENT HOOK/);
  assert.match(hookRoute, /USER DIRECTION/);
  assert.match(hookRoute, /Repair the draft below/);
  assert.match(hookRoute, /response-healing/);
  assert.match(hookRoute, /length_adjustment_needed/);
  assert.doesNotMatch(hookRoute, /status: 422/);
  assert.match(studio, /studio-ai-notice/);
  assert.match(studio, /Choisir un autre modèle/);
  assert.match(imageRoute, /api\.openai\.com\/v1\/images\/generations/);
  assert.match(imageRoute, /api\.openai\.com\/v1\/images\/edits/);
  assert.match(imageRoute, /gpt-image-2/);
  assert.match(referenceRoute, /BUCKET/);
  assert.match(styleRoute, /image_url/);
  assert.match(styleRoute, /reference-thumbnails/);
  assert.match(hosting, /"r2": "BUCKET"/);
});

test("returns usable hook copy with a warning instead of HTTP 422", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("hook-warning-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let responseHealingEnabled = false;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://openrouter.ai/api/v1/chat/completions")) {
      calls += 1;
      const requestBody = JSON.parse(String(init?.body ?? "{}"));
      responseHealingEnabled = requestBody.plugins?.some(plugin => plugin.id === "response-healing") ?? false;
      return Response.json({
        choices: [{ message: { content: JSON.stringify({ hook: "Une accroche encore trop courte", promise: "Une promesse trop courte" }) } }],
        usage: { prompt_tokens: 10, completion_tokens: 8 },
      });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/studio-hook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiKey: "test-key", model: "test/model", subject: "Automatiser une tâche répétitive", language: "fr" }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(calls, 2);
    assert.equal(responseHealingEnabled, true);
    assert.equal(payload.result.hook, "Une accroche encore trop courte");
    assert.equal(payload.warning.code, "length_adjustment_needed");
    assert.equal(payload.warning.hookValid, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("parses labelled copy and preserves the untargeted field during iteration", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("hook-iteration-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  const hook = Array.from({ length: 30 }, (_, index) => `mot${index + 1}`).join(" ");
  const protectedPromise = "Cette promesse existante doit rester exactement identique.";
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://openrouter.ai/api/v1/chat/completions")) {
      calls += 1;
      return Response.json({ choices: [{ message: { content: `HOOK: ${hook}\nPROMESSE: texte proposé par le modèle` } }] });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/studio-hook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        apiKey: "test-key",
        model: "test/model",
        subject: "Automatiser une tâche répétitive",
        language: "fr",
        action: "iterate",
        target: "hook",
        direction: "Plus direct",
        currentHook: "Ancien hook",
        currentPromise: protectedPromise,
      }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.equal(payload.result.hook, hook);
    assert.equal(payload.result.promise, protectedPromise);
    assert.equal(payload.warning, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reports a provider-output failure instead of mislabelling it as HTTP 422", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("hook-invalid-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://openrouter.ai/api/v1/chat/completions")) {
      return Response.json({ choices: [{ message: { content: "réponse sans structure exploitable" } }] });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/studio-hook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiKey: "test-key", model: "test/model", subject: "Automatiser une tâche répétitive", language: "fr" }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    const payload = await response.json();
    assert.equal(response.status, 502);
    assert.equal(payload.error, "openrouter_unusable_hook_response");
    assert.equal(payload.reason, "invalid_json_or_empty_content");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
