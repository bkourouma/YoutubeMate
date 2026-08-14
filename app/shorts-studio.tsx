/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";

export type ShortsSequence = { startTime: string; endTime: string };
export type ShortItem = {
  title: string; text: string; words: number; targetMinutes: number;
  startTime: string; endTime: string; sequences: ShortsSequence[]; positionEstimated: boolean;
};
export type ShortsTitleOption = { title: string; score: number; reason?: string };
export type ShortsThumbnailConcept = { name: string; hook: string; visual: string; overlayText: string; palette: string; prompt: string };
export type ShortsMetadataItem = { description: string; tags: string[]; thumbnailConcepts: ShortsThumbnailConcept[] };
export type ShortsUsage = { model: string; cost: number; promptTokens: number; completionTokens: number; reasoningTokens: number; cachedTokens: number; cacheHit: boolean };

type ShortsProject = {
  id: string; name: string; stage: number; updatedAt: string;
  state: {
    transcript?: string; videoCount?: number; duration?: string;
    shorts?: ShortItem[]; titleOptions?: Record<number, ShortsTitleOption[]>;
    selectedTitles?: Record<number, string>; metadata?: Record<number, ShortsMetadataItem>;
  } | null;
};

type Lang = "fr" | "en";
type AlertKind = "success" | "warning" | "error";
type Loading = "analyze" | "titles" | "metadata" | null;

const DURATIONS = [
  { value: "auto", fr: "Auto", en: "Auto", detailFr: "L’IA choisit entre 1 et 3 min", detailEn: "AI picks between 1 and 3 min" },
  { value: "1", fr: "1 minute", en: "1 minute", detailFr: "Une idée, très rythmée", detailEn: "One idea, fast paced" },
  { value: "2", fr: "2 minutes", en: "2 minutes", detailFr: "Explication structurée", detailEn: "A structured explanation" },
  { value: "3", fr: "3 minutes", en: "3 minutes", detailFr: "Sujet avec plus de contexte", detailEn: "A topic needing context" },
] as const;

function wordsOf(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

/** Tags are pasted straight into YouTube Studio, which expects a comma-separated list. */
function commaSeparatedTags(tags: string[]) {
  return tags.map(tag => tag.trim()).filter(Boolean).join(", ");
}

export function ShortsStudio({ lang, openrouterReady, openaiReady, writerModel, imageModel, imageQuality, channel, thumbnailSystemPrompt, referenceKeys, presenterKey, showToast, copy, openSettings, postJson, connectionLost }: {
  lang: Lang;
  openrouterReady: boolean;
  openaiReady: boolean;
  writerModel: string;
  imageModel: string;
  imageQuality: string;
  channel: string;
  thumbnailSystemPrompt: string;
  referenceKeys: string[];
  presenterKey: string;
  showToast: (message: string, kind?: AlertKind) => void;
  copy: (value: string) => void;
  openSettings: () => void;
  postJson: (url: string, payload: unknown, onRetry?: () => void) => Promise<Response>;
  connectionLost: (lang: Lang) => string;
}) {
  const [transcript, setTranscript] = useState("");
  const [videoCount, setVideoCount] = useState(10);
  const [duration, setDuration] = useState<string>("auto");
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [titleOptions, setTitleOptions] = useState<Record<number, ShortsTitleOption[]>>({});
  const [selectedTitles, setSelectedTitles] = useState<Record<number, string>>({});
  const [metadata, setMetadata] = useState<Record<number, ShortsMetadataItem>>({});
  const [selectedConcepts, setSelectedConcepts] = useState<Record<number, number>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState<Loading>(null);
  const [usage, setUsage] = useState<Array<{ label: string; usage: ShortsUsage }>>([]);
  const [projects, setProjects] = useState<ShortsProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [descriptProjects, setDescriptProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [descriptProjectId, setDescriptProjectId] = useState("");
  const [includeCta, setIncludeCta] = useState(true);
  const [compositionState, setCompositionState] = useState<"idle" | "running" | "done">("idle");
  const [uploaded, setUploaded] = useState<Record<number, string>>({});
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; title: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<number, { image: string; format: string }>>({});
  const [thumbnailLoading, setThumbnailLoading] = useState<number | null>(null);
  const [kitBuilding, setKitBuilding] = useState(false);
  const [productionRoute, setProductionRoute] = useState<"descript" | "capcut">("descript");

  const titlesReady = shorts.length > 0 && shorts.every((_, index) => Boolean(selectedTitles[index]));
  const metadataReady = shorts.length > 0 && shorts.every((_, index) => Boolean(metadata[index]));
  const stage = metadataReady ? 4 : titlesReady ? 3 : shorts.length ? 2 : 1;

  const refreshProjects = useCallback(() => {
    fetch("/api/shorts-projects").then(response => response.json() as Promise<{ projects?: ShortsProject[] }>)
      .then(data => setProjects(data.projects ?? [])).catch(() => null);
  }, []);
  useEffect(() => { refreshProjects(); }, [refreshProjects]);

  const recordUsage = (label: string, value?: ShortsUsage) => {
    if (value) setUsage(current => [...current, { label, usage: value }]);
  };

  // In an SRT the first lines are a cue number and a timestamp, so name the project
  // after the first line that actually carries words.
  const projectName = () => {
    const spoken = transcript.split(/\n/).map(line => line.trim())
      .find(line => line && !/^\d+$/.test(line) && !line.includes("-->"));
    return spoken?.slice(0, 90) || (lang === "fr" ? "Projet Shorts" : "Shorts project");
  };

  const persist = async (nextStage: number, overrides: Partial<ShortsProject["state"]> = {}) => {
    const state = { transcript, videoCount, duration, shorts, titleOptions, selectedTitles, metadata, ...overrides };
    try {
      const response = await postJson("/api/shorts-projects", { id: activeProjectId || undefined, name: projectName(), stage: nextStage, state });
      const data = await response.json() as { id?: string; error?: string };
      if (response.ok && data.id) { setActiveProjectId(data.id); refreshProjects(); }
      else if (response.status === 413) showToast(lang === "fr" ? "Ce projet est trop volumineux pour être enregistré." : "This project is too large to save.", "warning");
    } catch { /* a save failure must not interrupt the creative flow */ }
  };

  const failure = (error: unknown, fallback: string) => {
    showToast(error instanceof TypeError ? connectionLost(lang) : error instanceof Error ? error.message : fallback, "error");
  };

  const requireKey = () => {
    if (openrouterReady) return true;
    showToast(lang === "fr" ? "Ajoutez votre clé OpenRouter dans Profil & paramètres." : "Add your OpenRouter key in Profile & settings.", "warning");
    return false;
  };

  const analyze = async () => {
    if (loading || !requireKey()) return;
    if (transcript.trim().length < 80) return showToast(lang === "fr" ? "Ajoutez une transcription plus complète (80 caractères minimum)." : "Add a fuller transcript (80 characters minimum).", "warning");
    setLoading("analyze");
    try {
      const response = await postJson("/api/shorts-analyze", { transcript, numberOfVideos: videoCount, durationMinutes: duration, model: writerModel || undefined });
      const data = await response.json() as { shorts?: Array<Partial<ShortItem> & { durationMinutes?: number }>; usage?: ShortsUsage; detail?: string; error?: string };
      if (!response.ok || !data.shorts?.length) throw new Error(data.detail || data.error || "analysis_failed");
      const normalized: ShortItem[] = data.shorts.map((item, index) => {
        const sequences = (item.sequences ?? []).filter(sequence => sequence?.startTime && sequence?.endTime);
        const text = item.text ?? "";
        return {
          title: item.title || `${lang === "fr" ? "Extrait" : "Excerpt"} ${index + 1}`,
          text,
          words: wordsOf(text),
          targetMinutes: Math.min(3, Math.max(1, Math.round(Number(item.durationMinutes) || 1))),
          sequences: sequences.length ? sequences : [{ startTime: item.startTime ?? "00:00", endTime: item.endTime ?? "00:00" }],
          startTime: sequences[0]?.startTime ?? item.startTime ?? "00:00",
          endTime: sequences[sequences.length - 1]?.endTime ?? item.endTime ?? "00:00",
          positionEstimated: Boolean(item.positionEstimated),
        };
      });
      setShorts(normalized);
      setTitleOptions({}); setSelectedTitles({}); setMetadata({}); setSelectedConcepts({}); setExpanded({});
      recordUsage(lang === "fr" ? "Analyse des extraits" : "Excerpt analysis", data.usage);
      showToast(lang === "fr" ? `${normalized.length} extrait(s) proposé(s)` : `${normalized.length} excerpt(s) proposed`);
      await persist(2, { shorts: normalized, titleOptions: {}, selectedTitles: {}, metadata: {} });
    } catch (error) {
      failure(error, lang === "fr" ? "L’analyse a échoué." : "Analysis failed.");
    } finally { setLoading(null); }
  };

  const generateTitles = async () => {
    if (loading || !requireKey() || !shorts.length) return;
    setLoading("titles");
    try {
      const response = await postJson("/api/shorts-titles", { shorts: shorts.map((short, index) => ({ index, text: short.text })), model: writerModel || undefined });
      const data = await response.json() as { results?: Array<{ index: number; titles: ShortsTitleOption[] }>; usage?: ShortsUsage; detail?: string; error?: string };
      if (!response.ok || !data.results?.length) throw new Error(data.detail || data.error || "titles_failed");
      const options: Record<number, ShortsTitleOption[]> = {};
      const chosen: Record<number, string> = {};
      for (const result of data.results) {
        const top = (result.titles ?? []).slice(0, 3);
        if (!top.length) continue;
        options[result.index] = top;
        // Preselect the strongest so the pipeline can move without a click per short.
        chosen[result.index] = top.reduce((best, option) => option.score > best.score ? option : best, top[0]).title;
      }
      setTitleOptions(options); setSelectedTitles(chosen); setMetadata({}); setSelectedConcepts({});
      recordUsage(lang === "fr" ? "Titres" : "Titles", data.usage);
      showToast(lang === "fr" ? "3 titres proposés par short" : "3 titles proposed per short");
      await persist(3, { titleOptions: options, selectedTitles: chosen, metadata: {} });
    } catch (error) {
      failure(error, lang === "fr" ? "Les titres ne sont pas disponibles." : "Titles are unavailable.");
    } finally { setLoading(null); }
  };

  const generateMetadata = async () => {
    if (loading || !requireKey() || !titlesReady) return;
    setLoading("metadata");
    try {
      const items = shorts.map((short, index) => ({ index, title: selectedTitles[index] || short.title, text: short.text }));
      const response = await postJson("/api/shorts-metadata", { items, model: writerModel || undefined });
      const data = await response.json() as { results?: Array<{ index: number } & ShortsMetadataItem>; usage?: ShortsUsage; detail?: string; error?: string };
      if (!response.ok || !data.results?.length) throw new Error(data.detail || data.error || "metadata_failed");
      const next: Record<number, ShortsMetadataItem> = {};
      for (const result of data.results) next[result.index] = { description: result.description, tags: result.tags ?? [], thumbnailConcepts: result.thumbnailConcepts ?? [] };
      setMetadata(next); setSelectedConcepts({});
      recordUsage(lang === "fr" ? "Descriptions, tags et concepts" : "Descriptions, tags and concepts", data.usage);
      showToast(lang === "fr" ? "Fiches YouTube prêtes" : "YouTube metadata ready");
      await persist(4, { metadata: next });
    } catch (error) {
      failure(error, lang === "fr" ? "Les fiches ne sont pas disponibles." : "Metadata is unavailable.");
    } finally { setLoading(null); }
  };

  // Changing the title invalidates the metadata written for the previous one, so the
  // description, tags and concepts can never describe a title that is no longer chosen.
  const chooseTitle = (index: number, title: string) => {
    setSelectedTitles(current => ({ ...current, [index]: title }));
    setMetadata(current => { const next = { ...current }; delete next[index]; return next; });
    setSelectedConcepts(current => { const next = { ...current }; delete next[index]; return next; });
  };

  const openProject = (project: ShortsProject) => {
    const state = project.state ?? {};
    setTranscript(state.transcript ?? "");
    setVideoCount(state.videoCount ?? 10);
    setDuration(state.duration ?? "auto");
    setShorts(state.shorts ?? []);
    setTitleOptions(state.titleOptions ?? {});
    setSelectedTitles(state.selectedTitles ?? {});
    setMetadata(state.metadata ?? {});
    setSelectedConcepts({}); setExpanded({}); setUsage([]);
    setActiveProjectId(project.id);
    setShowHistory(false);
    showToast(lang === "fr" ? `Projet « ${project.name} » rouvert` : `Project “${project.name}” reopened`);
  };

  const deleteProject = async (project: ShortsProject) => {
    try {
      const response = await fetch(`/api/shorts-projects?id=${encodeURIComponent(project.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete_failed");
      if (project.id === activeProjectId) setActiveProjectId("");
      refreshProjects();
      showToast(lang === "fr" ? "Projet supprimé" : "Project deleted");
    } catch {
      showToast(lang === "fr" ? "Suppression impossible." : "Could not delete the project.", "error");
    }
  };

  // One image is generated only after a concept is chosen — the three concepts are free,
  // so the user never pays for two images they will not use.
  const generateThumbnail = async (index: number) => {
    const conceptIndex = selectedConcepts[index];
    const concept = metadata[index]?.thumbnailConcepts[conceptIndex ?? -1];
    if (!concept) return showToast(lang === "fr" ? "Choisissez d’abord un concept." : "Choose a concept first.", "warning");
    if (!openaiReady) return showToast(lang === "fr" ? "Ajoutez votre clé OpenAI dans Profil & paramètres." : "Add your OpenAI key in Profile & settings.", "warning");
    setThumbnailLoading(index);
    try {
      const response = await postJson("/api/openai-image", {
        pipeline: "shorts", model: imageModel, quality: imageQuality,
        prompt: concept.prompt, overlay: concept.overlayText, channel,
        systemPrompt: thumbnailSystemPrompt, referenceKeys, presenterKey,
      });
      const data = await response.json() as { image?: string; format?: string; detail?: string; error?: string };
      if (!response.ok || !data.image) throw new Error(data.detail || data.error || "image_failed");
      setThumbnails(current => ({ ...current, [index]: { image: data.image as string, format: data.format ?? "jpg" } }));
      showToast(lang === "fr" ? "Miniature verticale générée" : "Vertical thumbnail generated");
    } catch (error) {
      showToast(error instanceof TypeError ? connectionLost(lang)
        : (lang === "fr" ? "La génération de la miniature a échoué." : "Thumbnail generation failed."), "error");
    } finally { setThumbnailLoading(null); }
  };

  // The model returns a 9:16 image in its own size family; YouTube wants 720 × 1280,
  // so the exact delivery size is produced here rather than requested upstream.
  const downloadThumbnail = (index: number) => {
    const item = thumbnails[index];
    if (!item) return;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 720; canvas.height = 1280;
      const context = canvas.getContext("2d");
      if (!context) return;
      const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      const link = document.createElement("a");
      link.download = `short-${String(index + 1).padStart(2, "0")}-720x1280.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.92);
      link.click();
    };
    image.src = item.image;
  };

  const downloadCapCutKit = async () => {
    if (kitBuilding) return;
    setKitBuilding(true);
    try {
      // Loaded on demand: JSZip is only needed by people who edit in CapCut.
      const { buildCapCutKit } = await import("./lib/capcut-kit");
      const blob = await buildCapCutKit({ shorts, titles: selectedTitles, metadata, includeCta, lang });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kit-capcut-${shorts.length}-shorts.zip`;
      link.click();
      URL.revokeObjectURL(url);
      showToast(lang === "fr" ? "Kit CapCut téléchargé" : "CapCut kit downloaded");
    } catch {
      showToast(lang === "fr" ? "La création du kit a échoué." : "Building the kit failed.", "error");
    } finally { setKitBuilding(false); }
  };

  const loadDescriptProjects = async () => {
    try {
      const response = await fetch("/api/shorts-descript");
      const data = await response.json() as { projects?: Array<{ id: string; name: string }>; error?: string };
      if (!response.ok) throw new Error(data.error || "descript_unavailable");
      setDescriptProjects(data.projects ?? []);
      if (!data.projects?.length) showToast(lang === "fr" ? "Aucun projet Descript trouvé." : "No Descript project found.", "warning");
    } catch (error) {
      showToast(error instanceof TypeError ? connectionLost(lang)
        : (lang === "fr" ? "Descript est injoignable. Vérifiez la clé dans Paramètres." : "Descript is unreachable. Check the key in Settings."), "error");
    }
  };

  const createCompositions = async () => {
    if (publishing || !descriptProjectId) return;
    setPublishing(true); setCompositionState("running");
    try {
      const response = await postJson("/api/shorts-descript", {
        action: "create_compositions", projectId: descriptProjectId, includeCtaVideo: includeCta,
        shorts: shorts.map((short, index) => ({ title: selectedTitles[index] || short.title, text: short.text, durationMinutes: short.targetMinutes, sequences: short.sequences })),
      });
      const data = await response.json() as { job_id?: string; deduplicated?: boolean; error?: string };
      if (!response.ok || !data.job_id) throw new Error(data.error || "descript_failed");
      setCompositionState("done");
      showToast(data.deduplicated
        ? (lang === "fr" ? "Création déjà en cours dans Descript — suivi repris." : "Creation already running in Descript — tracking resumed.")
        : (lang === "fr" ? "Descript construit les compositions. Vérifiez-les avant l’envoi." : "Descript is building the compositions. Review them before uploading."));
    } catch (error) {
      setCompositionState("idle");
      showToast(error instanceof TypeError ? connectionLost(lang)
        : (lang === "fr" ? "La création des compositions a échoué." : "Composition creation failed."), "error");
    } finally { setPublishing(false); }
  };

  /**
   * One request per short, driven from here. A single request for the whole series
   * would hold a Worker open for tens of minutes and lose every paid render if the
   * connection dropped; here a failure keeps what already landed and the next run
   * resumes at the first short without a video id.
   */
  const publishToYoutube = async (onlyFirst: boolean) => {
    if (publishing || !descriptProjectId) return;
    const pending = shorts.map((short, index) => ({ short, index })).filter(({ index }) => !uploaded[index]);
    const queue = onlyFirst ? pending.slice(0, 1) : pending;
    if (!queue.length) return showToast(lang === "fr" ? "Tous les shorts ont déjà été envoyés." : "Every short has already been uploaded.", "warning");
    setPublishing(true);
    const done: Record<number, string> = {};
    try {
      for (const { short, index } of queue) {
        const title = selectedTitles[index] || short.title;
        setUploadProgress({ current: Object.keys(done).length + 1, total: queue.length, title });
        const response = await postJson("/api/shorts-upload", {
          projectId: descriptProjectId, title,
          description: metadata[index]?.description ?? title,
          tags: metadata[index]?.tags ?? [],
        });
        const data = await response.json().catch(() => ({})) as { videoId?: string; error?: string; title?: string };
        if (!response.ok || !data.videoId) {
          const reason = data.error === "composition_not_found"
            ? (lang === "fr" ? `Aucune composition Descript nommée « ${title} ». Renommez-la à l’identique ou relancez la création.` : `No Descript composition named “${title}”. Rename it to match, or run the creation again.`)
            : data.error === "youtube_not_connected"
              ? (lang === "fr" ? "Connectez votre chaîne YouTube dans Paramètres." : "Connect your YouTube channel in Settings.")
              : (lang === "fr" ? "L’envoi a échoué." : "The upload failed.");
          const kept = Object.keys(done).length;
          showToast(`${reason} ${kept ? (lang === "fr" ? `Les ${kept} short(s) déjà envoyés sont conservés ; relancez pour reprendre.` : `The ${kept} short(s) already uploaded are kept; run again to resume.`) : ""}`.trim(), "error");
          break;
        }
        done[index] = data.videoId;
        setUploaded(current => ({ ...current, [index]: data.videoId as string }));
      }
      const count = Object.keys(done).length;
      if (count) showToast(lang === "fr" ? `${count} short(s) envoyé(s) en privé sur YouTube` : `${count} short(s) uploaded privately to YouTube`);
    } catch (error) {
      showToast(error instanceof TypeError ? connectionLost(lang) : (lang === "fr" ? "L’envoi a été interrompu." : "The upload was interrupted."), "error");
    } finally { setPublishing(false); setUploadProgress(null); }
  };

  const totalCost = usage.reduce((sum, entry) => sum + (entry.usage.cost || 0), 0);
  const busyLabel = loading === "analyze" ? (lang === "fr" ? "L’IA analyse la transcription…" : "AI is analysing the transcript…")
    : loading === "titles" ? (lang === "fr" ? "L’IA écrit les titres…" : "AI is writing the titles…")
    : loading === "metadata" ? (lang === "fr" ? "L’IA prépare les fiches…" : "AI is preparing the metadata…") : "";

  return <div className="pipeline-shorts">
    <div className="page-view shorts-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">{lang === "fr" ? "VIDÉO LONGUE → SHORTS" : "LONG VIDEO → SHORTS"}</span>
          <h1>Shorts Studio</h1>
          <p>{lang === "fr" ? "Une transcription, des extraits autonomes avec leurs timecodes source exacts, leurs titres et leurs fiches YouTube." : "One transcript, self-contained excerpts with their exact source timecodes, titles and YouTube metadata."}</p>
        </div>
        <button className="ghost" onClick={() => { setShowHistory(value => !value); refreshProjects(); }}>▤ {lang === "fr" ? "Historique" : "History"} {projects.length ? `(${projects.length})` : ""}</button>
      </div>

      <div className="shorts-stepper" aria-label="Pipeline Shorts">
        {[
          lang === "fr" ? "Source" : "Source",
          lang === "fr" ? "Extraits" : "Excerpts",
          lang === "fr" ? "Titres" : "Titles",
          lang === "fr" ? "Fiches" : "Metadata",
        ].map((label, index) => <div key={label} className={`shorts-step ${stage > index + 1 ? "done" : stage === index + 1 ? "active" : "todo"}`}>
          <span>{stage > index + 1 ? "✓" : index + 1}</span><small>{label}</small>
        </div>)}
      </div>

      {showHistory && <section className="shorts-history">
        <h2>{lang === "fr" ? "Projets Shorts" : "Shorts projects"}</h2>
        {projects.length === 0
          ? <p className="shorts-empty">{lang === "fr" ? "Aucun projet enregistré pour l’instant." : "No saved project yet."}</p>
          : <ul>{projects.map(project => <li key={project.id}>
              <div><strong>{project.name}</strong><small>{lang === "fr" ? `Étape ${project.stage} sur 4` : `Stage ${project.stage} of 4`} · {new Date(project.updatedAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")}</small></div>
              <div className="shorts-history-actions">
                <button onClick={() => openProject(project)}>{lang === "fr" ? "Rouvrir" : "Reopen"}</button>
                <button className="danger" onClick={() => deleteProject(project)}>{lang === "fr" ? "Supprimer" : "Delete"}</button>
              </div>
            </li>)}</ul>}
      </section>}

      {!openrouterReady && <div className="shorts-setup-notice"><span>!</span><div><strong>{lang === "fr" ? "Clé OpenRouter requise" : "OpenRouter key required"}</strong><p>{lang === "fr" ? "Shorts Studio utilise le même compte que Script Studio." : "Shorts Studio uses the same account as Script Studio."}</p></div><button onClick={openSettings}>{lang === "fr" ? "Configurer" : "Configure"} →</button></div>}

      <section className="shorts-source">
        <div className="shorts-section-head"><span className="section-number">01</span><div><h2>{lang === "fr" ? "Source" : "Source"}</h2><p>{lang === "fr" ? "Collez la transcription de votre vidéo longue. Une transcription SRT horodatée donne les timecodes exacts ; sans horodatage, ils sont estimés et signalés comme tels." : "Paste the transcript of your long video. A timed SRT transcript yields exact timecodes; without timestamps they are estimated and flagged as such."}</p></div></div>
        <label className="shorts-field"><span>{lang === "fr" ? "Transcription" : "Transcript"}</span>
          <textarea value={transcript} rows={12} onChange={event => setTranscript(event.target.value)} placeholder={lang === "fr" ? "Collez ici la transcription complète (TXT ou SRT)…" : "Paste the full transcript here (TXT or SRT)…"} />
          <em>{wordsOf(transcript).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB")} {lang === "fr" ? "mots" : "words"}{/-->/.test(transcript) ? (lang === "fr" ? " · horodatage SRT détecté" : " · SRT timing detected") : ""}</em>
        </label>
        <div className="shorts-settings">
          <label><span>{lang === "fr" ? "Nombre de shorts" : "Number of shorts"}</span><input type="number" min={1} max={50} value={videoCount} onChange={event => setVideoCount(Math.min(50, Math.max(1, Math.round(Number(event.target.value) || 1))))} /></label>
          <div className="shorts-durations"><span>{lang === "fr" ? "Durée par extrait" : "Length per excerpt"}</span>
            <div>{DURATIONS.map(option => <button key={option.value} className={duration === option.value ? "active" : ""} onClick={() => setDuration(option.value)}>
              <strong>{lang === "fr" ? option.fr : option.en}</strong><small>{lang === "fr" ? option.detailFr : option.detailEn}</small>
            </button>)}</div>
          </div>
        </div>
        <div className="shorts-actions">
          <button className="primary" onClick={analyze} disabled={loading !== null || !transcript.trim()}>{loading === "analyze" ? busyLabel : `✦ ${lang === "fr" ? `Créer ${videoCount} extrait${videoCount > 1 ? "s" : ""}` : `Create ${videoCount} excerpt${videoCount > 1 ? "s" : ""}`}`}</button>
        </div>
      </section>

      {shorts.length > 0 && <section className="shorts-results">
        <div className="shorts-section-head"><span className="section-number">02</span><div><h2>{lang === "fr" ? "Extraits" : "Excerpts"}</h2><p>{lang === "fr" ? "Chaque carte contient le texte exact et toutes ses séquences source, même non consécutives." : "Each card holds the exact text and all its source sequences, including non-consecutive ones."}</p></div>
          <button className="ghost" onClick={generateTitles} disabled={loading !== null}>{loading === "titles" ? busyLabel : (Object.keys(titleOptions).length ? (lang === "fr" ? "↻ Régénérer les titres" : "↻ Regenerate titles") : (lang === "fr" ? "Créer 3 titres par short" : "Create 3 titles per short"))}</button>
        </div>

        <div className="shorts-grid">{shorts.map((short, index) => {
          const isExpanded = Boolean(expanded[index]);
          const item = metadata[index];
          return <article className="short-card" key={`${index}-${short.startTime}`}>
            <header>
              <div><span className="short-index">SHORT {String(index + 1).padStart(2, "0")}</span><h3>{selectedTitles[index] || short.title}</h3></div>
              <div className="short-metrics"><span><b>{short.targetMinutes}</b> min</span><span><b>{short.words}</b> {lang === "fr" ? "mots" : "words"}</span></div>
            </header>

            <div className={isExpanded ? "short-excerpt expanded" : "short-excerpt"}><p>{short.text}</p></div>
            <div className="short-excerpt-actions">
              <button onClick={() => setExpanded(current => ({ ...current, [index]: !isExpanded }))}>{isExpanded ? (lang === "fr" ? "Réduire le texte" : "Collapse text") : (lang === "fr" ? "Lire l’extrait complet" : "Read the full excerpt")}</button>
              <button onClick={() => copy(short.text)}>⧉ {lang === "fr" ? "Copier" : "Copy"}</button>
            </div>

            <div className="short-sequences">
              <div className="short-sequences-head"><span>{lang === "fr" ? "Séquences source" : "Source sequences"}</span>{short.positionEstimated && <small>{lang === "fr" ? "horaires estimés" : "estimated timing"}</small>}</div>
              <ol>{short.sequences.map((sequence, sequenceIndex) => <li key={`${sequence.startTime}-${sequence.endTime}-${sequenceIndex}`}><b>{sequenceIndex + 1}</b><span>{sequence.startTime}</span><i /><span>{sequence.endTime}</span></li>)}</ol>
            </div>

            {titleOptions[index]?.length > 0 && <fieldset className="short-titles">
              <legend>{lang === "fr" ? "Choisis le meilleur titre" : "Choose the best title"}</legend>
              {titleOptions[index].map(option => <label key={option.title} className={selectedTitles[index] === option.title ? "short-title selected" : "short-title"}>
                <input type="radio" name={`short-title-${index}`} checked={selectedTitles[index] === option.title} onChange={() => chooseTitle(index, option.title)} />
                <span className="short-title-score">{option.score}<small>%</small></span>
                <span><strong>{option.title}</strong>{option.reason && <small>{option.reason}</small>}</span>
              </label>)}
              <p className="short-score-note">{lang === "fr" ? "Scores éditoriaux estimés par l’IA — ils ne proviennent pas d’un compte vidIQ." : "Editorial scores estimated by AI — they do not come from a vidIQ account."}</p>
            </fieldset>}

            {item && <div className="short-metadata">
              <div className="short-metadata-card"><div><span>{lang === "fr" ? "Description YouTube" : "YouTube description"}</span><button onClick={() => copy(item.description)}>⧉ {lang === "fr" ? "Copier" : "Copy"}</button></div><p>{item.description}</p></div>
              <div className="short-metadata-card"><div><span>{lang === "fr" ? "Tags YouTube" : "YouTube tags"}</span><button onClick={() => copy(commaSeparatedTags(item.tags))}>⧉ {lang === "fr" ? "Copier" : "Copy"}</button></div><p className="short-tags">{commaSeparatedTags(item.tags)}</p></div>
              <fieldset className="short-concepts">
                <legend>{lang === "fr" ? "Concept de miniature" : "Thumbnail concept"}</legend>
                <p className="short-concepts-help">{lang === "fr" ? "Les concepts sont gratuits. La génération d’image arrive à l’étape suivante de l’intégration." : "Concepts are free. Image generation arrives in the next integration step."}</p>
                {item.thumbnailConcepts.map((concept, conceptIndex) => <label key={`${concept.name}-${conceptIndex}`} className={selectedConcepts[index] === conceptIndex ? "short-concept selected" : "short-concept"}>
                  <input type="radio" name={`short-concept-${index}`} checked={selectedConcepts[index] === conceptIndex} onChange={() => setSelectedConcepts(current => ({ ...current, [index]: conceptIndex }))} />
                  <span className="short-concept-number">{conceptIndex + 1}</span>
                  <span className="short-concept-copy">
                    <strong>{concept.name}</strong><small>{concept.hook}</small>
                    <span><b>{lang === "fr" ? "Visuel" : "Visual"}</b>{concept.visual}</span>
                    <span><b>{lang === "fr" ? "Texte" : "Text"}</b>« {concept.overlayText} »</span>
                    <span><b>Palette</b>{concept.palette}</span>
                  </span>
                </label>)}
              </fieldset>
              <div className="short-thumbnail-actions">
                <button className="primary" onClick={() => generateThumbnail(index)} disabled={selectedConcepts[index] === undefined || thumbnailLoading !== null}>
                  {thumbnailLoading === index ? (lang === "fr" ? "Création…" : "Creating…") : thumbnails[index] ? (lang === "fr" ? "↻ Régénérer la miniature" : "↻ Regenerate thumbnail") : (lang === "fr" ? "✦ Générer cette miniature" : "✦ Generate this thumbnail")}
                </button>
                {thumbnails[index] && <button onClick={() => downloadThumbnail(index)}>↓ {lang === "fr" ? "Télécharger" : "Download"}</button>}
              </div>
              {thumbnails[index] && <figure className="short-thumbnail">
                <img src={thumbnails[index].image} alt={`${lang === "fr" ? "Miniature" : "Thumbnail"} ${index + 1}`} />
                <figcaption>{lang === "fr" ? "Miniature Short · 720 × 1280" : "Short thumbnail · 720 × 1280"}</figcaption>
              </figure>}
            </div>}
          </article>;
        })}</div>

        {titlesReady && <div className="shorts-next"><div><span className="section-number small">03</span><div><strong>{lang === "fr" ? "Finalisez les fiches YouTube" : "Finalise the YouTube metadata"}</strong><small>{lang === "fr" ? "Description, 8 tags et 3 concepts de miniature par short." : "Description, 8 tags and 3 thumbnail concepts per short."}</small></div></div>
          <button className="primary" onClick={generateMetadata} disabled={loading !== null}>{loading === "metadata" ? busyLabel : (metadataReady ? (lang === "fr" ? "↻ Régénérer les fiches" : "↻ Regenerate metadata") : (lang === "fr" ? "Créer fiches et concepts" : "Create metadata and concepts"))}</button>
        </div>}

        {metadataReady && <section className="shorts-publish">
          <div className="shorts-section-head"><span className="section-number">04</span><div><h2>{lang === "fr" ? "Production" : "Production"}</h2><p>{lang === "fr" ? "Descript crée une composition verticale par short. Vérifiez-les dans Descript, puis envoyez-les sur YouTube — toujours en privé." : "Descript creates one vertical composition per short. Review them in Descript, then upload to YouTube — always privately."}</p></div></div>

          <div className="shorts-route-choice">
            <button className={productionRoute === "descript" ? "active" : ""} onClick={() => setProductionRoute("descript")}>
              <strong>Descript</strong><small>{lang === "fr" ? "Compositions créées automatiquement, puis envoi vers YouTube" : "Compositions built automatically, then uploaded to YouTube"}</small>
            </button>
            <button className={productionRoute === "capcut" ? "active" : ""} onClick={() => setProductionRoute("capcut")}>
              <strong>CapCut</strong><small>{lang === "fr" ? "Kit de montage à importer : plan, timecodes, sous-titres et fiches" : "An editing kit to import: plan, timecodes, subtitles and metadata"}</small>
            </button>
          </div>

          {productionRoute === "capcut" ? <div className="shorts-capcut">
            <p>{lang === "fr" ? "CapCut ne propose pas de connexion publique permettant de construire une timeline automatiquement. Le kit prépare tout le reste : le plan de coupe avec chaque timecode, les sous-titres au format SRT, les titres, descriptions et tags, et un guide de montage." : "CapCut offers no public API to build a timeline automatically. The kit prepares everything else: the cut plan with every timecode, SRT subtitles, titles, descriptions and tags, and an editing guide."}</p>
            <label className="shorts-cta-toggle"><input type="checkbox" checked={includeCta} onChange={event => setIncludeCta(event.target.checked)} /><span>{lang === "fr" ? "Inclure la vidéo CTA dans le kit" : "Include the CTA video in the kit"}</span></label>
            <div className="shorts-publish-actions">
              <button className="primary" onClick={downloadCapCutKit} disabled={kitBuilding}>{kitBuilding ? (lang === "fr" ? "Préparation…" : "Preparing…") : `↓ ${lang === "fr" ? "Télécharger le kit CapCut" : "Download the CapCut kit"}`}</button>
              <a className="shorts-capcut-link" href="https://www.capcut.com/editor" target="_blank" rel="noreferrer">{lang === "fr" ? "Ouvrir CapCut Web" : "Open CapCut Web"} →</a>
            </div>
          </div> : <>

          <div className="shorts-publish-row">
            <label><span>{lang === "fr" ? "Projet Descript" : "Descript project"}</span>
              <select value={descriptProjectId} onChange={event => setDescriptProjectId(event.target.value)}>
                <option value="">{descriptProjects.length ? (lang === "fr" ? "Choisir un projet…" : "Choose a project…") : (lang === "fr" ? "Aucun projet chargé" : "No project loaded")}</option>
                {descriptProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <button className="ghost" onClick={loadDescriptProjects} disabled={publishing}>{lang === "fr" ? "Charger mes projets" : "Load my projects"}</button>
            <label className="shorts-cta-toggle"><input type="checkbox" checked={includeCta} onChange={event => setIncludeCta(event.target.checked)} /><span>{lang === "fr" ? "Ajouter la vidéo CTA à la fin" : "Append the CTA video"}</span></label>
          </div>

          <div className="shorts-publish-actions">
            <button className="primary" onClick={createCompositions} disabled={publishing || !descriptProjectId}>
              {compositionState === "running" ? (lang === "fr" ? "Création en cours…" : "Creating…") : `${lang === "fr" ? `Créer ${shorts.length} composition(s) dans Descript` : `Create ${shorts.length} composition(s) in Descript`}`}
            </button>
            <p className="shorts-publish-note">{lang === "fr" ? "La composition source n’est jamais modifiée : de nouvelles compositions sont créées, nommées avec les titres retenus." : "The source composition is never modified: new ones are created, named after the chosen titles."}</p>
          </div>

          <div className="shorts-publish-divider"><span>{lang === "fr" ? "Puis, après vérification dans Descript" : "Then, after reviewing in Descript"}</span></div>

          <div className="shorts-publish-actions">
            <button className="ghost" onClick={() => publishToYoutube(true)} disabled={publishing || !descriptProjectId}>{lang === "fr" ? "Tester avec 1 vidéo" : "Test with 1 video"}</button>
            <button className="primary" onClick={() => publishToYoutube(false)} disabled={publishing || !descriptProjectId}>
              {uploadProgress
                ? (lang === "fr" ? `Envoi ${uploadProgress.current}/${uploadProgress.total} — ${uploadProgress.title}…` : `Uploading ${uploadProgress.current}/${uploadProgress.total} — ${uploadProgress.title}…`)
                : (lang === "fr" ? `Envoyer ${shorts.length - Object.keys(uploaded).length} short(s) sur YouTube` : `Upload ${shorts.length - Object.keys(uploaded).length} short(s) to YouTube`)}
            </button>
          </div>
          {Object.keys(uploaded).length > 0 && <ul className="shorts-uploaded">{Object.entries(uploaded).map(([index, videoId]) => <li key={videoId}><b>✓</b><span>{selectedTitles[Number(index)] || shorts[Number(index)]?.title}</span><small>{lang === "fr" ? "privée" : "private"} · {videoId}</small></li>)}</ul>}
          <p className="shorts-publish-note">{lang === "fr" ? "Chaque short part dans sa propre requête : une coupure ne fait perdre que celui en cours, et relancer reprend au premier short manquant." : "Each short travels in its own request: an interruption only costs the one in flight, and running again resumes at the first missing short."}</p>
          </>}
        </section>}
      </section>}

      {usage.length > 0 && <details className="shorts-usage"><summary>{lang === "fr" ? "Coûts IA de la session" : "Session AI costs"} · ${totalCost.toFixed(4)}</summary>
        <ul>{usage.map((entry, index) => <li key={`${entry.label}-${index}`}><span>{entry.label}</span><small>{entry.usage.model}{entry.usage.cacheHit ? (lang === "fr" ? " · depuis le cache" : " · from cache") : ""}</small><b>${(entry.usage.cost || 0).toFixed(4)}</b></li>)}</ul>
      </details>}
    </div>
  </div>;
}
