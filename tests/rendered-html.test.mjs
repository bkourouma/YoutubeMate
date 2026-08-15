import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

// The routes now require a signed-in identity and resolve keys server-side. The test
// user is also the admin, so the environment fallback stands in for a stored key.
const TEST_USER = "test-user";
process.env.ADMIN_USER_ID ??= TEST_USER;
process.env.OPENROUTER_API_KEY ??= "test-openrouter-key";
process.env.OPENAI_API_KEY ??= "test-openai-key";
process.env.DESCRIPT_API_TOKEN ??= "test-descript-token";
const signedIn = { "content-type": "application/json", "oai-authenticated-user-id": TEST_USER };

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

test("server-renders the YoutubeMate workspace with both pipelines named", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /aria-label="CreatorMate"/i);
  assert.match(html, /Script Studio/);
  assert.match(html, /Shorts Studio/);
  assert.match(html, /Hook &amp; intro/);
  assert.match(html, /Recherche &amp; angle/);
  assert.match(html, /Validation des chapitres/);
  assert.match(html, /Packaging/);
  assert.match(html, /Package vidéo/);
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
  assert.ok(layout.includes("${product.name} — de l’idée à la publication"), "the OpenGraph title no longer reads the product name from config");
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
    readFile(new URL("../app/api/integrations/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/studio-hook/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/studio-chapters/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/studio-write/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openai-image/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reference-thumbnails/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reference-style/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  assert.match(studio, /Clés & connexions/);
  assert.match(studio, /in \{formatTokenPrice\(model\.inputPerToken\)\}\/M/);
  assert.match(studio, /Miniatures générées par OpenAI/);
  assert.match(studio, /CHIFFRÉ · LIÉ À VOTRE COMPTE/);
  assert.match(studio, /Tester et enregistrer/);
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
  assert.match(keyRoute, /secret_rejected/);
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
  assert.match(writeRoute, /youtube_script_section/);
  assert.match(writeRoute, /section_under_target/);
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
      headers: signedIn,
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

function testChapters(count = 5, targetWords = 130) {
  return Array.from({ length: count }, (_, index) => ({
    id: `chapter-${index + 1}`,
    title: `Partie ${index + 1}`,
    objective: `Expliquer le point ${index + 1}`,
    keyPoints: [`Idée ${index + 1}.1`, `Idée ${index + 1}.2`],
    targetWords,
  }));
}

function writtenSection(id, words) {
  return { id, script: Array.from({ length: words }, (_, index) => `mot-${id}-${index + 1}`).join(" "), transition: "Passons au point suivant." };
}

test("writes exactly one validated chapter per request", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("one-section-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  const chapters = testChapters();
  const scriptPart = Array.from({ length: 140 }, (_, index) => `mot${index + 1}`).join(" ");
  let calls = 0;
  let sentBody;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://openrouter.ai/api/v1/chat/completions")) {
      calls += 1;
      sentBody = JSON.parse(String(init?.body ?? "{}"));
      return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ script: scriptPart, transition: "Passons maintenant au point suivant." }) } }] });
    }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/studio-write", {
      method: "POST",
      headers: signedIn,
      body: JSON.stringify({
        apiKey: "test-key",
        model: "openai/test-reasoning-model",
        action: "section",
        language: "fr",
        subject: "Expliquer une nouvelle fonctionnalité d’intelligence artificielle",
        duration: "8–12 minutes",
        targetBodyWords: 650,
        chapters,
        sectionIndex: 2,
        previousSections: [writtenSection("chapter-1", 130), writtenSection("chapter-2", 130)],
      }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.equal(payload.result.index, 2);
    assert.equal(payload.result.section.id, "chapter-3");
    assert.ok(payload.result.wordCount >= 130);
    assert.equal(payload.warning, null);
    assert.equal(sentBody.reasoning.effort, "high");
    assert.equal(sentBody.response_format.type, "json_schema");
    assert.equal(sentBody.provider.require_parameters, true);
    // Per-chapter budget, not the old 16k-48k whole-body budget.
    assert.ok(sentBody.max_tokens <= 8000);
    // The chapter heading is inserted by the client, never by the model.
    assert.doesNotMatch(payload.result.section.script, /CHAPITRE/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects the retired monolithic body action", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("legacy-action-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://openrouter.ai/api/v1/chat/completions")) { calls += 1; return Response.json({ choices: [] }); }
    return originalFetch(input, init);
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/studio-write", {
      method: "POST",
      headers: signedIn,
      body: JSON.stringify({ model: "openai/test-reasoning-model", action: "body", subject: "Un sujet long à expliquer", targetBodyWords: 650, chapters: testChapters() }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    const payload = await response.json();
    assert.equal(response.status, 400);
    assert.equal(payload.error, "invalid_action");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("repairs an underdeveloped chapter and reports the remaining deficit", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("chapter-depth-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  const chapters = testChapters();
  const shortPart = Array.from({ length: 20 }, (_, index) => `mot-court-${index + 1}`).join(" ");
  const content = JSON.stringify({ script: shortPart, transition: "Passons au point suivant." });
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
      headers: signedIn,
      body: JSON.stringify({ model: "openai/test-reasoning-model", action: "section", language: "fr", subject: "Un sujet long à expliquer", targetBodyWords: 650, chapters, sectionIndex: 0, previousSections: [] }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    const payload = await response.json();
    assert.equal(response.status, 200);
    // One primary call plus exactly one repair leg — scoped to this chapter only.
    assert.equal(calls, 2);
    assert.equal(payload.warning.code, "section_under_target");
    assert.equal(payload.warning.actualWords, 20);
    assert.equal(payload.warning.targetMinimum, 91);
    assert.equal(payload.result.section.id, "chapter-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not bill a repair after a provider error embedded in HTTP 200", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("provider-error-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const originalFetch = globalThis.fetch;
  const chapters = testChapters();
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
      headers: signedIn,
      body: JSON.stringify({ model: "openai/test-reasoning-model", action: "section", subject: "Un sujet long à expliquer", targetBodyWords: 650, chapters, sectionIndex: 0, previousSections: [] }),
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
      headers: signedIn,
      body: JSON.stringify({ model: "test/model", subject: "Automatiser une tâche répétitive", language: "fr" }),
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
      headers: signedIn,
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
      headers: signedIn,
      body: JSON.stringify({ model: "test/model", subject: "Automatiser une tâche répétitive", language: "fr" }),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    const payload = await response.json();
    assert.equal(response.status, 502);
    assert.equal(payload.error, "openrouter_unusable_hook_response");
    assert.equal(payload.reason, "invalid_json_or_empty_content");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ports the Shorts data routes with identity, caps and its cue logic intact", async () => {
  const [analyze, titles, metadata, projects, cache] = await Promise.all([
    readFile(new URL("../app/api/shorts-analyze/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/shorts-titles/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/shorts-metadata/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/shorts-projects/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/server/ai-cache.ts", import.meta.url), "utf8"),
  ]);
  // The SRT cue logic is what makes exact source timecodes possible — a careless
  // port would break it silently, so pin its shape.
  assert.match(analyze, /const timestampPattern = \/\^\(\\d\{1,2\}\):\(\\d\{2\}\):\(\\d\{2\}\)\[,\.\]\(\\d\{3\}\)/);
  assert.match(analyze, /function constrainCueRanges/);
  assert.match(analyze, /\[\\u0300-\\u036f\]/);
  assert.match(analyze, /const maxSeconds = targetMinutes \* 60 \+ 5;/);
  assert.match(analyze, /const maxWords = targetMinutes \* 180;/);
  // Unbounded input is an unbounded bill.
  assert.match(analyze, /MAX_TRANSCRIPT/);
  assert.match(titles, /MAX_SHORTS/);
  assert.match(metadata, /MAX_ITEMS/);
  // Truncation recovery must survive the port.
  assert.match(metadata, /class IncompleteMetadataResponse/);
  assert.match(metadata, /createMetadataReliably/);
  // The owner belongs in the cache key, or two accounts share results.
  assert.match(cache, /makeCacheKey\(kind: string, userId: string, value: unknown\)/);
  assert.match(cache, /\$\{kind\}:\$\{userId\}:/);
  // Project rows: real identity, no self-issued visitor cookie, capped and deletable.
  assert.doesNotMatch(projects, /visitor/i);
  assert.match(projects, /MAX_PROJECTS/);
  assert.match(projects, /export async function DELETE/);
  assert.match(projects, /eq\(shortsProjects\.userId, userId\)/);
});

test("never lets a late hydration discard work, and reports a failed save", async () => {
  const studio = await readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8");
  // Creating a project while GET /api/workspace was still in flight used to lose it:
  // the response replaced projects and activeId wholesale, snapping back to the stored
  // active project, and nothing had been saved because writes wait on hydration.
  assert.match(studio, /const workspaceTouched = useRef\(false\)/);
  assert.match(studio, /if \(workspaceTouched\.current\) return;/);
  assert.match(studio, /const touchWorkspace = \(\) => \{ workspaceTouched\.current = true; \}/);
  // Every entry point that edits the workspace must mark it.
  assert.match(studio, /const editProfile = .*touchWorkspace\(\)/);
  assert.match(studio, /const editExpress = .*touchWorkspace\(\)/);
  assert.match(studio, /setProfile=\{editProfile\}/);
  assert.match(studio, /setValue=\{editExpress\}/);
  // A rejected write was swallowed and still reported as saved.
  assert.doesNotMatch(studio, /body: JSON\.stringify\(payload\) \}\)\.catch\(\(\) => null\)/);
  assert.match(studio, /response\.status === 413 \? "too-large" : "error"/);
  assert.match(studio, /Non sauvegardé/);
  // Pasting an outline as the subject must not become the project title.
  assert.match(studio, /function projectTitleFrom/);
  assert.match(studio, /title: projectTitleFrom\(newSubject\)/);
});

test("prepares the presenter photo in the browser and names what failed", async () => {
  const [studio, route] = await Promise.all([
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/presenter-photo/route.ts", import.meta.url), "utf8"),
  ]);
  // A phone photo is routinely 5-10 MB; uploading it raw failed against any sane cap.
  assert.match(studio, /const prepared = await optimizeImage\(file, 1400, 1400\)/);
  assert.match(studio, /async function optimizeImage\(file: File, maxWidth: number, maxHeight: number\)/);
  // Reference thumbnails share the same helper rather than a second copy.
  assert.match(studio, /optimizeImage\(file, 1600, 900\)/);
  assert.doesNotMatch(studio, /optimizeReferenceImage/);
  // Every failure mode gets its own message: one generic string left nothing to act on.
  for (const code of ["invalid_presenter_file", "presenter_storage_unavailable", "authentication_required", "network"]) {
    assert.ok(studio.includes(code), `the upload must name the ${code} case`);
  }
  assert.match(studio, /HEIC/);
  // Parsing the body must not throw before the status is checked.
  assert.match(studio, /response\.json\(\)\.catch\(\(\) => \(\{\}\)\)/);
  assert.match(route, /MAX_FILE_SIZE = 8 \* 1024 \* 1024/);
});

test("packages already-edited shorts without a transcript", async () => {
  const [express, route, studio] = await Promise.all([
    readFile(new URL("../app/shorts-express.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/shorts-express/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
  ]);
  // Two express entries, each naming its format so they cannot be confused.
  assert.match(studio, /Package vidéo/);
  assert.match(studio, /hintExpress: "Vidéo longue déjà tournée"/);
  assert.match(studio, /Package Short/);
  assert.match(studio, /hintShortsExpress: "Short déjà monté"/);
  assert.match(studio, /<ShortsExpress lang=\{lang\}/);
  // Bulk runs sequentially: ten parallel calls would spike the provider rate limit.
  assert.match(express, /for \(const \[index, title\] of titles\.entries\(\)\)/);
  assert.match(express, /const bestOf = /);
  // The hashtag suffix is editable, not hard-coded into every title.
  assert.match(express, /const \[suffix, setSuffix\] = useState\(DEFAULT_SUFFIX\)/);
  // Shorts thumbnails, not landscape ones.
  assert.match(express, /pipeline: "shorts"/);
  assert.match(express, /canvas\.width = 720; canvas\.height = 1280;/);
  // Same guarantees as every other paid route.
  assert.match(route, /requireApiKey\("openrouter"\)/);
  assert.match(route, /makeCacheKey\("shorts-express-v1", userId/);
  assert.match(route, /validPackage/);
  assert.doesNotMatch(route, /apiKey\?: string/);
});

test("builds a CapCut kit that carries the cut plan and the CTA clip", async () => {
  const [kit, shorts, packageJson] = await Promise.all([
    readFile(new URL("../app/lib/capcut-kit.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/shorts-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  // Descript is optional: the kit is the other production route, so the pieces an
  // editor cannot reconstruct by hand must all be in the archive.
  for (const entry of ["plan-de-montage.csv", "sous-titres-source.srt", "texte.txt", "publication.txt", "SHORT CTA.mp4"]) {
    assert.ok(kit.includes(entry), `the kit must contain ${entry}`);
  }
  // Cue placement inside the real source segments is what makes the SRT usable.
  assert.match(kit, /export function buildSrt/);
  assert.match(kit, /Math\.max\(1\.2, Math\.min\(2\.4,/);
  // Estimated timings must stay flagged all the way into the archive.
  assert.match(kit, /positionEstimated \? \(fr \? "oui" : "yes"\)/);
  // JSZip is only loaded by people who edit in CapCut.
  assert.match(shorts, /await import\("\.\/lib\/capcut-kit"\)/);
  assert.match(packageJson, /"jszip"/);
  await access(new URL("../public/short-cta.mp4", import.meta.url));
});

test("frames long-form and Shorts thumbnails at their own exact ratios", async () => {
  const framing = await readFile(new URL("../app/server/image-framing.ts", import.meta.url), "utf8");
  // Parse the four size mappings out of the module and check the geometry itself,
  // rather than trusting the strings: a transposed pair is invisible until the image
  // lands on YouTube cropped.
  const sizes = [...framing.matchAll(/"(\d{3,4})x(\d{3,4})"/g)].map(match => ({ width: Number(match[1]), height: Number(match[2]) }));
  assert.equal(sizes.length, 4, "expected one size per pipeline per model");
  const landscape = sizes.filter(size => size.width > size.height);
  const portrait = sizes.filter(size => size.height > size.width);
  assert.equal(landscape.length, 2);
  assert.equal(portrait.length, 2);
  // Every portrait size is the transpose of a landscape one, so the two pipelines stay
  // inside the same model size family and can never drift apart.
  for (const tall of portrait) {
    assert.ok(landscape.some(wide => wide.width === tall.height && wide.height === tall.width), `${tall.width}x${tall.height} has no landscape transpose`);
  }
  // gpt-image-2 supports the exact ratios; gpt-image-1.5 does not, so the closest
  // supported size is requested and the client crops on download.
  assert.ok(landscape.some(size => Math.abs(size.width / size.height - 16 / 9) < 0.001), "no exact 16:9 landscape size");
  assert.ok(portrait.some(size => Math.abs(size.width / size.height - 9 / 16) < 0.001), "no exact 9:16 portrait size");
  for (const size of landscape) assert.ok(size.width > size.height, "landscape must stay landscape");
  for (const size of portrait) assert.ok(size.height > size.width, "portrait must stay portrait");
  // The presenter instruction must differ by orientation, or the photo is framed wrong.
  assert.match(framing, /export function presenterBrief/);
  assert.match(framing, /Frame them vertically/);
  const shortsStudio = await readFile(new URL("../app/shorts-studio.tsx", import.meta.url), "utf8");
  // YouTube wants 720x1280 on delivery; the model is not asked for it.
  assert.match(shortsStudio, /canvas\.width = 720; canvas\.height = 1280;/);
});

test("uploads one short per request and hardens the Descript calls", async () => {
  const [upload, descript, shorts, poll] = await Promise.all([
    readFile(new URL("../app/api/shorts-upload/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/shorts-descript/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/shorts-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/server/poll.ts", import.meta.url), "utf8"),
  ]);
  // The original looped over every short inside one request: ~an hour of wall clock,
  // and a dropped connection lost every paid render.
  assert.doesNotMatch(upload, /shorts\?:\s*Array/);
  assert.match(upload, /title\?: string; description\?: string/);
  assert.match(shorts, /const publishToYoutube = /);
  assert.match(shorts, /filter\(\(\{ index \}\) => !uploaded\[index\]\)/);
  // Deadlines are wall-clock, not attempt counts.
  assert.match(poll, /deadlineMs/);
  assert.doesNotMatch(upload, /attempt < \d+/);
  assert.doesNotMatch(descript, /attempt < \d+/);
  // Client-supplied ids are never interpolated raw into a Descript URL.
  assert.match(descript, /const PROJECT_ID = \/\^\[A-Za-z0-9_-\]/);
  assert.match(upload, /encodeURIComponent\(projectId\)/);
  assert.match(descript, /encodeURIComponent\(projectId\)/);
  // Descript fetches the CTA itself, so its URL must not follow the request Host.
  assert.match(descript, /publicOrigin\(request\)/);
  assert.doesNotMatch(descript, /nextUrl\.origin/);
  // Uploads always land private for review.
  assert.match(upload, /privacyStatus: "private"/);
});

test("binds the YouTube connection to one account and to a single-use state", async () => {
  const [auth, callback, helper, schema] = await Promise.all([
    readFile(new URL("../app/api/youtube/auth/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/youtube/callback/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/server/youtube.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);
  // Starting the flow anonymously let anyone complete it and take over the connection.
  assert.match(auth, /requireUserId\(\)/);
  // The original checked the state with a substring test on the raw Cookie header, so
  // any cookie whose value contained that text passed. Strip comments first: this file
  // quotes the old vulnerable line to explain why it was replaced.
  const callbackCode = callback.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(callbackCode, /headers\.get\(\s*["']cookie["']\s*\)/i);
  assert.doesNotMatch(callbackCode, /cookie\w*\.includes\(/i);
  assert.match(callback, /consumeOAuthState\(state\)/);
  assert.match(helper, /delete\(oauthStates\)\.where\(eq\(oauthStates\.state, state\)\)/);
  // A refused consent used to fall through to a bare 400.
  assert.match(callback, /parameters\.get\("error"\)/);
  // One row per user, token encrypted, and no request-Host-derived redirect URI.
  assert.match(schema, /userId: text\("user_id"\)\.primaryKey\(\)/);
  assert.match(schema, /refreshTokenEncrypted/);
  assert.doesNotMatch(schema, /refresh_token"\)\.notNull/);
  assert.match(helper, /PUBLIC_APP_ORIGIN/);
  assert.match(helper, /additionalData\(userId\)/);
  // Upload is the only scope this app ever needs.
  assert.match(helper, /youtube\.upload/);
  assert.doesNotMatch(helper, /youtube\.readonly|youtube\.force-ssl/);
});

test("renders the Shorts pipeline inside the shared shell", async () => {
  const [shorts, studio] = await Promise.all([
    readFile(new URL("../app/shorts-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
  ]);
  // The wrapper class is what keeps the two stylesheets apart.
  assert.match(shorts, /className="pipeline-shorts"/);
  // Shorts must reuse the shell's identity, alerts and retry helper, not its own copies.
  assert.match(studio, /<ShortsStudio lang=\{lang\}/);
  assert.match(studio, /postJson=\{postJsonWithRetry\}/);
  assert.doesNotMatch(shorts, /apiKey/);
  assert.doesNotMatch(shorts, /localStorage/);
  // The four ported endpoints, and none of the not-yet-ported ones.
  assert.match(shorts, /\/api\/shorts-analyze/);
  assert.match(shorts, /\/api\/shorts-titles/);
  assert.match(shorts, /\/api\/shorts-metadata/);
  assert.match(shorts, /\/api\/shorts-projects/);
  assert.doesNotMatch(shorts, /\/api\/descript|\/api\/youtube/);
  // A title change must invalidate the metadata written for the previous one.
  assert.match(shorts, /const chooseTitle = /);
  assert.match(shorts, /delete next\[index\]/);
  // An SRT starts with a cue number: naming a project after line 1 would call it "1".
  assert.match(shorts, /!\/\^\\d\+\$\/\.test\(line\)/);
});

test("keeps Shorts styles scoped so the two pipelines can never collide", async () => {
  const shorts = await readFile(new URL("../app/shorts.css", import.meta.url), "utf8");
  const withoutComments = shorts.replace(/\/\*[\s\S]*?\*\//g, "");
  // Selectors only: drop declaration blocks, at-rule preludes and stray braces.
  // Commas inside :where()/:is() belong to one selector, so only split at depth 0.
  const splitTopLevel = prelude => {
    const parts = [];
    let depth = 0;
    let current = "";
    for (const character of prelude) {
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
      if (character === "," && depth === 0) { parts.push(current); current = ""; continue; }
      current += character;
    }
    parts.push(current);
    return parts.map(part => part.trim()).filter(Boolean);
  };
  const selectors = withoutComments
    .split("}")
    .map(block => block.split("{")[0].trim())
    .filter(Boolean)
    .flatMap(splitTopLevel)
    .filter(selector => !selector.startsWith("@"));
  for (const selector of selectors) {
    assert.ok(
      selector.startsWith(".pipeline-shorts"),
      `app/shorts.css must scope every selector under .pipeline-shorts, found: ${selector}`,
    );
  }
  // Redefining a shared token here would repaint the shell that both pipelines use.
  for (const shared of ["--ink:", "--muted:", "--line:", "--bg:", "--green:", "--orange:", "--nav:"]) {
    assert.doesNotMatch(withoutComments, new RegExp(shared.replace("--", "--")), `app/shorts.css must not redefine the shared token ${shared}`);
  }
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /import "\.\/shorts\.css"/);
});

test("never accepts a client-supplied API key and never invents an identity", async () => {
  const apiDir = new URL("../app/api/", import.meta.url);
  const routes = (await readdir(apiDir, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name === "route.ts")
    .map(entry => join(entry.parentPath ?? entry.path, entry.name));
  assert.ok(routes.length >= 10, "expected the API surface to be discovered");
  const spenders = [];
  for (const file of routes) {
    const source = await readFile(file, "utf8");
    const name = file.replace(/\\/g, "/").split("/app/api/")[1];
    // A key in the request body would mean the browser still holds it.
    assert.doesNotMatch(source, /apiKey\?: string/, `${name} declares apiKey in its request body`);
    // A shared fallback identity would let an anonymous caller spend someone else's credits.
    assert.doesNotMatch(source, /"local-preview"/, `${name} falls back to a shared identity`);
    if (/openrouter\.ai|api\.openai\.com/.test(source) && name !== "integrations/route.ts" && name !== "openrouter-models/route.ts") {
      spenders.push(name);
      assert.match(source, /requireApiKey\(/, `${name} spends credits without resolving a per-user key`);
    }
  }
  assert.ok(spenders.length >= 5, `expected several credential-spending routes, found ${spenders.join(", ")}`);
  const secrets = await readFile(new URL("../app/server/secrets.ts", import.meta.url), "utf8");
  assert.match(secrets, /AES-GCM/);
  assert.match(secrets, /additionalData/);
  assert.match(secrets, /settings_encryption_key_missing/);
  // The environment fallback must stay admin-only, or anonymous callers spend the deployment's keys.
  assert.match(secrets, /isAdminUser\(userId\) \? environmentValue\(service\) : ""/);
});

test("bounds every AI call and resumes an interrupted body without losing paid chapters", async () => {
  const [studio, writeRoute, hookRoute, chaptersRoute, packagingRoute, conceptRoute] = await Promise.all([
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/studio-write/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/studio-hook/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/studio-chapters/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openrouter-generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/concept-prompt/route.ts", import.meta.url), "utf8"),
  ]);
  // Every route that spends money must carry its own deadline.
  for (const route of [writeRoute, hookRoute, chaptersRoute, packagingRoute, conceptRoute]) {
    assert.match(route, /AbortSignal\.timeout\(/);
  }
  assert.match(writeRoute, /openrouter_timeout/);
  assert.match(hookRoute, /openrouter_timeout/);
  assert.match(packagingRoute, /openrouter_timeout/);
  // Client: retry with backoff, network-failure wording, and chapter-by-chapter resume.
  assert.match(studio, /postJsonWithRetry/);
  assert.match(studio, /const RETRY_DELAYS = /);
  assert.match(studio, /connectionLostMessage/);
  assert.match(studio, /bodySections/);
  assert.match(studio, /reprendra au chapitre/);
  // The assembled heading format is what step 6 and the timecode estimator both parse.
  assert.match(studio, /CHAPITRE \$\{index \+ 1\} — \$\{chapters\[index\]\.title\.toUpperCase\(\)\}/);
  assert.match(studio, /project\.body\.split\(\/CHAPITRE\\s\+\\d\+\/i\)/);
});

test("turns server error codes into an instruction, never a bare code", async () => {
  const { serverErrorMessage } = await import("../app/lib/errors.ts");
  // The failure the user actually hit: a missing key announced as
  // "OpenRouter : integration_not_configured", which names the problem and not the fix.
  const missing = serverErrorMessage(new Error("integration_not_configured"), "fr", "openrouter");
  assert.match(missing, /OpenRouter/);
  assert.match(missing, /Clés & connexions/);
  assert.doesNotMatch(missing, /integration_not_configured/);
  assert.match(serverErrorMessage(new Error("integration_not_configured"), "en", "openai"), /Keys & connections/);
  // The screen it sends the user to must exist under that exact name, or the
  // instruction is confidently wrong.
  const [errors, studio, shortsStudio, shortsExpress] = await Promise.all([
    readFile(new URL("../app/lib/errors.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/shorts-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/shorts-express.tsx", import.meta.url), "utf8"),
  ]);
  for (const [menu, settings] of [["fr", "Ma chaîne & réglages"], ["en", "My channel & settings"]]) {
    assert.ok(errors.includes(settings), `errors.ts points at a settings screen named otherwise (${menu})`);
    assert.ok(studio.includes(`profile: "${settings}"`), `the ${menu} menu no longer carries that name`);
  }
  // A sentence the server already wrote in the user's language passes through untouched.
  const written = "La génération du packaging a dépassé le délai autorisé. Relancez la génération.";
  assert.equal(serverErrorMessage(new Error(written), "fr", "openrouter"), written);
  // An unrecognised code still names the service and stays readable.
  assert.equal(serverErrorMessage(new Error("some_new_code"), "fr", "openai"), "OpenAI : erreur some_new_code.");
  assert.match(serverErrorMessage(new TypeError("Failed to fetch"), "fr"), /connexion au serveur/);
  // No AI call site may format a raw code into an alert again.
  for (const [name, source] of [["script-studio", studio], ["shorts-studio", shortsStudio], ["shorts-express", shortsExpress]]) {
    const rawInAlert = source.match(/showToast\([^;]*error instanceof Error \? error\.message/g) ?? [];
    assert.deepEqual(rawInAlert, [], `${name} shows a raw server code in an alert`);
  }
});

test("asks for the headline without forbidding it in the same prompt", async () => {
  const { allowHeadlineText, headlineDirective } = await import("../app/server/headline.ts");
  // The concept prompts end with this ban, written when the headline was going to be
  // added outside the image. The composer asked for a large headline right after it.
  const concept = "Create a high-contrast 16:9 YouTube thumbnail. Leave a large clean area on the upper right for the separate headline. No text, no letters, no numbers, no logo, no watermark, no brand marks.";
  const cleaned = allowHeadlineText(concept);
  assert.doesNotMatch(cleaned, /no text|no letters|no numbers/i);
  // Everything that is not about lettering survives, including the reserved area.
  // Re-capitalised, because dropping the ban promoted it to the head of the sentence.
  assert.match(cleaned, /No logo, no watermark, no brand marks\./);
  assert.match(cleaned, /large clean area on the upper right/);
  // A ban that carries composition with it is left alone; the override settles it.
  const composition = "Use a clean background with no text overlay and a bright green glow.";
  assert.equal(allowHeadlineText(composition), composition);
  // Dropping the closing clause must not take the full stop with it.
  assert.equal(allowHeadlineText("Cinematic close-up, dramatic rim light, no lettering."), "Cinematic close-up, dramatic rim light.");

  const directive = headlineDirective('Luna 5.6 GRATUIT ?', "Envol IA");
  // French headlines are where an image model drifts: it translates, or drops accents.
  assert.match(directive, /character for character/);
  assert.match(directive, /every accent and punctuation mark/);
  assert.match(directive, /Do not translate any of this text/);
  assert.match(directive, /"Luna 5\.6 GRATUIT \?"/);
  assert.match(directive, /"Envol IA"/);
  assert.match(directive, /120 pixels wide/);
  // The model may render the supporting text a concept asks for — a badge, a number —
  // but only what the concept quotes, so it never invents lettering of its own.
  assert.match(directive, /Any further words the composition quotes/);
  assert.match(directive, /no invented lettering/);

  const [image, packaging, shortsExpress, conceptPrompt] = await Promise.all([
    readFile(new URL("../app/api/openai-image/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openrouter-generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/shorts-express/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/concept-prompt/route.ts", import.meta.url), "utf8"),
  ]);
  // No generator may go back to asking for text-free prompts while the model renders text.
  for (const [name, route] of [["packaging", packaging], ["shorts-express", shortsExpress], ["concept-prompt", conceptPrompt]]) {
    assert.doesNotMatch(route, /no text because|no lettering because|no text, no lettering/i, `${name} still orders text-free prompts`);
    assert.match(route, /rendered into the image/, `${name} does not say the headline is rendered`);
    // On-image words must be quoted and written in the viewer's language, or a French
    // thumbnail comes back carrying an English badge.
    assert.match(route, /quoted exactly and written in \$\{language\}/, `${name} does not fix the language of on-image text`);
  }
  // The presenter override has to stay last, or an editorial system prompt written for
  // stock people erases the channel's own face.
  // The whole line: the template literal nests backticks, so a lazy match truncates it
  // and every indexOf below silently returns -1.
  const composed = image.match(/^ *const composedPrompt = .*$/m)[0];
  assert.ok(composed.includes("headlineDirective") && composed.includes("presenterBrief"), "composed prompt not captured");
  assert.ok(composed.indexOf("headlineDirective") < composed.indexOf("presenterBrief"), "the presenter requirement must come last");
  assert.doesNotMatch(composed, /Add the exact large headline/);
});

test("makes the photograph the only source of the presenter's face", async () => {
  const { presenterBrief } = await import("../app/server/image-framing.ts");
  const [image] = await Promise.all([readFile(new URL("../app/api/openai-image/route.ts", import.meta.url), "utf8")]);
  for (const pipeline of ["script", "shorts"]) {
    const brief = presenterBrief(pipeline);
    // The face came back generic because a written description — "a bald African man
    // with thick-frame glasses" — is easier to satisfy than a photograph, and describes
    // a type. The photograph has to outrank the words explicitly.
    assert.match(brief, /ONLY source of their face/);
    assert.match(brief, /wherever words and the photograph disagree, the photograph wins/);
    assert.match(brief, /generic person who merely fits it/);
    // Style references are past thumbnails: their people are rendered, not photographed.
    assert.match(brief, /take no face, no person and no likeness from them/);
    // The eyewear is the detail that gave the substitution away.
    assert.match(brief, /same frame shape, same colour, same thickness/);
  }
  // gpt-image-1.5 defaults to low fidelity, which loses a face; gpt-image-2 is always
  // high and rejects the parameter outright.
  assert.match(image, /if \(model === "gpt-image-1\.5"\) form\.append\("input_fidelity", "high"\)/);
  assert.doesNotMatch(image, /gpt-image-2"\)\s*form\.append\("input_fidelity"/);
  // A real face to preserve buys fewer competing style images.
  assert.match(image, /const styleBudget = presenterKey \? 2 : 4/);
});

test("accepts the presenter photo, which lives under its own prefix", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("presenter-ownership-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const call = (payload) => worker.fetch(
    new Request("http://localhost/api/openai-image", { method: "POST", headers: signedIn, body: JSON.stringify(payload) }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  const base = { model: "gpt-image-2", pipeline: "script", prompt: "A polished thumbnail of a padlock beside a laptop." };
  const mine = "presenter-photo/test-user/face.jpg";
  const myStyle = "reference-thumbnails/test-user/style.png";

  // The bug: both kinds were checked against the reference-thumbnails prefix, so every
  // request carrying a face was refused — the only requests that could produce a likeness.
  const withFace = await call({ ...base, presenterKey: mine, referenceKeys: [myStyle] });
  assert.notEqual(withFace.status, 403, "the user's own presenter photo must not be refused");

  // Ownership still holds on both sides, each against the prefix of its own kind.
  for (const [label, payload] of [
    ["another account's photo", { ...base, presenterKey: "presenter-photo/someone-else/face.jpg" }],
    ["another account's style image", { ...base, referenceKeys: ["reference-thumbnails/someone-else/style.png"] }],
    // A style key passed off as the presenter must not inherit the presenter's prefix.
    ["a style key smuggled in as the presenter", { ...base, presenterKey: myStyle }],
  ]) {
    const response = await call(payload);
    assert.equal(response.status, 403, `${label} must be refused`);
    assert.equal((await response.json()).error, "reference_forbidden");
  }
});

test("exports the whole project as a Word document built for copy-paste", async () => {
  const [word, studio, logoRoute, packageJson] = await Promise.all([
    readFile(new URL("../app/lib/word-export.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/brand-logo/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  // The old export wrote three headings and told the reader to go look in the app.
  assert.doesNotMatch(studio, /Voir les options A\/B\/C dans YoutubeMate/);
  assert.doesNotMatch(studio, /text\/markdown;charset=utf-8/);
  assert.match(studio, /\.docx`/);
  // Every stage of the work has to appear, not just the script.
  for (const section of [
    "Recherche & angle", "Hook & promesse", "Plan de chapitres", "Script complet",
    "Conclusion & CTA", "Timecodes de chapitres", "Packaging — test A/B/C",
    "Description YouTube", "Tags", "Commentaire à épingler", "Quiz",
  ]) assert.ok(word.includes(section), `the document is missing "${section}"`);
  // Copy-paste is the point: pasted blocks carry no bullet or marker, and each line is
  // its own plain paragraph so a selection yields exactly what the YouTube field wants.
  assert.match(word, /function copyBlock/);
  assert.doesNotMatch(word, /bullet:/);
  // Real Word headings, so the navigation pane mirrors the chapter plan.
  assert.match(word, /HeadingLevel\.HEADING_1/);
  assert.match(word, /HeadingLevel\.HEADING_2/);
  assert.match(studio, /project\.body\.split\(\/\^\(CHAPITRE/);
  // Branding: the logo is embedded, and the document still works without one.
  assert.match(word, /ImageRun/);
  assert.match(word, /if \(input\.logo\)/);
  assert.match(word, /input\.company \|\| productName/);
  // Word embeds PNG and JPEG only; refusing anything else at upload beats a document
  // that silently comes out logo-less.
  assert.match(logoRoute, /new Set\(\["image\/png", "image\/jpeg"\]\)/);
  assert.match(logoRoute, /brand-logo\/\$\{encodeURIComponent/);
  // Loaded on demand, like the CapCut kit: only exporters pay for the writer.
  assert.match(studio, /await import\("\.\/lib\/word-export"\)/);
  assert.match(packageJson, /"docx"/);
});

test("appends the channel's default tags and trims from the end to fit YouTube's 500", async () => {
  const { mergeTags, TAG_LIMIT, parseTagList } = await import("../app/lib/tags.ts");
  assert.equal(TAG_LIMIT, 500);
  // YouTube caps the field at 500 characters, not 500 tags. What is counted is the exact
  // string the user pastes — joined by ", " — so the count is never under what YouTube
  // then rejects.
  const video = ["chatgpt luna", "luna 5.6"];
  const merged = mergeTags(video, "#ia, intelligence artificielle,\nchatgpt luna");
  assert.deepEqual(merged.tags, ["chatgpt luna", "luna 5.6", "ia", "intelligence artificielle"]);
  assert.equal(merged.characters, merged.tags.join(", ").length);
  assert.deepEqual(merged.dropped, []);
  // Commas and newlines both separate; a leading # is stripped; a repeat is dropped once.
  assert.deepEqual(parseTagList("#un, deux\ntrois,,  "), ["un", "deux", "trois"]);

  // Overflow: the video's own tags survive and the generic ones go, from the end.
  const many = Array.from({ length: 60 }, (_, index) => `tag generique numero ${index}`).join(",");
  const trimmed = mergeTags(video, many);
  assert.ok(trimmed.characters <= TAG_LIMIT, `${trimmed.characters} characters exceeds the limit`);
  assert.ok(trimmed.dropped.length > 0, "nothing was dropped despite the overflow");
  assert.deepEqual(trimmed.tags.slice(0, 2), video, "a video tag was sacrificed before a default");
  // Dropped from the end, so the last default is the first to go.
  assert.equal(trimmed.dropped[0], "tag generique numero 59");
  // One more tag would have broken the limit: the trim stops at the last one that fits.
  assert.ok([...trimmed.tags, trimmed.dropped[trimmed.dropped.length - 1]].join(", ").length > TAG_LIMIT);

  const [word, studio] = await Promise.all([
    readFile(new URL("../app/lib/word-export.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
  ]);
  // What was cut is written into the document rather than dropped in silence.
  assert.match(word, /merged\.dropped\.length/);
  assert.match(word, /retirés pour tenir dans la limite/);
  assert.match(studio, /mergeTags\(pack\.tags, profile\.defaultTags \?\? ""\)/);
  // The profile carries the defaults and shows the budget they already spend.
  assert.match(studio, /defaultTags\?: string;/);
  assert.match(studio, /Tags par défaut de la chaîne/);
  assert.match(studio, /defaultTagBudget/);
});

test("prices every paid call from the provider's own figures", async () => {
  const { openRouterUsage, openAiImageUsage } = await import("../app/server/pricing.ts");
  // OpenRouter returns the amount it charged on every response, with no request
  // parameter — so the ledger takes its figure rather than a rate table that can go stale.
  const router = openRouterUsage({
    usage: { cost: 0.0412, prompt_tokens: 8_000, completion_tokens: 2_400,
      prompt_tokens_details: { cached_tokens: 1_500 }, completion_tokens_details: { reasoning_tokens: 900 } },
  }, "openai/gpt-5.6-sol");
  assert.equal(router.cost, 0.0412);
  assert.equal(router.cachedTokens, 1_500);
  assert.equal(router.reasoningTokens, 900);
  // A response without usage must price at zero, never NaN — a NaN would poison every
  // SUM in the ledger from that row onwards.
  const empty = openRouterUsage({}, "m");
  assert.equal(empty.cost, 0);
  assert.ok(Number.isFinite(openRouterUsage({ usage: { cost: "oops" } }, "m").cost));

  // The images endpoint bills tokens and returns no cost, so this one is computed:
  // $5/M text in, $8/M image in, $2/M cached, $30/M out for gpt-image-2.
  const image = openAiImageUsage({
    input_tokens: 3_000, output_tokens: 1_600,
    input_tokens_details: { text_tokens: 1_000, image_tokens: 2_000, cached_tokens: 500 },
  }, "gpt-image-2");
  // 1000 text + 2000 image = the 3000 input tokens, of which 500 are cached and billed
  // at the cache rate, leaving 1500 image tokens at the full one.
  const expected = (1_000 * 5 + 1_500 * 8 + 500 * 2 + 1_600 * 30) / 1_000_000;
  assert.ok(Math.abs(image.cost - expected) < 1e-9, `${image.cost} != ${expected}`);
  // gpt-image-1.5 costs more on output, so the same tokens must not price the same.
  assert.ok(openAiImageUsage({ input_tokens: 0, output_tokens: 1_000 }, "gpt-image-1.5").cost
    > openAiImageUsage({ input_tokens: 0, output_tokens: 1_000 }, "gpt-image-2").cost);
  // An undocumented split is billed at the cheapest rate: an unknown must not inflate
  // the figure the user is shown.
  assert.equal(openAiImageUsage({ input_tokens: 1_000, output_tokens: 0 }, "gpt-image-2").cost, 1_000 * 5 / 1_000_000);

  const { formatCost, formatTokens } = await import("../app/lib/money.ts");
  // A single call costs fractions of a cent; two decimals would print $0.00 against
  // real spending.
  assert.equal(formatCost(0.00042), "$0.0004");
  assert.equal(formatCost(0.043), "$0.043");
  assert.equal(formatCost(12.5), "$12.50");
  assert.equal(formatCost(0), "$0");
  assert.equal(formatTokens(1_500), "1.5k");
  assert.equal(formatTokens(2_400_000), "2.4M");
});

test("keeps the credits ledger per user and per project", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("usage-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const asUser = (user) => ({ "content-type": "application/json", "oai-authenticated-user-id": user });

  const ledger = async (user) => {
    const response = await worker.fetch(new Request("http://localhost/api/usage", { headers: asUser(user) }), env, ctx);
    return { status: response.status, body: await response.json() };
  };
  const mine = await ledger(TEST_USER);
  // Without D1 wired in this harness the route answers 503 rather than throwing; either
  // way it must never answer with another account's figures.
  assert.ok([200, 503].includes(mine.status), `unexpected status ${mine.status}`);
  if (mine.status === 200) {
    for (const key of ["total", "byProject", "byProjectAction", "byModel", "recent"]) {
      assert.ok(key in mine.body, `the ledger is missing ${key}`);
    }
  }
  // Anonymous callers get nothing: spending is per identity.
  const anonymous = await worker.fetch(new Request("http://localhost/api/usage"), env, ctx);
  assert.equal(anonymous.status, 401);
  const anonymousDelete = await worker.fetch(new Request("http://localhost/api/usage", { method: "DELETE" }), env, ctx);
  assert.equal(anonymousDelete.status, 401);

  const [usage, schema, studio, imageRoute, packagingRoute] = await Promise.all([
    readFile(new URL("../app/server/usage.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openai-image/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openrouter-generate/route.ts", import.meta.url), "utf8"),
  ]);
  // Accounting must never sink a generation that already succeeded and was already paid.
  assert.match(usage, /export async function recordUsage[\s\S]*?try \{[\s\S]*?\} catch \{/);
  // The title is copied into the row: renaming or deleting a project must not rewrite
  // what it already cost.
  assert.match(schema, /projectTitle: text\("project_title"\)/);
  // Every paid route records, and the client names the project it is spending on.
  for (const [name, route] of [["images", imageRoute], ["packaging", packagingRoute]]) {
    assert.match(route, /await recordUsage\(/, `${name} does not record its spending`);
  }
  assert.match(studio, /projectId: project\.id, projectTitle: project\.title/);
  assert.match(studio, /view === "usage" && <CreditsUsage/);
  assert.match(studio, /usage: "Credits Usage"/);
});

test("arrives at step 7 with the publishing checklist already ticked", async () => {
  const studio = await readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8");
  // The boxes were bare inputs: unticked on arrival, and their state lived nowhere, so
  // an untick vanished on the next reload.
  assert.doesNotMatch(studio, /"Titre", "Description & liens"/);
  assert.doesNotMatch(studio, /<input type="checkbox" \/>/);
  // Ticked unless the project says otherwise, and an untick is written down.
  assert.match(studio, /project\.publishChecklist\?\.\[item\.key\] \?\? true/);
  assert.match(studio, /updateProject\(\{ publishChecklist:/);
  assert.match(studio, /publishChecklist\?: Record<string, boolean>;/);
  // Stable keys and both languages: the labels used to be French even in English.
  for (const [key, en] of [["title", "Title"], ["description", "Description & links"], ["thumbnail", "Thumbnail at 120 px"],
    ["chapters", "Chapters"], ["subtitles", "Subtitles"], ["pinned", "Pinned comment"], ["abtest", "A/B test"], ["ctr", "CTR at 24–48 h"]]) {
    assert.match(studio, new RegExp(`key: "${key}"`), `the checklist lost the ${key} item`);
    assert.ok(studio.includes(`en: "${en}"`), `${key} has no English label`);
  }
  // migrateProject rebuilds every project from an allow-list, so a field missing from it
  // is wiped on each load no matter how carefully it was saved. That is what swallowed
  // the first version of this checklist.
  const migrate = studio.slice(studio.indexOf("function migrateProject"));
  const base = migrate.slice(migrate.indexOf("const base: Project"), migrate.indexOf("return base;"));
  const projectType = studio.slice(studio.indexOf("type Project = {"), studio.indexOf("type ThumbnailConcept"));
  const optional = [...projectType.matchAll(/(\w+)\?:/g)].map(match => match[1]);
  for (const field of optional) {
    assert.ok(base.includes(`${field}:`), `migrateProject drops the optional field "${field}" on every load`);
  }
  assert.ok(optional.includes("publishChecklist"), "the checklist field left the Project type");
});

test("names the product from one module, and only from there", async () => {
  const config = await readFile(new URL("../app/config/product.ts", import.meta.url), "utf8");
  assert.match(config, /name: "CreatorMate"/);
  // The repository was renamed, so GitHub redirects the old URL — but that redirect dies
  // the day anyone creates a repository under the old name, including by accident. Every
  // link has to name the current one.
  const repoLinks = await Promise.all(["../app/config/product.ts", "../README.md", "../README.fr.md",
    "../SECURITY.md", "../.github/ISSUE_TEMPLATE/config.yml"].map(file => readFile(new URL(file, import.meta.url), "utf8")));
  for (const [index, file] of repoLinks.entries()) {
    assert.doesNotMatch(file, /github\.com\/bkourouma\/YoutubeMate/, `file ${index} still links to the old repository name`);
  }
  assert.match(config, /github\.com\/bkourouma\/CreatorMate/);
  // The former name survives only as a labelled historical fact.
  assert.match(config, /formerName: "YoutubeMate"/);
  // Google's branding guidelines forbid "YouTube" or a variant in an application's
  // overall name: https://developers.google.com/youtube/terms/branding-guidelines
  // Only the values matter: the doc comment and `formerName` are meant to record that the
  // product used to be called something else, and the repository URL still is.
  const values = config.slice(config.indexOf("export const product")).replace(/formerName:[^\n]*/, "").replace(/repositoryUrl:[^\n]*/, "").replace(/supportUrl:[^\n]*/, "");
  assert.doesNotMatch(values, /YoutubeMate/);
  assert.match(config, /formerName: "YoutubeMate"/, "the former name must stay recorded for migration notes");

  const files = await readdir(new URL("../app/", import.meta.url), { recursive: true });
  const sources = files.filter(name => /\.tsx?$/.test(String(name)));
  const offenders = [];
  const posix = name => String(name).split("\\").join("/");
  for (const name of sources) {
    if (posix(name) === "config/product.ts") continue;
    const source = await readFile(new URL(`../app/${posix(name)}`, import.meta.url), "utf8");
    // Hard-coded product names are what makes a rename a hunt. The config module is the
    // single exception, and it keeps the former name for migration notes.
    if (/YoutubeMate|YouTubeMate/.test(source)) offenders.push(posix(name));
  }
  assert.deepEqual(offenders, [], `these files still hard-code the old product name: ${offenders.join(", ")}`);

  // Rendered output carries the new name, and the package is renamed without publishing.
  const html = await (await render()).text();
  assert.match(html, /CreatorMate/);
  assert.doesNotMatch(html, /YoutubeMate/);
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.name, "creatormate");
  assert.notEqual(packageJson.private, false, "the package must not become publishable by this rename");

  // References to YouTube that mean the platform, its API or its rules must survive:
  // renaming a third-party API would imply it belongs to this product.
  const studio = await readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8");
  assert.match(studio, /YouTube/);
  const checklist = await readFile(new URL("../docs/BRAND_RENAME_CHECKLIST.md", import.meta.url), "utf8");
  // The rename is not "done" until things outside this repository are done too.
  for (const external of ["GitHub", "OAuth", "domain", "npm"]) {
    assert.ok(checklist.includes(external), `the checklist does not mention ${external}`);
  }
});

test("decides where an identity may come from, and refuses every other source", { concurrency: false }, async () => {
  const { resolveAuthMode, providerFor, devUserId, TRUSTED_PROXY_HEADER } = await import("../app/server/auth.ts");
  const saved = { mode: process.env.AUTH_MODE, dev: process.env.DEV_USER_ID, node: process.env.NODE_ENV };
  const headersWith = value => ({ get: name => (name === TRUSTED_PROXY_HEADER ? value : null) });
  try {
    // Default: the contract the app is deployed under today. This refactor must not take
    // the running deployment down.
    delete process.env.AUTH_MODE;
    assert.equal(resolveAuthMode(), "trusted-proxy-header");
    assert.equal(providerFor("trusted-proxy-header").identify(headersWith("someone")), "someone");
    // An unrecognised value must not silently widen trust either way.
    process.env.AUTH_MODE = "whatever";
    assert.equal(resolveAuthMode(), "trusted-proxy-header");

    // Outside that mode the header is attacker-controlled, so it is ignored — this is the
    // whole point: the same code deployed elsewhere used to accept it from anyone.
    process.env.NODE_ENV = "development";
    process.env.DEV_USER_ID = "local-dev";
    assert.equal(providerFor("dev").identify(headersWith("attacker")), "local-dev");
    // No hosted provider has been chosen, so that mode hands out nothing at all.
    assert.equal(providerFor("hosted-session").identify(headersWith("attacker")), null);

    // DEV_USER_ID stands in for the entire authentication layer. In production it would
    // give every anonymous visitor the same identity — and that identity's stored keys.
    process.env.NODE_ENV = "production";
    assert.equal(devUserId(), null, "DEV_USER_ID must be refused in production");
    assert.equal(providerFor("dev").identify(headersWith("attacker")), null);
    process.env.NODE_ENV = "development";
    assert.equal(devUserId(), "local-dev");
  } finally {
    if (saved.mode === undefined) delete process.env.AUTH_MODE; else process.env.AUTH_MODE = saved.mode;
    if (saved.dev === undefined) delete process.env.DEV_USER_ID; else process.env.DEV_USER_ID = saved.dev;
    if (saved.node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = saved.node;
  }

  // End to end: a public request carrying no identity gets nothing from a paid route.
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("auth-boundary-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  for (const path of ["/api/openrouter-generate", "/api/openai-image", "/api/shorts-analyze"]) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    }), env, ctx);
    assert.equal(response.status, 401, `${path} answered ${response.status} without an identity`);
    assert.equal((await response.json()).error, "authentication_required");
  }

  const identity = await readFile(new URL("../app/server/identity.ts", import.meta.url), "utf8");
  // The header must be read through the provider, never directly, or the boundary leaks.
  assert.doesNotMatch(identity, /"oai-authenticated-user-id"/);
  assert.match(identity, /providerFor\(mode\)\.identify/);
  assert.doesNotMatch(identity, /process\.env\.DEV_USER_ID/);
});

test("gives the YouTube grant back on disconnect, and drops a dead refresh token", async () => {
  const youtube = await readFile(new URL("../app/server/youtube.ts", import.meta.url), "utf8");
  const integrations = await readFile(new URL("../app/api/integrations/route.ts", import.meta.url), "utf8");

  // Disconnecting used to delete the local row only, leaving the grant standing in the
  // user's Google account: gone from our side, still listed in theirs.
  assert.match(youtube, /oauth2\.googleapis\.com\/revoke/);
  const disconnect = youtube.slice(youtube.indexOf("export async function disconnectYoutube"), youtube.indexOf("async function forgetInvalidGrant"));
  // Revocation is attempted first, but the local delete runs whatever Google answers:
  // a network failure at Google must not leave a user unable to disconnect.
  assert.ok(disconnect.indexOf("/revoke") < disconnect.indexOf("delete(youtubeAuth)"), "revocation must be attempted before the local purge");
  assert.match(disconnect, /await \(await getDb\(\)\)\.delete\(youtubeAuth\)/);
  assert.match(disconnect, /catch \{\s*revoked = "remote_failed";/);
  // 400 means the token was already invalid, which is the outcome we wanted anyway.
  assert.match(disconnect, /response\.status === 400 \? "revoked"/);
  // The outcome is reported; the token is not.
  assert.match(integrations, /revoked, integrations:/);
  // The status is a fixed vocabulary, never the upstream body, which could echo the token.
  for (const outcome of ["revoked", "not_connected", "remote_failed"]) assert.ok(disconnect.includes(`"${outcome}"`));
  assert.doesNotMatch(integrations, /refreshToken|refresh_token/);

  // invalid_grant is terminal. Keeping the row means every later call fails the same way
  // while the interface still claims to be connected.
  assert.match(youtube, /data\.error === "invalid_grant"/);
  const refresh = youtube.slice(youtube.indexOf("export async function getAccessToken"));
  assert.ok(refresh.indexOf("forgetInvalidGrant") < refresh.indexOf("return data.access_token"), "invalid_grant must drop the connection before returning");
  // The refresh token is decrypted in one place, so neither path can print it by accident.
  assert.match(youtube, /async function storedRefreshToken/);
  assert.doesNotMatch(youtube, /console\.(log|error|warn)/);
  // The scope stays minimal: uploading is all this product does with the account.
  assert.match(youtube, /youtube\.upload/);
  assert.doesNotMatch(youtube, /youtube\.force-ssl|youtubepartner|youtube\.readonly/);
});

test("holds the Descript contract: one composition per short, source untouched, no token leak", { concurrency: false }, async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("descript-contract-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const call = (path, init) => worker.fetch(new Request(`http://localhost${path}`, init), env, ctx);

  const originalFetch = globalThis.fetch;
  const seen = [];
  const upstream = (handler) => {
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("descriptapi.com") || url.includes("googleapis.com")) {
        seen.push({ url, method: init?.method ?? "GET", headers: init?.headers ?? {}, body: init?.body });
        const answer = handler(url, init);
        if (answer) return answer;
      }
      return originalFetch(input, init);
    };
  };

  try {
    // Listing projects.
    upstream(url => url.includes("/v1/projects?") ? Response.json({ projects: [{ id: "proj-1", name: "Luna" }, { id: "proj-2", name: "WhatsApp" }] }) : null);
    const list = await call("/api/shorts-descript", { headers: signedIn });
    assert.equal(list.status, 200);
    assert.equal((await list.json()).projects.length, 2);
    // The token travels in a header, never in the URL, where every proxy would log it.
    const listed = seen.find(entry => entry.url.includes("/v1/projects?"));
    assert.doesNotMatch(listed.url, /test-descript-token/);

    // A projectId is validated before it can reshape a URL.
    seen.length = 0;
    for (const bad of ["../../admin", "proj 1", "proj/1", "a".repeat(65), ""]) {
      const response = await call("/api/shorts-descript", {
        method: "POST", headers: signedIn,
        body: JSON.stringify({ action: "create_compositions", projectId: bad, shorts: [{ title: "T", sequences: [] }] }),
      });
      assert.equal(response.status, 400, `projectId "${bad}" was not rejected`);
      assert.equal((await response.json()).error, "invalid_project_id");
    }
    assert.deepEqual(seen, [], "a rejected projectId must never reach Descript");

    // Creating one composition per short.
    seen.length = 0;
    upstream(url => {
      if (url.includes("/v1/agent/models")) return Response.json({ models: [{ id: "m1", name: "fast", cost_tier: "low" }] });
      if (url.includes("/v1/projects/")) return Response.json({ id: "proj-1", medias: [] });
      if (url.includes("/agent")) return Response.json({ job_id: "job-1", job_state: "queued" });
      return null;
    });
    const shorts = [
      // Non-consecutive ranges: the gap between them must not be included.
      { title: "Luna est gratuit", durationMinutes: 2, sequences: [{ startTime: "00:12", endTime: "00:48" }, { startTime: "03:10", endTime: "03:52" }] },
      { title: "Ce qui reste bloque", durationMinutes: 1, sequences: [{ startTime: "05:00", endTime: "05:40" }] },
    ];
    const created = await call("/api/shorts-descript", {
      method: "POST", headers: signedIn,
      body: JSON.stringify({ action: "create_compositions", projectId: "proj-1", includeCtaVideo: false, shorts }),
    });
    assert.equal(created.status, 200);
    assert.equal((await created.json()).job_id, "job-1");

    const agentCall = seen.find(entry => entry.url.includes("/agent") && entry.method === "POST");
    assert.ok(agentCall, "no agent request was made");
    const prompt = JSON.parse(String(agentCall.body)).prompt ?? String(agentCall.body);
    // One composition per short, and the source explicitly protected: the difference
    // between adding to a project and destroying the user's own edit.
    assert.match(prompt, /exactement 2 nouvelles compositions/);
    assert.ok(prompt.includes("sans alt"), "the prompt no longer protects the source composition");
    // Named with the selected titles, which is what the upload matches on later.
    for (const short of shorts) assert.ok(prompt.includes(short.title), `the prompt lost the title "${short.title}"`);
    // Every range travels, in order, with the gaps excluded.
    for (const time of ["00:12", "00:48", "03:10", "03:52", "05:00", "05:40"]) assert.ok(prompt.includes(time), `timecode ${time} was dropped`);
    assert.ok(prompt.includes("intervalles"), "the instruction to skip the gaps is gone");
    // The CTA was not asked for, so it must not be mentioned.
    assert.doesNotMatch(prompt, /SHORT CTA/);
    // The token is in the header, not in the body or the URL.
    assert.doesNotMatch(String(agentCall.body), /test-descript-token/);
    assert.doesNotMatch(agentCall.url, /test-descript-token/);

    // The CTA is opt-in. The project already holds the clip, which is the second-run
    // case and also proves the media is never imported — or paid for — twice.
    seen.length = 0;
    upstream(url => {
      if (url.includes("/v1/agent/models")) return Response.json({ models: [{ id: "m1", name: "fast", cost_tier: "low" }] });
      if (url.includes("/v1/projects/")) return Response.json({ id: "proj-1", media_files: { "SHORT CTA.mp4": {} } });
      if (url.includes("/agent")) return Response.json({ job_id: "job-2", job_state: "queued" });
      return null;
    });
    // The CTA clip is fetched by Descript from a URL we hand it, so that URL must come
    // from configuration and never from the request's own Host header.
    const savedOrigin = process.env.PUBLIC_APP_ORIGIN;
    delete process.env.PUBLIC_APP_ORIGIN;
    const noOrigin = await call("/api/shorts-descript", {
      method: "POST", headers: signedIn,
      body: JSON.stringify({ action: "create_compositions", projectId: "proj-1", includeCtaVideo: true, shorts }),
    });
    assert.equal(noOrigin.status, 503);
    assert.equal((await noOrigin.json()).error, "public_origin_not_configured");

    process.env.PUBLIC_APP_ORIGIN = "https://studio.example";
    const withCta = await call("/api/shorts-descript", {
      method: "POST", headers: signedIn,
      body: JSON.stringify({ action: "create_compositions", projectId: "proj-1", includeCtaVideo: true, shorts }),
    });
    if (savedOrigin === undefined) delete process.env.PUBLIC_APP_ORIGIN; else process.env.PUBLIC_APP_ORIGIN = savedOrigin;
    assert.equal(withCta.status, 200);
    const ctaPrompt = JSON.parse(String(seen.find(entry => entry.url.includes("/agent") && entry.method === "POST")?.body ?? "{}")).prompt ?? "";
    assert.match(ctaPrompt, /SHORT CTA/);

    // Uploading establishes both credentials before touching anything, so a missing
    // YouTube connection cannot leave a half-rendered composition behind. This harness
    // has no D1 binding and therefore no stored YouTube grant, which is exactly the
    // state being asserted here.
    seen.length = 0;
    upstream(url => {
      if (url.includes("descriptapi.com/v1/projects/")) return Response.json({ id: "proj-1", compositions: [{ id: "c1", name: "Un autre nom" }] });
      return null;
    });
    const upload = await call("/api/shorts-upload", {
      method: "POST", headers: signedIn,
      body: JSON.stringify({ projectId: "proj-1", title: "Luna est gratuit", description: "d", tags: ["a"] }),
    });
    assert.ok([502, 503].includes(upload.status), `expected a closed failure, got ${upload.status}`);
    const body = await upload.json();
    assert.ok(["youtube_not_connected", "youtube_token_unavailable"].includes(body.error), `unexpected error ${body.error}`);
    assert.deepEqual(seen, [], "no render may be requested before both credentials are held");
    // Whatever the failure, no credential is echoed back to the caller.
    assert.doesNotMatch(JSON.stringify(body), /test-descript-token|Bearer/);
  } finally {
    globalThis.fetch = originalFetch;
  }

  // Contract properties that are structural rather than per-request.
  const [descript, upload, poll] = await Promise.all([
    readFile(new URL("../app/api/shorts-descript/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/shorts-upload/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/server/poll.ts", import.meta.url), "utf8"),
  ]);
  // An identical request inside the window must not re-run a paid agent job, and the
  // ledger is per user: without that, another account's job_id came back to poll.
  assert.match(descript, /const DEDUPE_WINDOW_MS/);
  assert.match(descript, /findRecentJob\(userId, key\)/);
  assert.match(descript, /fingerprint\(\{ version: PROMPT_VERSION, projectId, includeCtaVideo, briefs \}\)/);
  // Polling is bounded by wall-clock time and says so when it gives up.
  assert.match(poll, /PollTimeoutError/);
  assert.match(descript, /descript_timeout/);
  // One short per upload request: the original looped over every short inside a single
  // request, so a dropped connection lost every paid render.
  assert.doesNotMatch(upload, /shorts\?:\s*Array/);
  assert.match(upload, /privacyStatus: "private"/);
  assert.match(upload, /item\.name === title/);
  // Nothing in either module writes to the console, where a token would end up.
  for (const source of [descript, upload]) assert.doesNotMatch(source, /console\.(log|error|warn)/);
});

test("states the licence it is actually under, and keeps contributing cheap", async () => {
  const [licence, readmeEn, readmeFr, contributing, template] = await Promise.all([
    readFile(new URL("../LICENSE", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../README.fr.md", import.meta.url), "utf8"),
    readFile(new URL("../CONTRIBUTING.md", import.meta.url), "utf8"),
    readFile(new URL("../.github/PULL_REQUEST_TEMPLATE.md", import.meta.url), "utf8"),
  ]);
  // A public repository with no LICENSE grants nobody anything, whatever it looks like.
  assert.match(licence, /^MIT License/);
  assert.match(licence, /Copyright \(c\) \d{4} \S+/);
  assert.match(licence, /WITHOUT WARRANTY OF ANY KIND/);
  assert.doesNotMatch(licence, /AFFERO|GENERAL PUBLIC LICENSE/, "a copyleft licence is still in the file");
  for (const [name, readme] of [["en", readmeEn], ["fr", readmeFr]]) {
    assert.match(readme, /MIT/, `README.${name} does not state the licence`);
    assert.doesNotMatch(readme, /AGPL|no LICENSE file yet|pas encore de fichier LICENSE/, `README.${name} is stale on the licence`);
  }
  // MIT was chosen to get contributions, so the contributing path must stay one line: a
  // DCO sign-off, and explicitly no CLA to read.
  assert.match(contributing, /git commit -s/);
  assert.match(contributing, /Developer Certificate of\s+Origin/);
  assert.match(contributing, /no contributor licence agreement to read/i);
  assert.doesNotMatch(contributing, /no external contribution is being merged/, "contributions are open now");
  assert.match(template, /git commit -s/);
});

test("resolves a local identity without the proxy header, and never in production", async () => {
  // Tested against the module rather than the built worker: the bundler folds NODE_ENV to
  // a constant and eliminates the branch entirely — DEV_USER_ID does not appear anywhere
  // in dist/. That is a stronger guarantee than a runtime check, and it is also why the
  // built artifact cannot demonstrate the development side of this.
  const { providerFor, devUserId } = await import("../app/server/auth.ts");
  const noHeaders = { get: () => null };
  const withHeader = { get: name => (name === "oai-authenticated-user-id" ? "proxy-user" : null) };
  const previousUser = process.env.DEV_USER_ID;
  const previousEnv = process.env.NODE_ENV;
  try {
    process.env.DEV_USER_ID = "local-developer";
    delete process.env.NODE_ENV;
    // Nothing sets the header on a developer's machine. The first version of this refactor
    // dropped the fallback and 401'd every route locally, and every test passed anyway
    // because they all send the header.
    assert.equal(providerFor("trusted-proxy-header").identify(noHeaders), "local-developer");
    // A real header still wins over the fallback.
    assert.equal(providerFor("trusted-proxy-header").identify(withHeader), "proxy-user");
    // In dev mode the header is ignored outright: locally it is attacker-controlled.
    assert.equal(providerFor("dev").identify(withHeader), "local-developer");
    // No provider has been chosen for hosted sessions, so it fails closed rather than
    // guessing an id and handing out that account's encrypted keys.
    assert.equal(providerFor("hosted-session").identify(withHeader), null);

    process.env.NODE_ENV = "production";
    assert.equal(devUserId(), null, "DEV_USER_ID granted an identity in production");
    assert.equal(providerFor("trusted-proxy-header").identify(noHeaders), null);
    // The proxy header keeps working in production — that is the deployed contract.
    assert.equal(providerFor("trusted-proxy-header").identify(withHeader), "proxy-user");
  } finally {
    if (previousUser === undefined) delete process.env.DEV_USER_ID; else process.env.DEV_USER_ID = previousUser;
    if (previousEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnv;
  }
});

test("packages the video in English without waiting for a vidIQ sync", async () => {
  const [studio, route] = await Promise.all([
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/openrouter-generate/route.ts", import.meta.url), "utf8"),
  ]);
  // The model writes the English headline too, so a thumbnail can carry English text
  // rather than the French overlay, and it is rejected if it comes back missing.
  assert.match(route, /"englishOverlay": "THE SAME HEADLINE IN ENGLISH/);
  assert.match(route, /not a word-for-word translation/);
  assert.match(route, /typeof option\.englishOverlay === "string" && option\.englishOverlay\.trim\(\)/);

  // The English title and description already existed but only appeared after a vidIQ
  // sync, which needs a personal relay — so most runs generated them and never showed
  // them. The English package renders from the packaging alone.
  assert.match(studio, /function EnglishPackage/);
  assert.match(studio, /<EnglishPackage pack=\{pack\}/);
  const section = studio.slice(studio.indexOf("function EnglishPackage"), studio.indexOf("function Question"));
  assert.doesNotMatch(section, /vidiq/i, "the English package still depends on vidIQ");

  // Every field is editable, and the edits persist with the packaging.
  for (const field of ["title", "description", "overlay"]) {
    assert.ok(section.includes(`edit({ ${field}:`), `the English ${field} cannot be edited`);
  }
  assert.match(studio, /english\?: \{ optionId: string; title: string; description: string; overlay: string \}/);
  // It derives from the first option by default, and any option can be picked instead.
  assert.match(section, /pack\.options\.find\(option => option\.id === value\.english\?\.optionId\) \?\? pack\.options\[0\]/);
  assert.match(section, /update\(\{ english: englishFor\(option\) \}\)/);
  // Packages generated before englishOverlay existed still get a starting point.
  assert.match(studio, /option\.englishOverlay\s*\n?\s*\?\?/);
  // The image is generated from the English headline, never the French one.
  const generator = studio.slice(studio.indexOf("const generateEnglishThumbnail"), studio.indexOf("const generateThumbnails"));
  assert.match(generator, /overlay: english\.overlay/);
  assert.doesNotMatch(generator, /overlay: option\.overlay/);
  // And it refuses to spend on an empty headline.
  assert.match(generator, /if \(!english\.overlay\.trim\(\)\) return showToast/);
});

test("keeps both READMEs in step and current with what shipped", async () => {
  const [en, fr] = await Promise.all([
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../README.fr.md", import.meta.url), "utf8"),
  ]);
  // They have drifted twice: a menu entry shipped without being listed, and features
  // documented in one language only. Shape is the cheap proxy for substance.
  const shape = text => ({
    headings: (text.match(/^#{1,3} /gm) ?? []).length,
    tableRows: (text.match(/^\|/gm) ?? []).length,
    codeFences: (text.match(/^```/gm) ?? []).length,
  });
  assert.deepEqual(shape(en), shape(fr), "the two READMEs no longer have the same structure");
  // Each links to the other, so a reader lands in their language from either side.
  assert.match(en, /\[Français\]\(README\.fr\.md\)/);
  assert.match(fr, /\[English\]\(README\.md\)/);

  // Every menu entry in the app has to appear in the table, in both languages. The
  // Credits Usage entry shipped and went unlisted for four commits.
  const studio = await readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8");
  const labelsStart = studio.indexOf("const labels = {");
  const labels = studio.slice(labelsStart, studio.indexOf("validate:", labelsStart));
  for (const key of ["studio", "shorts", "express", "shortsExpress", "navProjects", "usage", "profile"]) {
    const label = labels.match(new RegExp(String.raw`\b${key}: "([^"]+)"`))?.[1];
    assert.ok(label, `no French label found for the ${key} menu`);
    assert.ok(fr.includes(label), `README.fr.md does not list the "${label}" menu`);
  }

  // Features that cost money or change what the user gets must be findable.
  for (const [name, needleEn, needleFr] of [
    ["English package", "English package", "package anglais"],
    ["Credits Usage", "Credits Usage", "Credits Usage"],
    ["Word export", "Word export", "Export Word"],
    ["default tags", "Default tags", "tags par défaut"],
    ["company logo", "Company logo", "Logo de l'entreprise"],
  ]) {
    assert.ok(en.toLowerCase().includes(needleEn.toLowerCase()), `README.md does not document ${name}`);
    assert.ok(fr.toLowerCase().includes(needleFr.toLowerCase()), `README.fr.md does not document ${name}`);
  }
  // The architecture tree must name the tables that exist, or it misleads a newcomer.
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  for (const table of [...schema.matchAll(/sqliteTable\("(\w+)"/g)].map(match => match[1])) {
    assert.ok(en.includes(table), `the architecture tree omits the ${table} table`);
    assert.ok(fr.includes(table), `l'arbre d'architecture omet la table ${table}`);
  }
});
