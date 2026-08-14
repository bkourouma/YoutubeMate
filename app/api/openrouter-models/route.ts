type OpenRouterModel = {
  id?: string;
  name?: string;
  context_length?: number;
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
  reasoning?: {
    supported_efforts?: string[] | null;
    default_effort?: string;
    default_enabled?: boolean;
    mandatory?: boolean;
    supports_max_tokens?: boolean;
  };
};

export const revalidate = 3600;

export async function GET() {
  try {
    const urls = [
      "https://openrouter.ai/api/v1/models?sort=intelligence-high-to-low&supported_parameters=reasoning,structured_outputs&output_modalities=text",
      "https://openrouter.ai/api/v1/models?sort=most-popular&supported_parameters=response_format",
    ];
    const responses = await Promise.all(urls.map(url => fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 3600 },
    })));
    if (responses.some(response => !response.ok)) throw new Error("openrouter_models_failed");
    const payloads = await Promise.all(responses.map(response => response.json() as Promise<{ data?: OpenRouterModel[] }>));
    const reasoningCatalog = (payloads[0].data ?? []).slice(0, 120);
    const popularCatalog = (payloads[1].data ?? []).slice(0, 120);
    const catalog = [...popularCatalog, ...reasoningCatalog];
    const unique = Array.from(new Map(catalog.filter(model => model.id).map(model => [model.id, model])).values());
    const models = unique
      .filter(model => model.id && model.name && model.pricing?.prompt !== undefined && model.pricing?.completion !== undefined)
      .filter(model => !model.architecture?.output_modalities || model.architecture.output_modalities.includes("text"))
      .slice(0, 220)
      .map(model => ({
        id: model.id,
        name: model.name,
        contextLength: model.context_length ?? null,
        inputPerToken: Number(model.pricing?.prompt ?? 0),
        outputPerToken: Number(model.pricing?.completion ?? 0),
        supportsImages: model.architecture?.input_modalities?.includes("image") ?? false,
        supportsReasoning: Boolean(model.reasoning || model.supported_parameters?.includes("reasoning")),
        supportsStructuredOutputs: model.supported_parameters?.includes("structured_outputs") ?? false,
        supportsWriter: Boolean(
          !model.id?.endsWith(":batch")
          && model.supported_parameters?.includes("reasoning")
          && model.supported_parameters?.includes("structured_outputs")
          && model.supported_parameters?.includes("response_format")
          && model.supported_parameters?.includes("max_tokens")
          && (!model.reasoning?.supported_efforts?.length || model.reasoning.supported_efforts.includes("high"))
        ),
        supportedEfforts: model.reasoning?.supported_efforts ?? null,
        defaultReasoningEffort: model.reasoning?.default_effort ?? null,
        reasoningMandatory: model.reasoning?.mandatory ?? false,
      }));
    return Response.json({ models, updatedAt: new Date().toISOString() });
  } catch {
    return Response.json({ error: "openrouter_models_unavailable", models: [] }, { status: 502 });
  }
}
