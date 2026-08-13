type HookTarget = "hook" | "promise" | "both";

type RequestBody = {
  apiKey?: string;
  model?: string;
  language?: "fr" | "en";
  action?: "generate" | "iterate";
  target?: HookTarget;
  direction?: string;
  subject?: string;
  currentHook?: string;
  currentPromise?: string;
  profile?: { channel?: string; theme?: string; audience?: string; tone?: string };
};

function parseJsonContent(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  return JSON.parse((fenced ?? content).trim()) as { hook?: unknown; promise?: unknown };
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(request: Request) {
  const body = await request.json() as RequestBody;
  const apiKey = body.apiKey?.trim();
  const model = body.model?.trim();
  const subject = body.subject?.trim() ?? "";
  const action = body.action === "iterate" ? "iterate" : "generate";
  const target: HookTarget = body.target === "hook" || body.target === "promise" ? body.target : "both";
  const direction = body.direction?.trim() ?? "";
  if (!apiKey || !model) return Response.json({ error: "ai_configuration_required" }, { status: 400 });
  if (subject.length < 3 || subject.length > 2_000) return Response.json({ error: "invalid_subject" }, { status: 400 });
  if (action === "iterate" && (!direction || direction.length > 2_000)) return Response.json({ error: "iteration_direction_required" }, { status: 400 });

  const language = body.language === "en" ? "English" : "French";
  const system = `You are a senior YouTube script editor. Return only valid JSON with exactly this shape: {"hook":"...","promise":"..."}.
Write in ${language}. The hook must contain 25 to 40 words, sound natural when spoken, create immediate curiosity, and stay strictly grounded in the supplied subject. The promise must contain 15 to 45 words, state a concrete viewer benefit, and make no unsupported claim. Use the channel's tone and audience. Never add facts, figures, results, sources, or guarantees that were not supplied. The application inserts a protected channel introduction after the hook and a protected launch line after the promise, so never reproduce those fixed texts.`;
  const task = action === "generate"
    ? "Create a fresh hook and promise for the supplied subject."
    : `Revise ${target === "both" ? "the hook and the promise" : `only the ${target}`} according to the user's direction. Still return both fields. When only one field is targeted, reproduce the other field exactly unchanged.`;
  const user = `${task}

CHANNEL: ${body.profile?.channel ?? ""}
THEME: ${body.profile?.theme ?? ""}
AUDIENCE: ${body.profile?.audience ?? ""}
TONE: ${body.profile?.tone ?? ""}
SUBJECT: ${subject}
CURRENT HOOK: ${body.currentHook ?? ""}
CURRENT PROMISE: ${body.currentPromise ?? ""}
USER DIRECTION: ${direction || "None"}`;

  try {
    const callModel = async (messages: Array<{ role: "system" | "user"; content: string }>, temperature: number) => {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          "http-referer": "https://script-studio-youtube.bkourouma.chatgpt.site/",
          "x-title": "Script Studio",
        },
        body: JSON.stringify({ model, messages, temperature, max_tokens: 700, response_format: { type: "json_object" } }),
      });
      const upstream = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string }; usage?: unknown };
      return { response, upstream, content: upstream.choices?.[0]?.message?.content };
    };
    const validResult = (parsed: { hook?: unknown; promise?: unknown } | null) => {
      if (typeof parsed?.hook !== "string" || typeof parsed.promise !== "string") return false;
      const hookWords = countWords(parsed.hook);
      const promiseWords = countWords(parsed.promise);
      const hookLengthValid = action === "iterate" && target === "promise" ? true : hookWords >= 25 && hookWords <= 40;
      const promiseLengthValid = action === "iterate" && target === "hook" ? true : promiseWords >= 15 && promiseWords <= 45;
      return hookLengthValid && promiseLengthValid;
    };
    const parseSafely = (content?: string) => {
      if (!content) return null;
      try { return parseJsonContent(content); } catch { return null; }
    };

    let completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }], action === "iterate" ? 0.55 : 0.75);
    if (!completion.response.ok) return Response.json({ error: "openrouter_request_failed", detail: completion.upstream.error?.message ?? "OpenRouter request failed" }, { status: completion.response.status === 401 ? 401 : 502 });
    let parsed = parseSafely(completion.content);

    if (!validResult(parsed)) {
      const draft = completion.content ?? JSON.stringify(parsed ?? {});
      const repair = `Repair the draft below. Return only JSON with hook and promise. Count words before answering. The hook must contain exactly 25 to 40 words and the promise exactly 15 to 45 words. Preserve the requested language, subject, audience, tone, and factual limits. ${action === "iterate" && target !== "both" ? `The ${target === "hook" ? "promise" : "hook"} was not targeted and must remain exactly unchanged from the CURRENT value in the original request.` : ""}\n\nDRAFT:\n${draft}`;
      completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }, { role: "user", content: repair }], 0.2);
      if (!completion.response.ok) return Response.json({ error: "openrouter_repair_failed", detail: completion.upstream.error?.message ?? "OpenRouter repair failed" }, { status: completion.response.status === 401 ? 401 : 502 });
      parsed = parseSafely(completion.content);
    }

    if (!validResult(parsed) || typeof parsed?.hook !== "string" || typeof parsed.promise !== "string") return Response.json({ error: "openrouter_invalid_hook_response", detail: "Le modèle n’a pas respecté le format demandé après une seconde tentative." }, { status: 422 });
    return Response.json({ result: { hook: parsed.hook.trim(), promise: parsed.promise.trim() }, usage: completion.upstream.usage ?? null });
  } catch (error) {
    return Response.json({ error: "openrouter_invalid_response", detail: error instanceof Error ? error.message : "Invalid response" }, { status: 502 });
  }
}
