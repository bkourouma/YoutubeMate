import { requireApiKey } from "../../server/secrets";
import { openRouterHeaders } from "../../server/http";
import { openRouterUsage, projectRef, recordUsage } from "../../server/usage";

type HookTarget = "hook" | "promise" | "both";

type RequestBody = {
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

type HookResult = { hook?: string; promise?: string };

type OpenRouterPayload = {
  choices?: Array<{
    message?: { content?: unknown };
    error?: { message?: string };
  }>;
  error?: { message?: string };
  usage?: unknown;
};

function textContent(value: unknown) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map(part => {
      if (!part || typeof part !== "object") return "";
      const record = part as Record<string, unknown>;
      return record.type === "text" && typeof record.text === "string" ? record.text : "";
    })
    .filter(Boolean)
    .join("\n");
}

function resultFromValue(value: unknown): HookResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const nested = record.result && typeof record.result === "object" ? record.result as Record<string, unknown> : record;
  const hook = typeof nested.hook === "string" ? nested.hook : typeof nested.accroche === "string" ? nested.accroche : undefined;
  const promise = typeof nested.promise === "string" ? nested.promise : typeof nested.promesse === "string" ? nested.promesse : undefined;
  return hook || promise ? { hook, promise } : null;
}

function parseModelContent(value: unknown): HookResult | null {
  const content = textContent(value).trim();
  if (!content) return null;
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  const candidates = [
    fenced,
    content,
    firstBrace >= 0 && lastBrace > firstBrace ? content.slice(firstBrace, lastBrace + 1) : "",
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    try {
      const parsed = resultFromValue(JSON.parse(candidate));
      if (parsed) return parsed;
    } catch { /* try the next representation */ }
  }
  const hook = content.match(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:hook|accroche)\s*[:-]\s*([\s\S]*?)(?=\n\s*(?:#{1,6}\s*)?(?:promise|promesse)\s*[:-]|$)/i)?.[1]?.trim();
  const promise = content.match(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:promise|promesse)\s*[:-]\s*([\s\S]*?)$/i)?.[1]?.trim();
  return hook || promise ? { hook, promise } : null;
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(request: Request) {
  const body = await request.json() as RequestBody;
  const guard = await requireApiKey("openrouter");
  if (guard instanceof Response) return guard;
  const { apiKey, userId } = guard;
  const model = body.model?.trim();
  const subject = body.subject?.trim() ?? "";
  const action = body.action === "iterate" ? "iterate" : "generate";
  const target: HookTarget = body.target === "hook" || body.target === "promise" ? body.target : "both";
  const direction = body.direction?.trim() ?? "";
  if (!model) return Response.json({ error: "ai_configuration_required" }, { status: 400 });
  if (subject.length < 3 || subject.length > 2_000) return Response.json({ error: "invalid_subject" }, { status: 400 });
  if (action === "iterate" && (!direction || direction.length > 2_000)) return Response.json({ error: "iteration_direction_required" }, { status: 400 });

  const language = body.language === "en" ? "English" : "French";
  const hookInstruction = action === "iterate" && target === "promise"
    ? "Return the CURRENT HOOK exactly unchanged."
    : "Write a hook of 28 to 36 words (25 to 40 words are acceptable), natural when spoken, immediately curious, and strictly grounded in the subject.";
  const promiseInstruction = action === "iterate" && target === "hook"
    ? "Return the CURRENT PROMISE exactly unchanged."
    : "Write a promise of 18 to 32 words (15 to 45 words are acceptable), with a concrete viewer benefit and no unsupported claim.";
  const system = `You are a senior YouTube script editor. Return only valid JSON with exactly this shape: {"hook":"...","promise":"..."}.
Write in ${language}. ${hookInstruction} ${promiseInstruction} Use the channel's tone and audience. Never add facts, figures, results, sources, or guarantees that were not supplied. The application inserts a protected channel introduction after the hook and a protected launch line after the promise, so never reproduce those fixed texts.`;
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
        headers: openRouterHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: 700,
          response_format: { type: "json_object" },
          plugins: [{ id: "response-healing" }],
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const upstream = await response.json() as OpenRouterPayload;
      return { response, upstream, content: upstream.choices?.[0]?.message?.content };
    };
    const preserveUntargetedField = (parsed: HookResult | null) => {
      if (!parsed) return null;
      if (action === "iterate" && target === "hook" && body.currentPromise?.trim()) return { ...parsed, promise: body.currentPromise };
      if (action === "iterate" && target === "promise" && body.currentHook?.trim()) return { ...parsed, hook: body.currentHook };
      return parsed;
    };
    const usableResult = (parsed: HookResult | null): parsed is { hook: string; promise: string } => (
      typeof parsed?.hook === "string" && parsed.hook.trim().length > 0 && parsed.hook.length <= 5_000
      && typeof parsed.promise === "string" && parsed.promise.trim().length > 0 && parsed.promise.length <= 5_000
    );
    const validLength = (parsed: HookResult | null) => {
      if (!usableResult(parsed)) return false;
      const hookWords = countWords(parsed.hook);
      const promiseWords = countWords(parsed.promise);
      const hookLengthValid = action === "iterate" && target === "promise" ? true : hookWords >= 25 && hookWords <= 40;
      const promiseLengthValid = action === "iterate" && target === "hook" ? true : promiseWords >= 15 && promiseWords <= 45;
      return hookLengthValid && promiseLengthValid;
    };

    let completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }], action === "iterate" ? 0.55 : 0.75);
    if (!completion.response.ok) return Response.json({ error: "openrouter_request_failed", detail: completion.upstream.error?.message ?? "OpenRouter request failed" }, { status: completion.response.status === 401 ? 401 : 502 });
    let parsed = preserveUntargetedField(parseModelContent(completion.content));

    if (!validLength(parsed)) {
      const draft = textContent(completion.content) || JSON.stringify(parsed ?? {});
      const repair = `Repair the draft below. Return only JSON with hook and promise. Count words before answering. Aim for 30 to 35 words for the hook and 20 to 30 words for the promise. Preserve the requested language, subject, audience, tone, and factual limits. ${action === "iterate" && target !== "both" ? `The ${target === "hook" ? "promise" : "hook"} was not targeted and must remain exactly unchanged from the CURRENT value in the original request.` : ""}\n\nDRAFT:\n${draft}`;
      completion = await callModel([{ role: "system", content: system }, { role: "user", content: user }, { role: "user", content: repair }], 0.2);
      if (!completion.response.ok) return Response.json({ error: "openrouter_repair_failed", detail: completion.upstream.error?.message ?? "OpenRouter repair failed" }, { status: completion.response.status === 401 ? 401 : 502 });
      parsed = preserveUntargetedField(parseModelContent(completion.content));
    }

    if (!usableResult(parsed)) {
      const upstreamDetail = completion.upstream.error?.message ?? completion.upstream.choices?.[0]?.error?.message;
      return Response.json({
        error: "openrouter_unusable_hook_response",
        reason: parsed ? "missing_hook_or_promise" : "invalid_json_or_empty_content",
        detail: upstreamDetail ?? "Le modèle n’a renvoyé aucun hook exploitable. Réessayez ou choisissez un autre modèle.",
      }, { status: 502 });
    }
    const hookWords = countWords(parsed.hook);
    const promiseWords = countWords(parsed.promise);
    const warning = validLength(parsed) ? null : {
      code: "length_adjustment_needed",
      hookWords,
      promiseWords,
      hookValid: action === "iterate" && target === "promise" ? true : hookWords >= 25 && hookWords <= 40,
      promiseValid: action === "iterate" && target === "hook" ? true : promiseWords >= 15 && promiseWords <= 45,
    };
    const reference = projectRef(body as Record<string, unknown>);
    await recordUsage({ userId, ...reference, pipeline: "script", action: "hook", provider: "openrouter", usage: openRouterUsage(completion.upstream, model) });
    return Response.json({ result: { hook: parsed.hook.trim(), promise: parsed.promise.trim() }, warning, usage: completion.upstream.usage ?? null });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    if (timedOut) return Response.json({ error: "openrouter_timeout", detail: language === "English" ? "Hook generation exceeded the allowed time. Retry." : "La génération du hook a dépassé le délai autorisé. Réessayez." }, { status: 504 });
    return Response.json({ error: "openrouter_invalid_response", detail: error instanceof Error ? error.message : "Invalid response" }, { status: 502 });
  }
}
