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
  assert.match(html, /Validation des chapitres/);
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

test("wires real AI packaging, long-form writing, key validation, hook iteration, reference analysis, and image generation", async () => {
  const [studio, modelsRoute, textRoute, keyRoute, hookRoute, chaptersRoute, writeRoute, imageRoute, referenceRoute, styleRoute, hosting] = await Promise.all([
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openrouter-models/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openrouter-generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openrouter-key/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/studio-hook/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/studio-chapters/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/studio-write/route.ts", import.meta.url), "utf8"),
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
  assert.match(studio, /Scénarisation longue — modèle thinking/);
  assert.match(studio, /const WORDS_PER_MINUTE = 145/);
  assert.match(studio, /ÉTAPE \{n\} \/ 7/);
  assert.match(modelsRoute, /openrouter\.ai\/api\/v1\/models\?sort=most-popular&supported_parameters=response_format/);
  assert.match(modelsRoute, /supportsWriter/);
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
  assert.match(chaptersRoute, /reasoning: \{ effort: "high", exclude: true \}/);
  assert.match(chaptersRoute, /youtube_chapter_plan/);
  assert.match(writeRoute, /youtube_script_body/);
  assert.match(writeRoute, /body_under_target/);
  assert.match(writeRoute, /youtube_conclusion/);
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

test("plans 5-12 chapters with a dedicated high-reasoning model", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("chapter-plan-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  let sentBody;
  const chapters = Array.from({ length: 7 }, (_, index) => ({
    title: `Chapitre ${index + 1}`,
    objective: `Développer clairement le point essentiel numéro ${index + 1}`,
    keyPoints: [`Point concret ${index + 1}.1`, `Point concret ${index + 1}.2`],
    targetWords: 100 + index * 10,
  }));
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://openrouter.ai/api/v1/chat/completions")) {
      sentBody = JSON.parse(String(init?.body ?? "{}"));
      return Response.json({ choices: [{ message: { content: JSON.stringify({ chapters }) } }] });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/studio-chapters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        apiKey: "test-key",
        model: "openai/test-reasoning-model",
        language: "fr",
        subject: "Expliquer une nouvelle fonctionnalité d’intelligence artificielle",
        duration: "8–12 minutes",
        targetBodyWords: 1180,
        chapterCount: 7,
        hook: "Un hook suffisamment précis pour le test",
        promise: "Une promesse suffisamment précise pour le test",
      }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.result.chapters.length, 7);
    assert.equal(payload.result.chapters.reduce((sum, chapter) => sum + chapter.targetWords, 0), 1180);
    assert.equal(sentBody.reasoning.effort, "high");
    assert.equal(sentBody.reasoning.exclude, true);
    assert.equal(sentBody.response_format.type, "json_schema");
    assert.equal(sentBody.provider.require_parameters, true);
    assert.equal("temperature" in sentBody, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("develops every validated chapter into a long-form body", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("long-body-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  const chapters = Array.from({ length: 5 }, (_, index) => ({
    id: `chapter-${index + 1}`,
    title: `Partie ${index + 1}`,
    objective: `Expliquer le point ${index + 1}`,
    keyPoints: [`Idée ${index + 1}.1`, `Idée ${index + 1}.2`],
    targetWords: 130,
  }));
  const scriptPart = Array.from({ length: 120 }, (_, index) => `mot${index + 1}`).join(" ");
  let calls = 0;
  let sentBody;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://openrouter.ai/api/v1/chat/completions")) {
      calls += 1;
      sentBody = JSON.parse(String(init?.body ?? "{}"));
      return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ sections: chapters.map(chapter => ({ id: chapter.id, title: chapter.title, script: scriptPart, transition: "Passons maintenant au point suivant." })) }) } }] });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/studio-write", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        apiKey: "test-key",
        model: "openai/test-reasoning-model",
        action: "body",
        language: "fr",
        subject: "Expliquer une nouvelle fonctionnalité d’intelligence artificielle",
        duration: "8–12 minutes",
        targetBodyWords: 650,
        chapters,
      }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.equal(payload.result.sections.length, 5);
    assert.ok(payload.result.wordCount >= 600);
    assert.match(payload.result.body, /CHAPITRE 5 — PARTIE 5/);
    assert.equal(sentBody.reasoning.effort, "high");
    assert.equal(sentBody.response_format.type, "json_schema");
    assert.equal(sentBody.provider.require_parameters, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("repairs underdeveloped chapters and reports any remaining deficit", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("chapter-depth-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  const chapters = Array.from({ length: 5 }, (_, index) => ({
    id: `chapter-${index + 1}`,
    title: `Partie ${index + 1}`,
    objective: `Expliquer le point ${index + 1}`,
    keyPoints: [`Idée ${index + 1}.1`, `Idée ${index + 1}.2`],
    targetWords: 130,
  }));
  const shortPart = Array.from({ length: 20 }, (_, index) => `mot-court-${index + 1}`).join(" ");
  const fullPart = Array.from({ length: 145 }, (_, index) => `mot-long-${index + 1}`).join(" ");
  const content = JSON.stringify({ sections: chapters.map((chapter, index) => ({ id: chapter.id, title: chapter.title, script: index === 0 ? shortPart : fullPart, transition: "Passons au point suivant." })) });
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://openrouter.ai/api/v1/chat/completions")) {
      calls += 1;
      return Response.json({ choices: [{ finish_reason: "stop", message: { content } }] });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/studio-write", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiKey: "test-key", model: "openai/test-reasoning-model", action: "body", language: "fr", subject: "Un sujet long à expliquer", targetBodyWords: 650, chapters }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(calls, 2);
    assert.equal(payload.warning.code, "body_under_target");
    assert.equal(payload.warning.chapterDeficits.length, 1);
    assert.equal(payload.warning.chapterDeficits[0].id, "chapter-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not bill a repair after a provider error embedded in HTTP 200", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("provider-error-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  const chapters = Array.from({ length: 5 }, (_, index) => ({ id: `chapter-${index + 1}`, title: `Partie ${index + 1}`, objective: `Expliquer le point ${index + 1}`, keyPoints: [`Idée ${index + 1}.1`, `Idée ${index + 1}.2`], targetWords: 130 }));
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://openrouter.ai/api/v1/chat/completions")) {
      calls += 1;
      return Response.json({ choices: [{ finish_reason: "error", error: { message: "Provider unavailable", metadata: { error_type: "provider_error" } } }] });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/studio-write", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiKey: "test-key", model: "openai/test-reasoning-model", action: "body", subject: "Un sujet long à expliquer", targetBodyWords: 650, chapters }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    const payload = await response.json();
    assert.equal(response.status, 502);
    assert.equal(calls, 1);
    assert.equal(payload.error, "openrouter_provider_error");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps popular models while marking only fully compatible thinking writers", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("model-catalog-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  const pricing = { prompt: "0.000001", completion: "0.000006" };
  const architecture = { input_modalities: ["text"], output_modalities: ["text"] };
  globalThis.fetch = async input => {
    const url = String(input);
    if (url.includes("sort=intelligence-high-to-low")) return Response.json({ data: [
      { id: "openai/gpt-5.6-sol", name: "GPT-5.6 Sol", pricing, architecture, supported_parameters: ["reasoning", "structured_outputs", "response_format", "max_tokens"], reasoning: { supported_efforts: ["low", "medium", "high"] } },
      { id: "vendor/model:batch", name: "Batch Model", pricing, architecture, supported_parameters: ["reasoning", "structured_outputs", "response_format", "max_tokens"], reasoning: { supported_efforts: ["high"] } },
    ] });
    if (url.includes("sort=most-popular")) return Response.json({ data: [
      { id: "vendor/popular-cheap", name: "Popular Cheap", pricing, architecture, supported_parameters: ["response_format"] },
    ] });
    return originalFetch(input);
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/openrouter-models"), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.ok(payload.models.some(model => model.id === "vendor/popular-cheap"));
    assert.equal(payload.models.find(model => model.id === "openai/gpt-5.6-sol").supportsWriter, true);
    assert.equal(payload.models.find(model => model.id === "vendor/model:batch").supportsWriter, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
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
