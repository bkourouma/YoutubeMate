type RequestBody = { apiKey?: string };

function normalizeApiKey(value?: string) {
  return value?.trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "") ?? "";
}

export async function POST(request: Request) {
  const body = await request.json() as RequestBody;
  const apiKey = normalizeApiKey(body.apiKey);
  if (!apiKey) return Response.json({ error: "openrouter_key_required" }, { status: 400 });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    const payload = await response.json() as {
      data?: { label?: string; limit_remaining?: number | null; is_free_tier?: boolean; expires_at?: string | null };
      error?: { message?: string };
    };
    if (response.status === 401) return Response.json({ error: "openrouter_key_rejected" }, { status: 401 });
    if (!response.ok || !payload.data) return Response.json({ error: "openrouter_key_check_failed", detail: payload.error?.message ?? "OpenRouter key check failed" }, { status: 502 });
    return Response.json({
      valid: true,
      label: payload.data.label ?? "OpenRouter",
      limitRemaining: payload.data.limit_remaining ?? null,
      freeTier: payload.data.is_free_tier ?? false,
      expiresAt: payload.data.expires_at ?? null,
    });
  } catch (error) {
    return Response.json({ error: "openrouter_unreachable", detail: error instanceof Error ? error.message : "OpenRouter unavailable" }, { status: 502 });
  }
}
