import { requireUserId, unauthorizedResponse } from "../../../server/identity";
import { startOAuth } from "../../../server/youtube";

/** Starts the consent flow for the signed-in user. Never open to anonymous callers:
 *  an unauthenticated start meant anyone could complete it and take over the row. */
export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (error) {
    return unauthorizedResponse(error) ?? Response.json({ error: "authentication_required" }, { status: 401 });
  }
  try {
    return Response.redirect(await startOAuth(userId, request), 302);
  } catch (error) {
    const code = error instanceof Error ? error.message : "youtube_auth_unavailable";
    return Response.json({ error: code }, { status: code === "google_client_not_configured" || code === "public_origin_not_configured" ? 503 : 502 });
  }
}
