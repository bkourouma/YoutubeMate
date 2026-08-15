type Lang = "fr" | "en";
type Service = "openrouter" | "openai" | "descript" | "youtube";

const serviceNames: Record<Service, string> = { openrouter: "OpenRouter", openai: "OpenAI", descript: "Descript", youtube: "YouTube" };

export function connectionLostMessage(lang: Lang) {
  return lang === "fr"
    ? "La connexion au serveur a été interrompue. Vérifiez que l’application est bien lancée et votre réseau, puis réessayez."
    : "The connection to the server was interrupted. Check that the app is still running and your network, then retry.";
}

/**
 * Routes answer with codes; `integrationErrorResponse` is documented as returning
 * "a code the client maps to configure your key in Settings". Nothing mapped it, so
 * `integration_not_configured` reached the alert verbatim — naming the problem
 * without naming the fix. This is that mapping.
 */
export function serverErrorMessage(error: unknown, lang: Lang, service?: Service) {
  if (error instanceof TypeError) return connectionLostMessage(lang);
  const code = error instanceof Error ? error.message : "";
  const fr = lang === "fr";
  // Some failures already carry a written sentence from the server (timeouts send one
  // in the user's language). Only a bare snake_case code needs translating.
  if (!/^[a-z][a-z0-9_]*$/.test(code)) return code || (fr ? "L’opération a échoué." : "The operation failed.");
  const name = service ? serviceNames[service] : fr ? "Le service" : "The service";
  const settings = fr ? "« Ma chaîne & réglages »" : "“My channel & settings”";

  const known: Record<string, string> = {
    integration_not_configured: fr
      ? `Aucune clé ${name} enregistrée. Ajoutez-la dans ${settings} → Clés & connexions.`
      : `No ${name} key saved. Add it in ${settings} → Keys & connections.`,
    settings_storage_unavailable: fr
      ? "Le coffre à clés est indisponible : SETTINGS_ENCRYPTION_KEY manque sur ce déploiement."
      : "The key vault is unavailable: SETTINGS_ENCRYPTION_KEY is missing on this deployment.",
    authentication_required: fr ? "Session non authentifiée. Rechargez la page." : "Unauthenticated session. Reload the page.",
    user_not_allowed: fr ? "Ce compte n’est pas autorisé sur ce déploiement." : "This account is not allowed on this deployment.",
    ai_configuration_required: fr
      ? `Aucun modèle sélectionné. Choisissez-en un dans ${settings}.`
      : `No model selected. Choose one in ${settings}.`,
    invalid_source_length: fr
      ? "Le texte source doit faire entre 80 et 120 000 caractères."
      : "The source text must be between 80 and 120,000 characters.",
    reference_limit_reached: fr
      ? "Vous avez déjà 4 miniatures de référence. Supprimez-en une avant d’en ajouter."
      : "You already have 4 reference thumbnails. Remove one before adding another.",
    invalid_reference_file: fr
      ? "Fichier refusé. Utilisez un JPEG, PNG ou WebP de moins de 2 Mo."
      : "File refused. Use a JPEG, PNG or WebP under 2 MB.",
    reference_file_required: fr ? "Aucun fichier reçu. Réessayez." : "No file received. Try again.",
    reference_forbidden: fr ? "Cette image appartient à un autre compte." : "This image belongs to another account.",
    reference_not_found: fr ? "Cette image n’existe plus." : "This image no longer exists.",
  };
  if (known[code]) return known[code];

  if (code.startsWith("reference_")) {
    return fr ? "Le stockage des images est indisponible. Réessayez dans un instant." : "Image storage is unavailable. Try again shortly.";
  }

  if (code.endsWith("_timeout")) return fr ? `${name} a dépassé le délai autorisé. Relancez.` : `${name} exceeded the allowed time. Try again.`;
  if (code === "http_401" || code.endsWith("_unauthorized") || code.endsWith("_request_failed")) {
    return fr ? `${name} a refusé la requête. Vérifiez votre clé et vos crédits.` : `${name} refused the request. Check your key and credits.`;
  }
  if (code.includes("empty_response") || code.includes("invalid_response") || code.includes("invalid_packaging") || code.includes("invalid_quiz")) {
    return fr
      ? `${name} a renvoyé une réponse inexploitable. Relancez, ou changez de modèle dans ${settings}.`
      : `${name} returned an unusable response. Retry, or change the model in ${settings}.`;
  }
  return fr ? `${name} : erreur ${code}.` : `${name}: error ${code}.`;
}
