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
  assert.match(html, /aria-label="YoutubeMate"/i);
  assert.match(html, /Script Studio/);
  assert.match(html, /Shorts Studio/);
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
  assert.match(layout, /YoutubeMate — de l’idée à la publication/);
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

test("keeps Shorts styles scoped so the two pipelines can never collide", async () => {
  const shorts = await readFile(new URL("../app/shorts.css", import.meta.url), "utf8");
  const withoutComments = shorts.replace(/\/\*[\s\S]*?\*\//g, "");
  // Selectors only: drop declaration blocks, at-rule preludes and stray braces.
  const selectors = withoutComments
    .split("}")
    .map(block => block.split("{")[0].trim())
    .filter(Boolean)
    .flatMap(prelude => prelude.split(",").map(part => part.trim()).filter(Boolean))
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
