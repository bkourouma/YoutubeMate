/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { serverErrorMessage } from "./lib/errors";

type Lang = "fr" | "en";
type AlertKind = "success" | "warning" | "error";

type TitleOption = { title: string; score: number; reason?: string };
type ThumbnailConcept = { name: string; hook: string; visual: string; overlayText: string; palette: string; prompt: string };
type ExpressPackage = { titles: TitleOption[]; description: string; tags: string[]; thumbnailConcepts: ThumbnailConcept[] };
type Row = {
  originalTitle: string;
  package: ExpressPackage;
  selectedTitle: string;
  selectedConcept: number;
  thumbnail?: { image: string; format: string };
};

const MAX_BULK = 10;
const DEFAULT_SUFFIX = "#ia #shorts #innovation";

const bestOf = (titles: TitleOption[]) => titles.reduce((best, option) => option.score > best.score ? option : best, titles[0]);

export function ShortsExpress({ lang, openrouterReady, openaiReady, writerModel, imageModel, imageQuality, channel, thumbnailSystemPrompt, referenceKeys, presenterKey, profile, showToast, copy, openSettings, postJson, connectionLost }: {
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
  profile: { channel: string; theme: string; audience: string; tone: string; descriptionFooter?: string };
  showToast: (message: string, kind?: AlertKind) => void;
  copy: (value: string) => void;
  openSettings: () => void;
  postJson: (url: string, payload: unknown, onRetry?: () => void) => Promise<Response>;
  connectionLost: (lang: Lang) => string;
}) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [singleTitle, setSingleTitle] = useState("");
  const [bulkTitles, setBulkTitles] = useState("");
  const [suffix, setSuffix] = useState(DEFAULT_SUFFIX);
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState<number | null>(null);

  const finalTitle = (row: Row) => `${row.selectedTitle}${suffix.trim() ? ` ${suffix.trim()}` : ""}`;

  const requireKey = () => {
    if (openrouterReady) return true;
    showToast(lang === "fr" ? "Ajoutez votre clé OpenRouter dans Profil & paramètres." : "Add your OpenRouter key in Profile & settings.", "warning");
    return false;
  };

  const requestPackage = async (originalTitle: string) => {
    const response = await postJson("/api/shorts-express", { originalTitle, model: writerModel || undefined, language: lang, profile });
    const data = await response.json() as { package?: ExpressPackage; detail?: string; error?: string };
    if (!response.ok || !data.package) throw new Error(data.detail || data.error || "express_failed");
    return data.package;
  };

  const generateSingle = async () => {
    if (busy || !requireKey()) return;
    const title = singleTitle.trim();
    if (!title) return showToast(lang === "fr" ? "Saisissez le titre de votre vidéo." : "Enter the title of your video.", "warning");
    setBusy(true);
    try {
      const result = await requestPackage(title);
      setRows([{ originalTitle: title, package: result, selectedTitle: bestOf(result.titles).title, selectedConcept: 0 }]);
      showToast(lang === "fr" ? "Package prêt" : "Package ready");
    } catch (error) {
      showToast(error instanceof Error ? serverErrorMessage(error, lang, "openrouter") : (lang === "fr" ? "Le packaging a échoué." : "Packaging failed."), "error");
    } finally { setBusy(false); }
  };

  /**
   * Sequential on purpose: ten parallel calls would spike the provider's rate limit,
   * and a failure part-way keeps the packages already produced.
   */
  const generateBulk = async () => {
    if (busy || !requireKey()) return;
    const titles = bulkTitles.split("\n").map(line => line.trim()).filter(Boolean).slice(0, MAX_BULK);
    if (!titles.length) return showToast(lang === "fr" ? "Ajoutez au moins un titre, un par ligne." : "Add at least one title, one per line.", "warning");
    setBusy(true);
    const produced: Row[] = [];
    try {
      for (const [index, title] of titles.entries()) {
        setProgress({ current: index + 1, total: titles.length });
        try {
          const result = await requestPackage(title);
          produced.push({ originalTitle: title, package: result, selectedTitle: bestOf(result.titles).title, selectedConcept: 0 });
          setRows([...produced]);
        } catch (error) {
          if (error instanceof TypeError) throw error;
          showToast(lang === "fr" ? `« ${title} » n’a pas pu être préparé.` : `“${title}” could not be prepared.`, "warning");
        }
      }
      if (produced.length) showToast(lang === "fr" ? `${produced.length} package(s) préparé(s)` : `${produced.length} package(s) prepared`);
    } catch (error) {
      showToast(error instanceof TypeError ? connectionLost(lang) : (lang === "fr" ? "La préparation a été interrompue." : "Preparation was interrupted."), "error");
    } finally { setBusy(false); setProgress(null); }
  };

  const generateImage = async (index: number) => {
    const row = rows[index];
    if (!row || imageBusy !== null) return;
    if (!openaiReady) return showToast(lang === "fr" ? "Ajoutez votre clé OpenAI dans Profil & paramètres." : "Add your OpenAI key in Profile & settings.", "warning");
    const concept = row.package.thumbnailConcepts[row.selectedConcept];
    setImageBusy(index);
    try {
      const response = await postJson("/api/openai-image", {
        pipeline: "shorts", model: imageModel, quality: imageQuality,
        prompt: concept.prompt, overlay: concept.overlayText, channel,
        systemPrompt: thumbnailSystemPrompt, referenceKeys, presenterKey,
      });
      const data = await response.json() as { image?: string; format?: string; detail?: string; error?: string };
      if (!response.ok || !data.image) throw new Error(data.detail || data.error || "image_failed");
      setRows(current => current.map((item, position) => position === index ? { ...item, thumbnail: { image: data.image as string, format: data.format ?? "jpg" } } : item));
      showToast(lang === "fr" ? "Miniature générée" : "Thumbnail generated");
    } catch (error) {
      showToast(error instanceof TypeError ? connectionLost(lang) : (lang === "fr" ? "La génération de la miniature a échoué." : "Thumbnail generation failed."), "error");
    } finally { setImageBusy(null); }
  };

  const generateAllImages = async () => {
    for (const [index, row] of rows.entries()) if (!row.thumbnail) await generateImage(index);
  };

  // The model returns 9:16 in its own size family; YouTube wants exactly 720 x 1280.
  const download = (index: number) => {
    const row = rows[index];
    if (!row?.thumbnail) return;
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
      link.download = `express-${String(index + 1).padStart(2, "0")}-720x1280.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.92);
      link.click();
    };
    image.src = row.thumbnail.image;
  };

  const setRow = (index: number, patch: Partial<Row>) => setRows(current => current.map((item, position) => position === index ? { ...item, ...patch } : item));

  return <div className="pipeline-shorts">
    <div className="page-view shorts-page">
      <div className="page-title"><div>
        <span className="eyebrow">{lang === "fr" ? "SHORT DÉJÀ MONTÉ" : "SHORT ALREADY EDITED"}</span>
        <h1>{lang === "fr" ? "Publication express · Shorts" : "Express publishing · Shorts"}</h1>
        <p>{lang === "fr" ? "Pour les shorts déjà tournés et montés : d’un titre de travail à son titre optimisé, sa description, ses tags et sa miniature verticale. Aucune transcription requise." : "For shorts already shot and edited: from a working title to its optimised title, description, tags and vertical thumbnail. No transcript needed."}</p>
      </div></div>

      {!openrouterReady && <div className="shorts-setup-notice"><span>!</span><div><strong>{lang === "fr" ? "Clé OpenRouter requise" : "OpenRouter key required"}</strong><p>{lang === "fr" ? "Le même compte que le reste de YoutubeMate." : "The same account as the rest of YoutubeMate."}</p></div><button onClick={openSettings}>{lang === "fr" ? "Configurer" : "Configure"} →</button></div>}

      <section className="shorts-source">
        <div className="shorts-route-choice">
          <button className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>
            <strong>{lang === "fr" ? "Une vidéo" : "One video"}</strong><small>{lang === "fr" ? "Vous choisissez le titre et le concept" : "You choose the title and the concept"}</small>
          </button>
          <button className={mode === "bulk" ? "active" : ""} onClick={() => setMode("bulk")}>
            <strong>{lang === "fr" ? `Bulk · jusqu’à ${MAX_BULK} vidéos` : `Bulk · up to ${MAX_BULK} videos`}</strong><small>{lang === "fr" ? "Sélection automatique du meilleur titre" : "The best title is selected automatically"}</small>
          </button>
        </div>

        {mode === "single"
          ? <label className="shorts-field"><span>{lang === "fr" ? "Titre de travail" : "Working title"}</span>
              <input value={singleTitle} maxLength={220} onChange={event => setSingleTitle(event.target.value)} placeholder={lang === "fr" ? "Ex. Pourquoi ChatGPT se trompe sur les chiffres" : "E.g. Why ChatGPT gets numbers wrong"} onKeyDown={event => { if (event.key === "Enter") generateSingle(); }} />
            </label>
          : <label className="shorts-field"><span>{lang === "fr" ? "Titres de travail — un par ligne" : "Working titles — one per line"}</span>
              <textarea rows={7} value={bulkTitles} onChange={event => setBulkTitles(event.target.value)} placeholder={lang === "fr" ? "Un titre par ligne…" : "One title per line…"} />
              <em>{bulkTitles.split("\n").filter(line => line.trim()).length} / {MAX_BULK}</em>
            </label>}

        <label className="shorts-field"><span>{lang === "fr" ? "Hashtags ajoutés au titre final" : "Hashtags appended to the final title"}</span>
          <input value={suffix} maxLength={80} onChange={event => setSuffix(event.target.value)} placeholder={lang === "fr" ? "Laissez vide pour n’en ajouter aucun" : "Leave empty to add none"} />
        </label>

        <div className="shorts-actions">
          <button className="primary" onClick={mode === "single" ? generateSingle : generateBulk} disabled={busy}>
            {busy
              ? (progress ? (lang === "fr" ? `Préparation ${progress.current}/${progress.total}…` : `Preparing ${progress.current}/${progress.total}…`) : (lang === "fr" ? "Préparation…" : "Preparing…"))
              : `✦ ${mode === "single" ? (lang === "fr" ? "Proposer le package" : "Propose the package") : (lang === "fr" ? "Générer les packages" : "Generate the packages")}`}
          </button>
        </div>
      </section>

      {rows.length > 0 && <section className="shorts-results">
        <div className="shorts-section-head"><span className="section-number">02</span><div><h2>{lang === "fr" ? "Packages" : "Packages"}</h2><p>{lang === "fr" ? "Scores éditoriaux estimés par l’IA — ils ne proviennent pas d’un compte vidIQ." : "Editorial scores estimated by AI — they do not come from a vidIQ account."}</p></div>
          {rows.length > 1 && <button className="ghost" onClick={generateAllImages} disabled={imageBusy !== null}>{lang === "fr" ? "Générer toutes les miniatures" : "Generate all thumbnails"}</button>}
        </div>

        <div className="shorts-grid">{rows.map((row, index) => <article className="short-card" key={`${row.originalTitle}-${index}`}>
          <header><div><span className="short-index">{lang === "fr" ? "TITRE DE TRAVAIL" : "WORKING TITLE"}</span><h3>{row.originalTitle}</h3></div></header>

          <fieldset className="short-titles">
            <legend>{lang === "fr" ? "Titre final" : "Final title"}</legend>
            {row.package.titles.map(option => <label key={option.title} className={row.selectedTitle === option.title ? "short-title selected" : "short-title"}>
              <input type="radio" name={`express-title-${index}`} checked={row.selectedTitle === option.title} onChange={() => setRow(index, { selectedTitle: option.title })} />
              <span className="short-title-score">{option.score}<small>%</small></span>
              <span><strong>{option.title}</strong>{option.reason && <small>{option.reason}</small>}</span>
            </label>)}
          </fieldset>

          <div className="short-metadata">
            <div className="short-metadata-card"><div><span>{lang === "fr" ? "Titre à copier" : "Title to copy"}</span><button onClick={() => copy(finalTitle(row))}>⧉ {lang === "fr" ? "Copier" : "Copy"}</button></div><p>{finalTitle(row)}</p></div>
            <div className="short-metadata-card"><div><span>Description</span><button onClick={() => copy(row.package.description)}>⧉ {lang === "fr" ? "Copier" : "Copy"}</button></div><p>{row.package.description}</p></div>
            <div className="short-metadata-card"><div><span>Tags</span><button onClick={() => copy(row.package.tags.join(", "))}>⧉ {lang === "fr" ? "Copier" : "Copy"}</button></div><p className="short-tags">{row.package.tags.join(", ")}</p></div>

            <fieldset className="short-concepts">
              <legend>{lang === "fr" ? "Concept de miniature" : "Thumbnail concept"}</legend>
              <p className="short-concepts-help">{lang === "fr" ? "Les concepts sont gratuits. Une seule image est créée après votre choix." : "Concepts are free. A single image is created after your choice."}</p>
              {row.package.thumbnailConcepts.map((concept, conceptIndex) => <label key={`${concept.name}-${conceptIndex}`} className={row.selectedConcept === conceptIndex ? "short-concept selected" : "short-concept"}>
                <input type="radio" name={`express-concept-${index}`} checked={row.selectedConcept === conceptIndex} onChange={() => setRow(index, { selectedConcept: conceptIndex })} />
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
              <button className="primary" onClick={() => generateImage(index)} disabled={imageBusy !== null}>
                {imageBusy === index ? (lang === "fr" ? "Création…" : "Creating…") : row.thumbnail ? (lang === "fr" ? "↻ Régénérer la miniature" : "↻ Regenerate thumbnail") : (lang === "fr" ? "✦ Générer cette miniature" : "✦ Generate this thumbnail")}
              </button>
              {row.thumbnail && <button onClick={() => download(index)}>↓ {lang === "fr" ? "Télécharger" : "Download"}</button>}
            </div>
            {row.thumbnail && <figure className="short-thumbnail">
              <img src={row.thumbnail.image} alt={`${lang === "fr" ? "Miniature" : "Thumbnail"} ${index + 1}`} />
              <figcaption>{lang === "fr" ? "Miniature Short · 720 × 1280" : "Short thumbnail · 720 × 1280"}</figcaption>
            </figure>}
          </div>
        </article>)}</div>
      </section>}
    </div>
  </div>;
}
