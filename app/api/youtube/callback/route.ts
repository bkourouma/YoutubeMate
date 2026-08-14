import { consumeOAuthState, exchangeCode, saveRefreshToken } from "../../../server/youtube";

function back(request: Request, status: string) {
  return Response.redirect(new URL(`/?youtube=${status}`, new URL(request.url).origin).toString(), 302);
}

export async function GET(request: Request) {
  const parameters = new URL(request.url).searchParams;
  // Google reports a refused consent here; without this it fell through to a bare 400.
  if (parameters.get("error")) return back(request, "refused");
  const code = parameters.get("code") ?? "";
  const state = parameters.get("state") ?? "";
  if (!code || !state) return back(request, "invalid");

  // Single-use lookup bound to the user who started the flow. The previous check was
  // `cookie.includes("youtube_oauth_state=" + state)` on the raw header, which any
  // cookie whose value contained that text satisfied.
  const userId = await consumeOAuthState(state);
  if (!userId) return back(request, "expired");

  try {
    const refreshToken = await exchangeCode(code, request);
    if (!refreshToken) return back(request, "failed");
    await saveRefreshToken(userId, refreshToken);
    return back(request, "connected");
  } catch {
    return back(request, "failed");
  }
}
