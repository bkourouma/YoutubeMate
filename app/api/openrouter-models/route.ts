type OpenRouterModel = {
  id?: string;
  name?: string;
  context_length?: number;
  architecture?: { output_modalities?: string[] };
  pricing?: { prompt?: string; completion?: string };
};

export const revalidate = 3600;

export async function GET() {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models?sort=most-popular&supported_parameters=response_format", {
      headers: { accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error("openrouter_models_failed");
    const payload = await response.json() as { data?: OpenRouterModel[] };
    const models = (payload.data ?? [])
      .filter(model => model.id && model.name && model.pricing?.prompt !== undefined && model.pricing?.completion !== undefined)
      .filter(model => !model.architecture?.output_modalities || model.architecture.output_modalities.includes("text"))
      .slice(0, 120)
      .map(model => ({
        id: model.id,
        name: model.name,
        contextLength: model.context_length ?? null,
        inputPerToken: Number(model.pricing?.prompt ?? 0),
        outputPerToken: Number(model.pricing?.completion ?? 0),
      }));
    return Response.json({ models, updatedAt: new Date().toISOString() });
  } catch {
    return Response.json({ error: "openrouter_models_unavailable", models: [] }, { status: 502 });
  }
}
