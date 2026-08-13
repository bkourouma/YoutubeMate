import { headers } from "next/headers";

type TitleInput = { id: string; title: string };

export async function POST(request: Request) {
  const endpoint = process.env.VIDIQ_SCORE_ENDPOINT;
  if (!endpoint) return Response.json({ error: "vidiq_not_configured" }, { status: 503 });

  const body = await request.json() as { titles?: TitleInput[] };
  const titles = body.titles?.filter(item => /^[ABC]$/.test(item.id) && item.title.trim()).slice(0, 3) ?? [];
  if (titles.length !== 3) return Response.json({ error: "three_titles_required" }, { status: 400 });

  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  if (!userId) return Response.json({ error: "authentication_required" }, { status: 401 });

  try {
    const vidiqResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-script-studio-user-id": userId },
      body: JSON.stringify({ titles }),
    });
    if (!vidiqResponse.ok) return Response.json({ error: "vidiq_request_failed" }, { status: 502 });
    const payload = await vidiqResponse.json() as { scores?: Record<string, number> | Array<{ id: string; score: number }> };
    const rawScores = Array.isArray(payload.scores) ? Object.fromEntries(payload.scores.map(item => [item.id, item.score])) : payload.scores;
    if (!rawScores) return Response.json({ error: "vidiq_scores_missing" }, { status: 502 });
    const scores: Record<string, number> = {};
    for (const { id } of titles) {
      const score = rawScores[id];
      if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) return Response.json({ error: "invalid_vidiq_score" }, { status: 502 });
      scores[id] = score;
    }
    return Response.json({ scores });
  } catch {
    return Response.json({ error: "vidiq_unreachable" }, { status: 502 });
  }
}
