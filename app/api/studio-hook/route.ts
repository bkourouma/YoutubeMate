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
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "http-referer": "https://script-studio-youtube.bkourouma.chatgpt.site/",
        "x-title": "Script Studio",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: action === "iterate" ? 0.55 : 0.75,
        max_tokens: 700,
        response_format: { type: "json_object" },
      }),
    });
    const upstream = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string }; usage?: unknown };
    if (!response.ok) return Response.json({ error: "openrouter_request_failed", detail: upstream.error?.message ?? "Request failed" }, { status: response.status === 401 ? 401 : 502 });
    const content = upstream.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: "openrouter_empty_response" }, { status: 502 });
    const parsed = parseJsonContent(content);
    if (typeof parsed.hook !== "string" || typeof parsed.promise !== "string") return Response.json({ error: "openrouter_invalid_hook_response" }, { status: 502 });
    const hook = parsed.hook.trim();
    const promise = parsed.promise.trim();
    const hookWords = countWords(hook);
    const promiseWords = countWords(promise);
    const hookLengthValid = action === "iterate" && target === "promise" ? true : hookWords >= 25 && hookWords <= 40;
    const promiseLengthValid = action === "iterate" && target === "hook" ? true : promiseWords >= 15 && promiseWords <= 45;
    if (!hookLengthValid || !promiseLengthValid) return Response.json({ error: "openrouter_invalid_hook_length" }, { status: 502 });
    return Response.json({ result: { hook, promise }, usage: upstream.usage ?? null });
  } catch (error) {
    return Response.json({ error: "openrouter_invalid_response", detail: error instanceof Error ? error.message : "Invalid response" }, { status: 502 });
  }
}
