import { withUser } from "../../server/identity";
import { fetchUpstream, isTimeout, openRouterHeaders } from "../../server/http";
import { disconnectYoutube, youtubeStatus } from "../../server/youtube";
import {
  deleteIntegrationSecret, integrationErrorResponse, integrationStatus,
  isIntegrationService, normalizeApiKey, saveIntegrationSecret, type IntegrationService,
} from "../../server/secrets";

type RequestBody = { service?: string; value?: string };

/** Proves the key works before it is stored, so a typo never reaches a paid pipeline. */
async function validateSecret(service: IntegrationService, apiKey: string) {
  if (service === "openrouter") {
    const response = await fetchUpstream("https://openrouter.ai/api/v1/key", { headers: openRouterHeaders(apiKey), timeoutMs: 15_000 });
    if (!response.ok) return { valid: false as const };
    const data = await response.json() as { data?: { label?: string } };
    return { valid: true as const, label: data.data?.label ?? "OpenRouter" };
  }
  if (service === "openai") {
    const response = await fetchUpstream("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${apiKey}` }, timeoutMs: 15_000 });
    return { valid: response.ok as boolean };
  }
  const response = await fetchUpstream("https://descriptapi.com/v1/projects?limit=1", { headers: { authorization: `Bearer ${apiKey}` }, timeoutMs: 15_000 });
  return { valid: response.ok as boolean };
}

export async function GET() {
  return withUser(async userId => {
    try {
      return Response.json({ integrations: await integrationStatus(userId), youtube: await youtubeStatus(userId) });
    } catch (error) {
      return integrationErrorResponse(error) ?? Response.json({ error: "integration_status_unavailable" }, { status: 503 });
    }
  });
}

export async function POST(request: Request) {
  return withUser(async userId => {
    let rawBody: unknown;
    try { rawBody = await request.json(); } catch { return Response.json({ error: "invalid_json_body" }, { status: 400 }); }
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) return Response.json({ error: "invalid_request_body" }, { status: 400 });
    const body = rawBody as RequestBody;
    if (!isIntegrationService(body.service)) return Response.json({ error: "unknown_service" }, { status: 400 });
    const value = normalizeApiKey(body.value);
    if (!value || value.length > 500) return Response.json({ error: "invalid_secret" }, { status: 400 });
    try {
      const check = await validateSecret(body.service, value);
      if (!check.valid) return Response.json({ error: "secret_rejected", service: body.service }, { status: 400 });
      await saveIntegrationSecret(userId, body.service, value);
      return Response.json({ ok: true, label: "label" in check ? check.label : undefined, integrations: await integrationStatus(userId), youtube: await youtubeStatus(userId) });
    } catch (error) {
      if (isTimeout(error)) return Response.json({ error: "validation_timeout", service: body.service }, { status: 504 });
      return integrationErrorResponse(error) ?? Response.json({ error: "secret_save_failed" }, { status: 502 });
    }
  });
}

export async function DELETE(request: Request) {
  return withUser(async userId => {
    const service = new URL(request.url).searchParams.get("service");
    if (service === "youtube") {
      try {
        // The local purge is guaranteed; the revocation at Google is reported so the
        // user is told when the app is still listed in their Google account. The token
        // itself never appears in this response.
        const { revoked } = await disconnectYoutube(userId);
        return Response.json({ ok: true, revoked, integrations: await integrationStatus(userId), youtube: await youtubeStatus(userId) });
      } catch {
        return Response.json({ error: "youtube_disconnect_failed" }, { status: 502 });
      }
    }
    if (!isIntegrationService(service)) return Response.json({ error: "unknown_service" }, { status: 400 });
    try {
      await deleteIntegrationSecret(userId, service);
      return Response.json({ ok: true, integrations: await integrationStatus(userId), youtube: await youtubeStatus(userId) });
    } catch (error) {
      return integrationErrorResponse(error) ?? Response.json({ error: "secret_delete_failed" }, { status: 502 });
    }
  });
}
