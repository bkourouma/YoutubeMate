"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCost, formatTokens } from "./lib/money";

type Lang = "fr" | "en";
type AlertKind = "success" | "warning" | "error";

type Total = {
  cost: number; calls: number; promptTokens: number; completionTokens: number;
  reasoningTokens: number; cachedTokens: number; images: number; cacheHits: number; since: string | null;
};
type ProjectRow = { projectId: string; title: string; pipeline: string; cost: number; calls: number; images: number; last: string };
type ActionRow = { projectId: string; action: string; model: string; cost: number; calls: number; cacheHits: number };
type ModelRow = { model: string; provider: string; cost: number; calls: number };
type EventRow = {
  id: string; projectTitle: string; pipeline: string; action: string; provider: string; model: string;
  costUsd: number; promptTokens: number; completionTokens: number; reasoningTokens: number;
  cachedTokens: number; images: number; cacheHit: number; createdAt: string;
};
type Ledger = { total: Total; byProject: ProjectRow[]; byProjectAction: ActionRow[]; byModel: ModelRow[]; recent: EventRow[]; recentLimit: number };


const ACTION_LABELS: Record<string, { fr: string; en: string }> = {
  hook: { fr: "Hook & promesse", en: "Hook & promise" },
  chapters: { fr: "Plan de chapitres", en: "Chapter plan" },
  chapter: { fr: "Chapitre du script", en: "Script chapter" },
  conclusion: { fr: "Conclusion & CTA", en: "Conclusion & CTA" },
  packaging: { fr: "Packaging A/B/C", en: "A/B/C packaging" },
  "packaging-steered": { fr: "Packaging réorienté", en: "Steered packaging" },
  "thumbnail-prompt": { fr: "Prompt de miniature", en: "Thumbnail prompt" },
  thumbnail: { fr: "Miniature générée", en: "Generated thumbnail" },
  "shorts-excerpts": { fr: "Extraits Shorts", en: "Shorts excerpts" },
  "shorts-titles": { fr: "Titres Shorts", en: "Shorts titles" },
  "shorts-metadata": { fr: "Fiches Shorts", en: "Shorts metadata" },
  "shorts-packaging": { fr: "Package Short", en: "Short package" },
};
const actionLabel = (action: string, lang: Lang) => ACTION_LABELS[action]?.[lang] ?? action;

const PIPELINE_LABELS: Record<string, { fr: string; en: string }> = {
  script: { fr: "Script Studio", en: "Script Studio" },
  express: { fr: "Package vidéo", en: "Video package" },
  shorts: { fr: "Shorts Studio", en: "Shorts Studio" },
  "shorts-express": { fr: "Package Short", en: "Short package" },
  profile: { fr: "Réglages", en: "Settings" },
};

export function CreditsUsage({ lang, showToast }: { lang: Lang; showToast: (message: string, kind?: AlertKind) => void }) {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // No synchronous setState here: `load` runs from an effect on mount, and the spinner
  // is already the initial state. The refresh button raises it again from its handler.
  const load = useCallback(() => {
    fetch("/api/usage").then(response => response.json() as Promise<Ledger & { error?: string }>)
      .then(data => { if (!data.error) setLedger(data); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const clear = async (projectId?: string) => {
    const response = await fetch(`/api/usage${projectId !== undefined ? `?projectId=${encodeURIComponent(projectId)}` : ""}`, { method: "DELETE" });
    if (response.ok) { load(); showToast(lang === "fr" ? "Historique effacé" : "History cleared"); }
    else showToast(lang === "fr" ? "Effacement impossible." : "Could not clear.", "error");
  };

  const t = (fr: string, en: string) => (lang === "fr" ? fr : en);
  const plural = (count: number, fr: string, en: string) => `${count} ${lang === "fr" ? fr + (count > 1 ? "s" : "") : en + (count > 1 ? "s" : "")}`;
  const dateOf = (value: string) => new Date(value).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB", { dateStyle: "short", timeStyle: "short" });

  if (loading && !ledger) return <div className="usage-page"><p className="usage-empty">{t("Chargement du journal…", "Loading the ledger…")}</p></div>;
  if (!ledger || !ledger.total.calls) return <div className="usage-page">
    <header className="usage-head"><div><h1>Credits Usage</h1><p>{t("Le coût réel de chaque action, projet par projet.", "The real cost of every action, project by project.")}</p></div></header>
    <p className="usage-empty">{t("Aucune dépense enregistrée pour l’instant. Chaque appel payant sera consigné ici automatiquement.", "No spending recorded yet. Every paid call will be logged here automatically.")}</p>
  </div>;

  const { total } = ledger;
  const totalTokens = total.promptTokens + total.completionTokens;

  return <div className="usage-page">
    <header className="usage-head">
      <div>
        <h1>Credits Usage</h1>
        <p>{t("Le coût réel de chaque action, projet par projet.", "The real cost of every action, project by project.")}
          {total.since && ` · ${t("depuis le", "since")} ${new Date(total.since).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")}`}</p>
      </div>
      <div className="usage-head-actions">
        <button className="ghost" onClick={() => { setLoading(true); load(); }}>↻ {t("Actualiser", "Refresh")}</button>
        <button className="danger" onClick={() => clear()}>{t("Effacer l’historique", "Clear history")}</button>
      </div>
    </header>

    <div className="usage-cards">
      <div className="usage-card strong"><span>{t("Dépense totale", "Total spend")}</span><strong>{formatCost(total.cost)}</strong><small>{plural(total.calls, "appel payant", "paid call")}</small></div>
      <div className="usage-card"><span>{t("Jetons", "Tokens")}</span><strong>{formatTokens(totalTokens)}</strong><small>{formatTokens(total.reasoningTokens)} {t("de raisonnement", "reasoning")}</small></div>
      <div className="usage-card"><span>{t("Images", "Images")}</span><strong>{total.images}</strong><small>{t("miniatures générées", "thumbnails generated")}</small></div>
      <div className="usage-card"><span>{t("Économisé par le cache", "Saved by cache")}</span><strong>{total.cacheHits}</strong><small>{formatTokens(total.cachedTokens)} {t("jetons mis en cache", "cached tokens")}</small></div>
    </div>

    <section className="usage-section">
      <h2>{t("Par projet", "By project")}</h2>
      <p className="usage-hint">{t("Cliquez sur un projet pour voir le détail action par action.", "Click a project to see it action by action.")}</p>
      <div className="usage-projects">
        {ledger.byProject.map(row => {
          const actions = ledger.byProjectAction.filter(action => action.projectId === row.projectId);
          const isOpen = open[row.projectId] ?? false;
          const share = total.cost > 0 ? Math.round((row.cost / total.cost) * 100) : 0;
          return <article key={row.projectId || "standalone"} className={`usage-project ${isOpen ? "open" : ""}`}>
            <button className="usage-project-head" onClick={() => setOpen(current => ({ ...current, [row.projectId]: !isOpen }))} aria-expanded={isOpen}>
              <span className="usage-caret">{isOpen ? "▾" : "▸"}</span>
              <span className="usage-project-name">
                <strong>{row.title || t("Hors projet", "Outside a project")}</strong>
                <small>{PIPELINE_LABELS[row.pipeline]?.[lang] ?? row.pipeline} · {plural(row.calls, "appel", "call")}{row.images ? ` · $` : ""} · {dateOf(row.last)}</small>
              </span>
              <span className="usage-bar" aria-hidden><i style={{ width: `${share}%` }} /></span>
              <span className="usage-project-cost">{formatCost(row.cost)}<small>{share}%</small></span>
            </button>
            {isOpen && <div className="usage-actions">
              <table>
                <thead><tr><th>{t("Action", "Action")}</th><th>{t("Modèle", "Model")}</th><th>{t("Appels", "Calls")}</th><th>{t("Coût", "Cost")}</th></tr></thead>
                <tbody>
                  {actions.map(action => <tr key={`${action.projectId}-${action.action}`}>
                    <td>{actionLabel(action.action, lang)}{action.cacheHits > 0 && <em className="usage-cached"> · {action.cacheHits} {t("en cache", "cached")}</em>}</td>
                    <td className="usage-model">{action.model}</td>
                    <td>{action.calls}</td>
                    <td className="usage-cost">{formatCost(action.cost)}</td>
                  </tr>)}
                </tbody>
              </table>
              <button className="usage-clear-one" onClick={() => clear(row.projectId)}>{t("Effacer ce projet du journal", "Clear this project from the ledger")}</button>
            </div>}
          </article>;
        })}
      </div>
    </section>

    <section className="usage-section">
      <h2>{t("Par modèle", "By model")}</h2>
      <table className="usage-table">
        <thead><tr><th>{t("Modèle", "Model")}</th><th>{t("Fournisseur", "Provider")}</th><th>{t("Appels", "Calls")}</th><th>{t("Coût", "Cost")}</th></tr></thead>
        <tbody>{ledger.byModel.map(row => <tr key={`${row.provider}-${row.model}`}>
          <td className="usage-model">{row.model}</td><td>{row.provider}</td><td>{row.calls}</td><td className="usage-cost">{formatCost(row.cost)}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className="usage-section">
      <h2>{t("Journal des appels", "Call log")}</h2>
      <p className="usage-hint">{t(`Les ${ledger.recentLimit} derniers appels. Les totaux ci-dessus portent sur l’historique complet.`, `The last ${ledger.recentLimit} calls. The totals above cover the full history.`)}</p>
      <table className="usage-table">
        <thead><tr><th>{t("Date", "Date")}</th><th>{t("Projet", "Project")}</th><th>{t("Action", "Action")}</th><th>{t("Jetons", "Tokens")}</th><th>{t("Coût", "Cost")}</th></tr></thead>
        <tbody>{ledger.recent.map(row => <tr key={row.id}>
          <td className="usage-when">{dateOf(row.createdAt)}</td>
          <td>{row.projectTitle || t("Hors projet", "Outside a project")}</td>
          <td>{actionLabel(row.action, lang)}{row.cacheHit ? <em className="usage-cached"> · {t("cache", "cache")}</em> : null}</td>
          <td className="usage-when">{row.images ? `${row.images} ${t("image", "image")}` : `${formatTokens(row.promptTokens)} → ${formatTokens(row.completionTokens)}`}</td>
          <td className="usage-cost">{formatCost(row.costUsd)}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <p className="usage-note">{t(
      "Les montants OpenRouter sont ceux facturés par OpenRouter, repris tels quels dans sa réponse. Les montants OpenAI sont calculés à partir des jetons renvoyés par l’API images et des tarifs publiés — ce sont des estimations, à confronter à votre facture.",
      "OpenRouter amounts are the ones OpenRouter charged, taken from its own response. OpenAI amounts are computed from the tokens its images API returns and the published rates — these are estimates, to be checked against your invoice.",
    )}</p>
  </div>;
}
