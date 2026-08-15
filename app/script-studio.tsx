/* eslint-disable @next/next/no-img-element, jsx-a11y/label-has-associated-control */
"use client";
import { connectionLostMessage, serverErrorMessage } from "./lib/errors";
import { TAG_LIMIT, joinTags, mergeTags, parseTagList } from "./lib/tags";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShortsStudio } from "./shorts-studio";
import { CreditsUsage } from "./credits-usage";
import { ShortsExpress } from "./shorts-express";

type Lang = "fr" | "en";
type View = "studio" | "shorts" | "express" | "shorts-express" | "projects" | "usage" | "profile";
type StepState = "done" | "active" | "todo";
type HookIterationTarget = "hook" | "promise" | "both";
type NoticeKind = "warning" | "error";
type AlertKind = "success" | NoticeKind;
type AlertItem = { id: string; message: string; kind: AlertKind; count: number; auto: boolean };

type Profile = {
  channel: string; theme: string; primary: string; secondary: string; audience: string;
  tone: string; presentation: string; launch: string; closing: string; contacts: string;
  offer: string; duration: string; youtubeConnected: boolean; vidiqConnected: boolean;
  thumbnailSystemPrompt?: string;
  descriptionFooter?: string;
  defaultTags?: string;
};

type Chapter = {
  id: string; title: string; objective: string; keyPoints: string[]; targetWords: number;
};

type BodySection = { id: string; script: string; transition: string };

type Project = {
  id: string; title: string; subject: string; status: string; updated: string; step: number;
  confirmed: boolean; completed: number[]; hook: string; promise: string; body: string;
  conclusion: string; reviewAccepted: boolean; hookGeneratedByAi?: boolean; packageAnswers: { visual: string; timecodes: string; links: string };
  workflowVersion: 2; chapters: Chapter[]; bodyWordTarget: number; bodyGeneratedByAi?: boolean; bodyModel?: string;
  // Completed-chapter prefix of an interrupted body generation; lets a retry resume
  // instead of regenerating paid chapters. Cleared on success and on any invalidation.
  bodySections?: BodySection[];
  // Step 7 packaging, persisted so revisiting the step never re-runs a paid generation.
  packaging?: ExpressState;
};

type ThumbnailConcept = { name: string; prompt: string };
type PackagingOption = {
  id: "A" | "B" | "C"; register: string; title: string; description: string; overlay: string;
  englishTitle?: string; englishDescription?: string;
  concepts: ThumbnailConcept[];
};
type PackagingResult = {
  topic: string; options: PackagingOption[]; improvedDescription: string; tags: string[];
  pinnedComment?: string;
  quiz: Array<{ question: string; options?: string[]; correctOption?: number; answer?: string }>;
};
type OpenRouterModel = {
  id: string; name: string; contextLength: number | null; inputPerToken: number; outputPerToken: number; supportsImages: boolean;
  supportsReasoning: boolean; supportsStructuredOutputs: boolean; supportsWriter: boolean; supportedEfforts: string[] | null;
};
type ReferenceThumbnail = { key: string; name: string; contentType: string; size: number; uploadedAt: string; url: string };
// Model choices only. API keys never live in the browser: they are stored encrypted
// per user on the server and resolved by each route.
type AiSettings = {
  openrouterModel: string; writerModel: string; visionModel: string;
  imageModel: "gpt-image-2" | "gpt-image-1.5"; imageQuality: "low" | "medium" | "high";
};
type IntegrationService = "openrouter" | "openai" | "descript";
type IntegrationState = { configured: boolean; source: "user" | "environment" | "none"; last4: string; updatedAt: string | null };
type Integrations = Record<IntegrationService, IntegrationState>;
type YoutubeState = { connected: boolean; channelName: string | null; updatedAt: string | null };

const emptyIntegrations: Integrations = {
  openrouter: { configured: false, source: "none", last4: "", updatedAt: null },
  openai: { configured: false, source: "none", last4: "", updatedAt: null },
  descript: { configured: false, source: "none", last4: "", updatedAt: null },
};

type ExpressState = {
  inputType: "script" | "description";
  source: string;
  subject: string;
  generated: boolean;
  selected: Record<string, number>;
  thumbnailsGenerated: boolean;
  package?: PackagingResult;
  vidiqScores?: Record<string, number>;
  vidiqStatus?: "idle" | "loading" | "synced" | "error";
};

const expressDefault: ExpressState = {
  inputType: "script",
  source: "",
  subject: "",
  generated: false,
  selected: { A: 0, B: 0, C: 0 },
  thumbnailsGenerated: false,
  vidiqScores: {},
  vidiqStatus: "idle",
};

const profileDemo: Profile = {
  channel: "Envol IA",
  theme: "Vulgarisation de l’IA pour un public africain",
  primary: "Français", secondary: "English",
  audience: "Freelances, entrepreneurs et créateurs de contenu à Abidjan, Douala, Dakar et Cotonou. Niveau débutant à intermédiaire.",
  tone: "Tutoiement, oral, zéro jargon, analogies du quotidien.",
  presentation: "Je m'appelle Baba Kourouma. Je suis titulaire d'un master en génie logiciel à Atlanta, aux États-Unis. Je suis expert en IA et automatisation. Je suis revenu en Afrique pour contribuer à la révolution de l'intelligence artificielle. L'Afrique a raté l'industrialisation, mais la révolution de l'IA, cette révolution-là, on peut et on doit la prendre. Cette chaîne est là pour ça. Chaque semaine, je te montre des contenus qui vont te permettre de maîtriser l'IA, des contenus qui vont te permettre de réellement te faire avancer dans le travail au quotidien. N'oublie pas de t'abonner et d'activer la cloche de notification pour que tu puisses recevoir nos vidéos et aussi pour nous encourager.",
  launch: "Tu es prêt ? Let's go !",
  closing: "Si tu as aimé, liker et n'oublie pas de t'abonner pour recevoir nos prochaines vidéos.",
  contacts: "Consultance +225 07 07 66 41 05 · allianceconsultants.net · Groupe WhatsApp",
  offer: "Entreprises : diagnostic IA, agents IA sur mesure et formation. Indépendants : accompagnement individuel et assistant IA métier.",
  duration: "8–12 minutes", youtubeConnected: false, vidiqConnected: false, thumbnailSystemPrompt: "",
  descriptionFooter: "📞 Consulting: +225 07 07 66 41 05\n🌐 Website: allianceconsultants.net\n💬 Envol IA WhatsApp Group: https://chat.whatsapp.com/JPmF6GBrDAEB1ETlq3pWYh",
};

const demoProjects: Project[] = [
  { id: "ai-whatsapp", title: "Comment l’IA transforme WhatsApp Business", subject: "Comment utiliser l’IA pour mieux répondre aux clients sur WhatsApp Business", status: "Script en cours", updated: "Aujourd’hui, 14:32", step: 2, confirmed: true, completed: [1], hook: "Tu réponds encore à chaque client WhatsApp un par un ? Imagine un assistant qui prépare tes réponses, sans perdre ton ton ni promettre l’impossible. Voici la méthode.", promise: "À la fin de cette vidéo, tu sauras identifier les réponses à automatiser et celles qui doivent rester humaines. Tu repartiras avec une méthode simple à tester.", body: "", conclusion: "", reviewAccepted: false, packageAnswers: { visual: "", timecodes: "", links: "" }, workflowVersion: 2, chapters: [], bodyWordTarget: 0 },
  { id: "prompts", title: "7 erreurs de prompt qui coûtent du temps", subject: "Erreurs de prompt", status: "Idée", updated: "Hier, 18:05", step: 1, confirmed: false, completed: [], hook: "", promise: "", body: "", conclusion: "", reviewAccepted: false, packageAnswers: { visual: "", timecodes: "", links: "" }, workflowVersion: 2, chapters: [], bodyWordTarget: 0 },
  { id: "agents", title: "Agent IA : ce qu’il fait vraiment", subject: "Comprendre les agents IA", status: "Packagé", updated: "8 août, 09:12", step: 7, confirmed: true, completed: [1,2,3,4,5,6,7], hook: "", promise: "", body: "", conclusion: "", reviewAccepted: true, packageAnswers: { visual: "Créateur face à un mur de messages", timecodes: "00:00 Intro, 00:42 Problème, 03:10 Méthode, 07:25 Nuance", links: "allianceconsultants.net" }, workflowVersion: 2, chapters: [], bodyWordTarget: 0 },
];

const labels = {
  fr: {
    projects: "Projets", navProjects: "Mes projets", studio: "Script Studio", shorts: "Shorts Studio", soon: "bientôt", express: "Package vidéo", shortsExpress: "Package Short", usage: "Credits Usage", hintUsage: "Coûts par projet", profile: "Ma chaîne & réglages", hintStudio: "Écrire une vidéo longue", hintShorts: "Découper une vidéo en Shorts", hintExpress: "Vidéo longue déjà tournée", hintShortsExpress: "Short déjà monté", newVideo: "Nouvelle vidéo", pilot: "Pilote automatique", saved: "Sauvegardé à l’instant", steps: ["Recherche & angle", "Hook & intro", "Validation des chapitres", "Corps du script", "Conclusion & CTA", "Relecture finale", "Packaging"],
    validate: "Valider l’étape", regenerate: "Régénérer", edit: "Modifier", copy: "Copier", words: "mots", seconds: "secondes", guard: "Garde-fous actifs", facts: "Aucune donnée inventée", fixed: "Textes fixes protégés", oral: "Écriture orale", sources: "Sources vérifiées uniquement", project: "Projet", script: "Prompteur", export: "Exporter", allProjects: "Tous les projets", continue: "Continuer", recent: "Projets récents", channelProfile: "Ma chaîne & réglages", integrations: "Intégrations personnelles", connected: "Connecté", disconnected: "Non connecté", test: "Tester la connexion", disconnect: "Déconnecter", saveProfile: "Enregistrer le profil", primaryLang: "Langue principale", secondaryLang: "Langue secondaire", fixedText: "Textes fixes — protégés mot pour mot", audience: "Audience cible", tone: "Ton & style", duration: "Durée cible", close: "Fermer", download: "Télécharger le document", copyScript: "Copier le script", fullScreen: "Plein écran", back: "Retour au studio", status: "Statut", updated: "Dernière modification", noKey: "Recherche manuelle disponible", ready: "Prêt à tourner", mandatoryStop: "Arrêt obligatoire", answerToContinue: "Votre réponse est requise pour continuer.", launch: "Lancer la génération", overview: "Vue d’ensemble", addSubject: "Quel est le sujet exact de la vidéo ?", create: "Créer le projet", cancel: "Annuler"
  },
  en: {
    projects: "Projects", navProjects: "My projects", studio: "Script Studio", shorts: "Shorts Studio", soon: "soon", express: "Video package", shortsExpress: "Short package", usage: "Credits Usage", hintUsage: "Cost per project", profile: "My channel & settings", hintStudio: "Write a long video", hintShorts: "Cut a video into Shorts", hintExpress: "Long video already recorded", hintShortsExpress: "Short already edited", newVideo: "New video", pilot: "Autopilot", saved: "Saved just now", steps: ["Research & angle", "Hook & intro", "Chapter validation", "Script body", "Conclusion & CTA", "Final review", "Packaging"],
    validate: "Approve step", regenerate: "Regenerate", edit: "Edit", copy: "Copy", words: "words", seconds: "seconds", guard: "Guardrails active", facts: "No invented data", fixed: "Fixed copy protected", oral: "Written for speech", sources: "Verified sources only", project: "Project", script: "Teleprompter", export: "Export", allProjects: "All projects", continue: "Continue", recent: "Recent projects", channelProfile: "My channel & settings", integrations: "Personal integrations", connected: "Connected", disconnected: "Not connected", test: "Test connection", disconnect: "Disconnect", saveProfile: "Save profile", primaryLang: "Primary language", secondaryLang: "Secondary language", fixedText: "Fixed copy — protected word for word", audience: "Target audience", tone: "Tone & style", duration: "Target duration", close: "Close", download: "Download document", copyScript: "Copy script", fullScreen: "Full screen", back: "Back to studio", status: "Status", updated: "Last updated", noKey: "Manual research available", ready: "Ready to record", mandatoryStop: "Mandatory stop", answerToContinue: "Your answer is required to continue.", launch: "Start generation", overview: "Overview", addSubject: "What is the exact video topic?", create: "Create project", cancel: "Cancel"
  },
};

function wordCount(value: string) { return value.trim() ? value.trim().split(/\s+/).length : 0; }

/**
 * A readable name for the project list and the breadcrumb. Pasting a full outline as the
 * subject is normal and useful — it feeds the AI — but the whole block made an unusable
 * title, so take the first line that carries a real sentence.
 */
function projectTitleFrom(subject: string) {
  const lines = subject.split("\n").map(line => line.trim()).filter(Boolean);
  const meaningful = lines.find(line => {
    const withoutMarkers = line.replace(/^[\d.)#\-–—*•\s]+/, "").replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}️\s]+/gu, "").trim();
    // Skip lead-ins like "Voici une structure de vidéo en 5 chapitres :" that end in a colon.
    return withoutMarkers.length >= 12 && !/[:：]$/.test(withoutMarkers);
  });
  const candidate = (meaningful ?? lines[0] ?? subject).trim()
    .replace(/^[\d.)#\-–—*•\s]+/, "")
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}️\s]+/gu, "")
    .trim();
  return candidate.length > 90 ? `${candidate.slice(0, 87).trimEnd()}…` : candidate || subject.trim().slice(0, 90);
}

// Up to two automatic retries (1.5 s then 4 s) on retryable statuses or a network
// failure. Client-side on purpose: each attempt opens a fresh HTTP request instead of
// stretching one long one.
const RETRYABLE_STATUS = [408, 429, 500, 502, 503, 504];
const RETRY_DELAYS = [1_500, 4_000];
async function postJsonWithRetry(url: string, payload: unknown, onRetry?: () => void): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (attempt < RETRY_DELAYS.length && RETRYABLE_STATUS.includes(response.status)) { onRetry?.(); await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt])); continue; }
      return response;
    } catch (error) {
      if (attempt >= RETRY_DELAYS.length) throw error;
      onRetry?.(); await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }
}

// fetch() rejects with a TypeError when the server itself is unreachable (dev server
// stopped, network drop). Surface that as guidance instead of a raw "Failed to fetch".

// Must stay byte-identical to the format the monolithic route produced: step 6 checks
// body.includes(`CHAPITRE ${n}`) and estimatedTimecodes splits on /CHAPITRE\s+\d+/i.
function assembleBody(sections: BodySection[], chapters: Chapter[]) {
  return sections.map((section, index) => `CHAPITRE ${index + 1} — ${chapters[index].title.toUpperCase()}\n\n${section.script.trim()}${section.transition.trim() ? `\n\n${section.transition.trim()}` : ""}`).join("\n\n");
}

const WORDS_PER_MINUTE = 145;
const CONCLUSION_WORD_RESERVE = 90;
const ALERT_DISMISS_DELAY = 4000;
const ALERT_VISIBLE_LIMIT = 4;

function clamp(value: number, minimum: number, maximum: number) { return Math.min(maximum, Math.max(minimum, Math.round(value))); }

function durationRange(value: string) {
  const values = (value.match(/\d+(?:[.,]\d+)?/g) ?? []).map(item => Number(item.replace(",", "."))).filter(Number.isFinite);
  const first = values[0] ?? 8;
  const second = values[1] ?? first;
  const minimum = clamp(Math.min(first, second), 1, 120);
  const maximum = clamp(Math.max(first, second), minimum, 120);
  return { minimum, maximum, midpoint: (minimum + maximum) / 2 };
}

function scriptPlan(profile: Profile, project: Pick<Project, "hook" | "promise" | "body" | "conclusion">) {
  const duration = durationRange(profile.duration);
  const fixedWords = wordCount([project.hook, profile.presentation, project.promise, profile.launch, profile.closing].filter(Boolean).join(" "));
  const targetBodyWords = Math.max(650, Math.round(duration.midpoint * WORDS_PER_MINUTE - fixedWords - CONCLUSION_WORD_RESERVE));
  const minimumBodyWords = Math.max(500, Math.round(duration.minimum * WORDS_PER_MINUTE - fixedWords - CONCLUSION_WORD_RESERVE));
  const maximumBodyWords = Math.max(minimumBodyWords, Math.round(duration.maximum * WORDS_PER_MINUTE - fixedWords - CONCLUSION_WORD_RESERVE));
  const projectedWords = fixedWords + wordCount(project.body) + (project.conclusion ? wordCount(project.conclusion) : CONCLUSION_WORD_RESERVE);
  return {
    ...duration,
    targetBodyWords,
    minimumBodyWords,
    maximumBodyWords,
    chapterCount: clamp(duration.midpoint / 1.4, 5, 12),
    estimatedMinutes: projectedWords / WORDS_PER_MINUTE,
  };
}

function formatTimecode(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Same rate scriptPlan uses for estimatedMinutes, so the chapter marks line up with the
// "X mots · environ Y minutes" figure shown in step 6.
function estimatedTimecodes(project: Pick<Project, "hook" | "promise" | "body" | "chapters">, profile: Profile) {
  if (!project.body.trim()) return "";
  const segments = project.body.split(/CHAPITRE\s+\d+/i);
  const chapterBodies = segments.slice(1);
  if (!chapterBodies.length) return "";
  const secondsPerWord = 60 / WORDS_PER_MINUTE;
  const spoken = (value: string) => wordCount(value) * secondsPerWord;
  // Everything spoken before chapter 1: hook, fixed presentation, promise, fixed launch,
  // then whatever the body says ahead of its first CHAPITRE marker.
  let cursor = spoken(project.hook) + spoken(profile.presentation) + spoken(project.promise) + spoken(profile.launch) + spoken(segments[0]);
  const lines = [`${formatTimecode(0)} Intro`];
  chapterBodies.forEach((chapterBody, index) => {
    lines.push(`${formatTimecode(cursor)} ${project.chapters[index]?.title.trim() || `Chapitre ${index + 1}`}`);
    cursor += spoken(chapterBody);
  });
  return lines.join("\n");
}

function chooseWriterModel(models: OpenRouterModel[]) {
  const preferred = ["openai/gpt-5.6-sol", "anthropic/claude-opus-5", "anthropic/claude-sonnet-5"];
  for (const id of preferred) {
    const exact = models.find(model => model.id === id && supportsHighReasoning(model));
    if (exact) return exact;
  }
  return models.find(supportsHighReasoning) ?? null;
}

function supportsHighReasoning(model: OpenRouterModel) {
  return model.supportsWriter && model.supportsReasoning && model.supportsStructuredOutputs && (!model.supportedEfforts?.length || model.supportedEfforts.includes("high"));
}

function migrateProject(value: Partial<Project>, profile: Profile): Project {
  const legacy = value.workflowVersion !== 2;
  const oldStep = clamp(Number(value.step) || 1, 1, legacy ? 6 : 7);
  const legacyOnPackaging = legacy && oldStep === 6;
  const packagedLegacy = legacyOnPackaging && (
    (value.completed ?? []).includes(6)
    || /packag/i.test(value.status ?? "")
    || (Boolean(value.reviewAccepted) && Boolean(value.packageAnswers?.visual && value.packageAnswers?.timecodes && value.packageAnswers?.links))
  );
  const step = legacy ? (legacyOnPackaging ? 7 : oldStep >= 3 ? 3 : oldStep) : oldStep;
  const completed = legacy
    ? (packagedLegacy ? [1, 2, 3, 4, 5, 6, 7] : legacyOnPackaging ? [1, 2, 3, 4, 5, 6] : (value.completed ?? []).filter(number => number < 3))
    : Array.from(new Set((value.completed ?? []).filter(number => Number.isInteger(number) && number >= 1 && number <= 7)));
  const chapters = Array.isArray(value.chapters) ? value.chapters.map((chapter, index) => ({
    id: chapter?.id || `chapter-${index + 1}`,
    title: chapter?.title ?? "",
    objective: chapter?.objective ?? "",
    keyPoints: Array.isArray(chapter?.keyPoints) ? chapter.keyPoints.filter(point => typeof point === "string") : [],
    targetWords: Number.isFinite(chapter?.targetWords) ? Math.max(50, Math.round(chapter.targetWords)) : 100,
  })) : [];
  const base: Project = {
    id: value.id || crypto.randomUUID(),
    title: value.title || value.subject || "Projet sans titre",
    subject: value.subject || value.title || "",
    status: value.status || "Idée",
    updated: value.updated || "À l’instant",
    step,
    confirmed: Boolean(value.confirmed),
    completed,
    hook: value.hook ?? "",
    promise: value.promise ?? "",
    body: value.body ?? "",
    conclusion: value.conclusion ?? "",
    reviewAccepted: Boolean(value.reviewAccepted),
    hookGeneratedByAi: value.hookGeneratedByAi,
    packageAnswers: { visual: value.packageAnswers?.visual ?? "", timecodes: value.packageAnswers?.timecodes ?? "", links: value.packageAnswers?.links ?? "" },
    packaging: value.packaging && typeof value.packaging === "object" ? value.packaging : undefined,
    bodySections: Array.isArray(value.bodySections) && value.bodySections.length
      ? value.bodySections.filter(section => section && typeof section.id === "string" && typeof section.script === "string" && typeof section.transition === "string").map(section => ({ id: section.id, script: section.script, transition: section.transition }))
      : undefined,
    workflowVersion: 2,
    chapters,
    bodyWordTarget: Number.isFinite(value.bodyWordTarget) && Number(value.bodyWordTarget) > 0 ? Math.round(Number(value.bodyWordTarget)) : 0,
    bodyGeneratedByAi: legacy && !packagedLegacy ? false : Boolean(value.bodyGeneratedByAi),
    bodyModel: value.bodyModel,
  };
  if (!base.bodyWordTarget) base.bodyWordTarget = scriptPlan(profile, base).targetBodyWords;
  return base;
}

export default function ScriptStudio() {
  const [lang, setLang] = useState<Lang>("fr");
  const [view, setView] = useState<View>("studio");
  const [profile, setProfile] = useState(profileDemo);
  const [projects, setProjects] = useState(demoProjects);
  const [express, setExpress] = useState<ExpressState>(expressDefault);
  const [aiSettings, setAiSettings] = useState<AiSettings>({ openrouterModel: "", writerModel: "", visionModel: "", imageModel: "gpt-image-2", imageQuality: "medium" });
  const [integrations, setIntegrations] = useState<Integrations>(emptyIntegrations);
  const [youtube, setYoutube] = useState<YoutubeState>({ connected: false, channelName: null, updatedAt: null });
  const [legacyKeysFound, setLegacyKeysFound] = useState(false);
  const [credentialsHydrated, setCredentialsHydrated] = useState(false);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
  const [referenceThumbnails, setReferenceThumbnails] = useState<ReferenceThumbnail[]>([]);
  const [presenterPhoto, setPresenterPhoto] = useState<{ key: string; url: string } | null>(null);
  const [brandLogo, setBrandLogo] = useState<{ key: string; url: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeId, setActiveId] = useState(demoProjects[0].id);
  const [auto, setAuto] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error" | "too-large">("saved");
  const [newOpen, setNewOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [prompter, setPrompter] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsPaused, setAlertsPaused] = useState(false);
  const [studioAiLoading, setStudioAiLoading] = useState(false);
  const [studioAiNotice, setStudioAiNotice] = useState<{ projectId: string; kind: NoticeKind; message: string } | null>(null);
  const [bodyProgress, setBodyProgress] = useState<{ current: number; total: number; title: string; retrying: boolean } | null>(null);
  const bodyRunId = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set by anything that edits the workspace, so a late hydration cannot clobber it.
  const workspaceTouched = useRef(false);
  const alertTimers = useRef(new Map<string, { count: number; timer: ReturnType<typeof setTimeout> }>());
  const t = labels[lang];
  const project = projects.find(p => p.id === activeId) ?? projects[0];
  const loadReferenceThumbnails = useCallback(() => {
    fetch("/api/reference-thumbnails").then(response => response.json() as Promise<{ references?: ReferenceThumbnail[] }>).then(data => setReferenceThumbnails(data.references ?? [])).catch(() => null);
  }, []);

  useEffect(() => {
    const local = localStorage.getItem("script-studio-workspace");
    const localLang = localStorage.getItem("script-studio-lang") as Lang | null;
    const savedCredentials = localStorage.getItem("script-studio-ai-credentials");
    const savedPreferences = localStorage.getItem("script-studio-ai-preferences");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localLang === "fr" || localLang === "en") setLang(localLang);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        const nextProfile = { ...profileDemo, ...(parsed.profile ?? {}) };
        const nextProjects = Array.isArray(parsed.projects) && parsed.projects.length ? parsed.projects.map((item: Partial<Project>) => migrateProject(item, nextProfile)) : demoProjects;
        setProfile(nextProfile); setProjects(nextProjects); setActiveId(nextProjects.some((item: Project) => item.id === parsed.activeId) ? parsed.activeId : nextProjects[0].id); setExpress(parsed.express ?? expressDefault);
      } catch { /* retain demo */ }
    }
    // Keys used to live here. They now belong to the server, and we never upload a
    // secret the user chose to keep local — we only flag it so they can re-enter it once.
    if (savedCredentials) {
      try {
        const parsed = JSON.parse(savedCredentials) as Record<string, unknown>;
        if (parsed.openrouterKey || parsed.openaiKey) setLegacyKeysFound(true); else localStorage.removeItem("script-studio-ai-credentials");
      } catch { localStorage.removeItem("script-studio-ai-credentials"); }
    }
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences) as Partial<Pick<AiSettings, "openrouterModel" | "writerModel" | "visionModel" | "imageModel" | "imageQuality">>;
        setAiSettings(current => ({ ...current, ...parsed }));
      } catch { localStorage.removeItem("script-studio-ai-preferences"); }
    }
    setCredentialsHydrated(true);
    fetch("/api/workspace").then(r => r.json() as Promise<{ payload?: { profile: Profile; projects: Array<Partial<Project>>; activeId: string; express?: ExpressState } }>).then(data => {
      // Never overwrite work started before this response landed: creating a project
      // while the request was in flight used to lose it and snap back to the stored
      // active project, with nothing saved because writes wait on hydration.
      if (workspaceTouched.current) return;
      if (data.payload?.projects?.length) {
        const nextProfile = { ...profileDemo, ...data.payload.profile };
        const nextProjects = data.payload.projects.map(item => migrateProject(item, nextProfile));
        setProfile(nextProfile); setProjects(nextProjects); setActiveId(nextProjects.some(item => item.id === data.payload?.activeId) ? data.payload.activeId : nextProjects[0].id); setExpress(data.payload.express ?? expressDefault);
      }
    }).catch(() => null).finally(() => setHydrated(true));
  }, []);

  const refreshIntegrations = useCallback(() => {
    fetch("/api/integrations").then(response => response.json() as Promise<{ integrations?: Integrations; youtube?: YoutubeState }>)
      .then(data => { if (data.integrations) setIntegrations(data.integrations); if (data.youtube) setYoutube(data.youtube); }).catch(() => null);
  }, []);

  useEffect(() => { refreshIntegrations(); }, [refreshIntegrations]);


  useEffect(() => {
    fetch("/api/openrouter-models").then(response => response.json() as Promise<{ models?: OpenRouterModel[] }>).then(data => {
      const models = data.models ?? [];
      setOpenRouterModels(models);
      setAiSettings(current => {
        const savedWriter = models.find(model => model.id === current.writerModel && supportsHighReasoning(model));
        return {
          ...current,
          openrouterModel: models.some(model => model.id === current.openrouterModel) ? current.openrouterModel : models[0]?.id || "",
          writerModel: savedWriter?.id || chooseWriterModel(models)?.id || "",
          visionModel: models.some(model => model.id === current.visionModel && model.supportsImages) ? current.visionModel : models.find(model => model.supportsImages)?.id || "",
        };
      });
    }).catch(() => null);
  }, []);

  useEffect(() => {
    if (!credentialsHydrated) return;
    const { openrouterModel, writerModel, visionModel, imageModel, imageQuality } = aiSettings;
    localStorage.setItem("script-studio-ai-preferences", JSON.stringify({ openrouterModel, writerModel, visionModel, imageModel, imageQuality }));
  }, [aiSettings, credentialsHydrated]);

  const loadPresenterPhoto = useCallback(() => {
    fetch("/api/presenter-photo").then(response => response.json() as Promise<{ photo?: { key: string; url: string } | null }>)
      .then(data => setPresenterPhoto(data.photo ?? null)).catch(() => null);
  }, []);

  const loadBrandLogo = useCallback(() => {
    fetch("/api/brand-logo").then(response => response.json() as Promise<{ logo?: { key: string; url: string } | null }>)
      .then(data => setBrandLogo(data.logo ?? null)).catch(() => null);
  }, []);

  useEffect(() => { loadReferenceThumbnails(); }, [loadReferenceThumbnails]);
  useEffect(() => { loadPresenterPhoto(); }, [loadPresenterPhoto]);
  useEffect(() => { loadBrandLogo(); }, [loadBrandLogo]);

  useEffect(() => {
    if (!hydrated) return;
    const payload = { profile, projects, activeId, express };
    localStorage.setItem("script-studio-lang", lang);
    localStorage.setItem("script-studio-workspace", JSON.stringify(payload));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // A rejected write used to be swallowed and still reported as saved, so work could
      // be lost while the indicator said everything was fine.
      fetch("/api/workspace", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
        .then(response => setSaveState(response.ok ? "saved" : response.status === 413 ? "too-large" : "error"))
        .catch(() => setSaveState("error"));
    }, 700);
  }, [profile, projects, activeId, express, lang, hydrated]);

  // One timer per alert: it can only ever close its own card. Hovering or focusing the
  // stack disarms every timer; leaving re-arms them for a full delay, not the remainder.
  useEffect(() => {
    const timers = alertTimers.current;
    const disarm = (id: string) => { const entry = timers.get(id); if (entry) { clearTimeout(entry.timer); timers.delete(id); } };
    for (const id of Array.from(timers.keys())) if (!alerts.some(alert => alert.id === id && alert.auto)) disarm(id);
    if (alertsPaused) { for (const id of Array.from(timers.keys())) disarm(id); return; }
    for (const alert of alerts) {
      if (!alert.auto) continue;
      const entry = timers.get(alert.id);
      if (entry && entry.count === alert.count) continue;
      disarm(alert.id);
      timers.set(alert.id, { count: alert.count, timer: setTimeout(() => { timers.delete(alert.id); setAlerts(current => current.filter(item => item.id !== alert.id)); }, ALERT_DISMISS_DELAY) });
    }
  }, [alerts, alertsPaused]);

  useEffect(() => {
    const timers = alertTimers.current;
    return () => { timers.forEach(entry => clearTimeout(entry.timer)); timers.clear(); };
  }, []);

  useEffect(() => {
    if (!alerts.length) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setAlerts(current => current.slice(0, -1)); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [alerts.length]);

  const touchWorkspace = () => { workspaceTouched.current = true; };
  const editProfile = (next: Profile) => { touchWorkspace(); setProfile(next); };
  const editExpress = (next: ExpressState) => { touchWorkspace(); setExpress(next); };

  const updateProject = (patch: Partial<Project>) => {
    touchWorkspace();
    // Central invalidation: every path that clears the body also cancels any in-flight
    // section loop and drops the resumable prefix, so a stale loop can never resurrect
    // an obsolete body over fresh inputs.
    if (patch.body === "") {
      bodyRunId.current += 1;
      if (!("bodySections" in patch)) patch = { ...patch, bodySections: undefined };
    }
    setProjects(items => items.map(p => p.id === activeId ? { ...p, ...patch, updated: lang === "fr" ? "À l’instant" : "Just now" } : p));
  };
  const showToast = (message: string, kind: AlertKind = "success", options?: { persist?: boolean }) => {
    setAlerts(current => {
      const duplicate = current.find(alert => alert.message === message && alert.kind === kind);
      if (duplicate) return current.map(alert => alert.id === duplicate.id ? { ...alert, count: alert.count + 1 } : alert);
      const next = [...current, { id: crypto.randomUUID(), message, kind, count: 1, auto: kind === "success" && !options?.persist }];
      // Over the limit, only a success can be evicted — a warning or an error always waits for a click.
      if (next.length > ALERT_VISIBLE_LIMIT) {
        const oldestSuccess = next.findIndex(alert => alert.kind === "success");
        if (oldestSuccess !== -1) next.splice(oldestSuccess, 1);
      }
      return next;
    });
  };
  const dismissAlert = (id: string) => setAlerts(current => current.filter(alert => alert.id !== id));
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); showToast(lang === "fr" ? "Copié dans le presse-papiers" : "Copied to clipboard"); };

  // Google redirects back with ?youtube=…; report the outcome and drop it from the URL.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("youtube");
    if (!status) return;
    window.history.replaceState({}, "", window.location.pathname);
    const messages: Record<string, [string, AlertKind]> = {
      connected: [lang === "fr" ? "Chaîne YouTube connectée" : "YouTube channel connected", "success"],
      refused: [lang === "fr" ? "Autorisation YouTube refusée." : "YouTube authorisation refused.", "warning"],
      expired: [lang === "fr" ? "La demande de connexion a expiré. Relancez-la." : "The connection request expired. Start it again.", "warning"],
      invalid: [lang === "fr" ? "Réponse de connexion incomplète." : "Incomplete connection response.", "error"],
      failed: [lang === "fr" ? "La connexion YouTube a échoué." : "YouTube connection failed.", "error"],
    };
    const [message, kind] = messages[status] ?? messages.failed;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    showToast(message, kind);
    refreshIntegrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const closingAlreadyIncluded = Boolean(profile.closing.trim() && project.conclusion.includes(profile.closing.trim()));
  const script = [project.hook, profile.presentation, project.promise, profile.launch, project.body, project.conclusion, closingAlreadyIncluded ? "" : profile.closing].filter(Boolean).join("\n\n");

  const createProject = () => {
    if (newSubject.trim().length < 3) {
      showToast(lang === "fr" ? "Le sujet doit contenir au moins 3 caractères." : "The subject must contain at least 3 characters.", "error");
      return;
    }
    const draft = { hook: "", promise: "", body: "", conclusion: "" };
    const next: Project = { id: crypto.randomUUID(), title: projectTitleFrom(newSubject), subject: newSubject.trim(), status: lang === "fr" ? "Idée" : "Idea", updated: lang === "fr" ? "À l’instant" : "Just now", step: 1, confirmed: false, completed: [], ...draft, reviewAccepted: false, packageAnswers: { visual: "", timecodes: "", links: "" }, workflowVersion: 2, chapters: [], bodyWordTarget: scriptPlan(profile, draft).targetBodyWords };
    touchWorkspace();
    setProjects(items => [next, ...items]); setActiveId(next.id); setNewSubject(""); setNewOpen(false); setView("studio");
  };

  const runHookAi = async (action: "generate" | "iterate", target: HookIterationTarget = "both", direction = "") => {
    if (studioAiLoading) return false;
    if (!integrations.openrouter.configured || !aiSettings.openrouterModel) {
      showToast(lang === "fr" ? "Ajoutez votre clé OpenRouter et choisissez un modèle dans le profil." : "Add your OpenRouter key and choose a model in the profile.", "warning");
      return false;
    }
    setStudioAiLoading(true);
    setStudioAiNotice(null);
    try {
      const response = await postJsonWithRetry("/api/studio-hook", {
        projectId: project.id, projectTitle: project.title,
        model: aiSettings.openrouterModel,
        language: lang,
        action,
        target,
        direction,
        subject: project.subject,
        currentHook: project.hook,
        currentPromise: project.promise,
        profile: { channel: profile.channel, theme: profile.theme, audience: profile.audience, tone: profile.tone },
      });
      const data = await response.json() as {
        result?: { hook?: string; promise?: string };
        warning?: { code?: string; hookWords?: number; promiseWords?: number; hookValid?: boolean; promiseValid?: boolean } | null;
        error?: string;
        detail?: string;
      };
      if (response.status === 401) throw new Error(lang === "fr" ? "Clé OpenRouter refusée. Vérifiez-la dans le profil ou créez-en une nouvelle." : "OpenRouter rejected the key. Check it in your profile or create a new one.");
      if (!response.ok || !data.result?.hook || !data.result.promise) throw new Error(data.detail || data.error || "generation_failed");
      updateProject({
        hook: target === "promise" ? project.hook : data.result.hook,
        promise: target === "hook" ? project.promise : data.result.promise,
        hookGeneratedByAi: true,
        chapters: [], body: "", conclusion: "", bodyGeneratedByAi: false, bodyModel: "", reviewAccepted: false,
        completed: project.completed.filter(number => number < 2),
      });
      if (data.warning?.code === "length_adjustment_needed") {
        const parts = [
          data.warning.hookValid === false ? `hook : ${data.warning.hookWords ?? "?"} ${lang === "fr" ? "mots" : "words"}` : "",
          data.warning.promiseValid === false ? `${lang === "fr" ? "promesse" : "promise"} : ${data.warning.promiseWords ?? "?"} ${lang === "fr" ? "mots" : "words"}` : "",
        ].filter(Boolean).join(" · ");
        const message = lang === "fr"
          ? `Le modèle a répondu, mais la longueur reste à ajuster (${parts}). Modifiez le texte ou réessayez.`
          : `The model responded, but the length still needs adjustment (${parts}). Edit the copy or retry.`;
        setStudioAiNotice({ projectId: activeId, kind: "warning", message });
        showToast(lang === "fr" ? "Texte généré avec un ajustement à vérifier" : "Copy generated with an adjustment to review", "warning");
      } else {
        showToast(action === "iterate" ? (lang === "fr" ? "Orientations appliquées par l’IA" : "AI applied your directions") : (lang === "fr" ? "Hook et promesse générés par l’IA" : "Hook and promise generated by AI"));
      }
      return true;
    } catch (error) {
      const message = serverErrorMessage(error, lang, "openrouter");
      setStudioAiNotice({ projectId: activeId, kind: "error", message });
      showToast(lang === "fr" ? "La génération a été interrompue" : "Generation was interrupted", "error");
      return false;
    } finally { setStudioAiLoading(false); }
  };

  const studioProviderError = (status: number, detail?: string) => {
    if (status === 401) return lang === "fr" ? "Clé OpenRouter refusée. Vérifiez-la dans le profil ou créez-en une nouvelle." : "OpenRouter rejected the key. Check it in your profile or create a new one.";
    if (status === 402) return lang === "fr" ? "Crédits OpenRouter insuffisants pour cette génération longue." : "Your OpenRouter credits are insufficient for this long generation.";
    if (status === 429) return lang === "fr" ? "OpenRouter reçoit trop de demandes. Attendez un instant puis réessayez." : "OpenRouter is receiving too many requests. Wait a moment and retry.";
    return detail || (lang === "fr" ? "Le modèle n’a pas produit un résultat exploitable." : "The model did not produce a usable result.");
  };

  const writerReady = () => {
    if (integrations.openrouter.configured && aiSettings.writerModel) return true;
    showToast(lang === "fr" ? "Ajoutez votre clé OpenRouter et choisissez le modèle de scénarisation dans le profil." : "Add your OpenRouter key and choose the long-form writing model in your profile.", "error");
    return false;
  };

  const runChaptersAi = async () => {
    if (studioAiLoading || !writerReady()) return false;
    const plan = scriptPlan(profile, project);
    setStudioAiLoading(true); setStudioAiNotice(null);
    try {
      const response = await postJsonWithRetry("/api/studio-chapters", {
        projectId: project.id, projectTitle: project.title,
        model: aiSettings.writerModel, language: lang, subject: project.subject,
        duration: profile.duration, targetBodyWords: plan.targetBodyWords, chapterCount: plan.chapterCount,
        hook: project.hook, promise: project.promise,
        profile: { channel: profile.channel, theme: profile.theme, audience: profile.audience, tone: profile.tone },
      });
      const data = await response.json() as { result?: { chapters?: Chapter[]; targetBodyWords?: number }; detail?: string; error?: string };
      if (!response.ok || !data.result?.chapters?.length) throw new Error(studioProviderError(response.status, data.detail || data.error));
      updateProject({
        chapters: data.result.chapters,
        bodyWordTarget: data.result.targetBodyWords ?? plan.targetBodyWords,
        body: "", conclusion: "", bodyGeneratedByAi: false, bodyModel: "", reviewAccepted: false,
        completed: project.completed.filter(number => number < 3),
      });
      showToast(lang === "fr" ? `${data.result.chapters.length} chapitres proposés par l’IA` : `${data.result.chapters.length} chapters proposed by AI`);
      return true;
    } catch (error) {
      const message = serverErrorMessage(error, lang, "openrouter");
      setStudioAiNotice({ projectId: activeId, kind: "error", message }); showToast(lang === "fr" ? "La génération des chapitres a été interrompue" : "Chapter generation was interrupted", "error");
      return false;
    } finally { setStudioAiLoading(false); }
  };

  const runWriterAi = async (action: "body" | "conclusion") => {
    if (studioAiLoading || !writerReady()) return false;
    const plan = scriptPlan(profile, project);
    setStudioAiLoading(true); setStudioAiNotice(null);
    try {
      if (action === "body") return await runBodySections(plan);
      const response = await postJsonWithRetry("/api/studio-write", {
        projectId: project.id, projectTitle: project.title,
        model: aiSettings.writerModel, language: lang, action: "conclusion",
        subject: project.subject, duration: profile.duration, targetBodyWords: project.bodyWordTarget || plan.targetBodyWords,
        hook: project.hook, promise: project.promise, body: project.body, chapters: project.chapters,
        profile: { channel: profile.channel, theme: profile.theme, audience: profile.audience, tone: profile.tone, closing: profile.closing },
      });
      const data = await response.json() as {
        result?: { conclusion?: string; wordCount?: number };
        warning?: { code?: string; wordCount?: number } | null;
        detail?: string; error?: string;
      };
      if (!response.ok || !data.result?.conclusion) throw new Error(studioProviderError(response.status, data.detail || data.error));
      updateProject({ conclusion: data.result.conclusion, reviewAccepted: false, completed: project.completed.filter(number => number <= 4) });
      if (data.warning) setStudioAiNotice({ projectId: activeId, kind: "warning", message: lang === "fr" ? `Conclusion générée : ${data.warning.wordCount ?? "?"} mots. Vérifiez sa longueur avant de valider.` : `Generated conclusion: ${data.warning.wordCount ?? "?"} words. Review its length before approval.` });
      showToast(lang === "fr" ? "Conclusion générée par l’IA" : "Conclusion generated by AI");
      return true;
    } catch (error) {
      const message = serverErrorMessage(error, lang, "openrouter");
      setStudioAiNotice({ projectId: activeId, kind: "error", message }); showToast(lang === "fr" ? "La génération a été interrompue" : "Generation was interrupted", "error");
      return false;
    } finally { setStudioAiLoading(false); setBodyProgress(null); }
  };

  // Chapter-by-chapter body generation. Each HTTP request writes one chapter, the body is
  // assembled and persisted as it grows, and a failure keeps every completed chapter so
  // "Réessayer" resumes at the first missing one instead of regenerating paid work.
  const runBodySections = async (plan: ReturnType<typeof scriptPlan>) => {
    const chapters = project.chapters;
    const targetBodyWords = project.bodyWordTarget || plan.targetBodyWords;
    const runId = ++bodyRunId.current;
    const stored = project.bodySections ?? [];
    const resumable = stored.length > 0 && stored.length < chapters.length
      && stored.every((section, index) => section.id === chapters[index]?.id && section.script.trim().length >= 80);
    const sections: BodySection[] = resumable ? [...stored] : [];
    const weak: Array<{ title: string; actualWords: number; targetMinimum: number }> = [];
    const persist = (extra: Partial<Project> = {}) => updateProject({
      bodySections: sections.length ? [...sections] : undefined,
      body: assembleBody(sections, chapters),
      bodyGeneratedByAi: sections.length > 0, bodyModel: aiSettings.writerModel, bodyWordTarget: targetBodyWords,
      conclusion: "", reviewAccepted: false, completed: project.completed.filter(number => number <= 3),
      ...extra,
    });
    for (let index = sections.length; index < chapters.length; index += 1) {
      setBodyProgress({ current: index + 1, total: chapters.length, title: chapters[index].title, retrying: false });
      const failChapter = (reason: string) => {
        const done = sections.length;
        const message = lang === "fr"
          ? `Le chapitre ${index + 1}/${chapters.length} « ${chapters[index].title} » n’a pas pu être rédigé. ${reason} ${done ? `Les ${done} chapitre(s) déjà rédigés sont conservés : « Réessayer » reprendra au chapitre ${index + 1} sans régénérer l’existant.` : "« Réessayer » relancera la rédaction."}`
          : `Chapter ${index + 1}/${chapters.length} “${chapters[index].title}” could not be written. ${reason} ${done ? `The ${done} completed chapter(s) are kept: “Retry” resumes at chapter ${index + 1} without regenerating them.` : "“Retry” restarts the writing."}`;
        persist();
        setStudioAiNotice({ projectId: activeId, kind: "error", message });
        showToast(lang === "fr" ? "La génération a été interrompue" : "Generation was interrupted", "error");
      };
      let response: Response;
      try {
        response = await postJsonWithRetry("/api/studio-write", {
          projectId: project.id, projectTitle: project.title,
          model: aiSettings.writerModel, language: lang, action: "section",
          subject: project.subject, duration: profile.duration, targetBodyWords,
          hook: project.hook, promise: project.promise, chapters, sectionIndex: index,
          previousSections: sections.slice(-2).map(({ id, script, transition }) => ({ id, script, transition })),
          profile: { channel: profile.channel, theme: profile.theme, audience: profile.audience, tone: profile.tone },
        }, () => setBodyProgress(current => current && { ...current, retrying: true }));
      } catch {
        if (bodyRunId.current === runId) failChapter(connectionLostMessage(lang));
        return false;
      }
      if (bodyRunId.current !== runId) return false;
      const data = await response.json().catch(() => ({})) as {
        result?: { section?: { id?: string; script?: string; transition?: string }; wordCount?: number };
        warning?: { code?: string; actualWords?: number; targetMinimum?: number } | null;
        detail?: string; error?: string;
      };
      if (bodyRunId.current !== runId) return false;
      if (!response.ok || !data.result?.section?.script) {
        failChapter(studioProviderError(response.status, data.detail || data.error));
        return false;
      }
      sections.push({ id: chapters[index].id, script: data.result.section.script, transition: data.result.section.transition ?? "" });
      if (data.warning?.code === "section_under_target") weak.push({ title: chapters[index].title, actualWords: data.warning.actualWords ?? 0, targetMinimum: data.warning.targetMinimum ?? 0 });
      persist();
    }
    const totalWords = wordCount(assembleBody(sections, chapters));
    const targetMinimum = Math.round(targetBodyWords * 0.9);
    persist({ bodySections: undefined });
    if (totalWords < targetMinimum || weak.length) {
      const deficit = Math.max(0, targetMinimum - totalWords);
      const message = lang === "fr"
        ? `Le corps contient ${totalWords} mots. ${deficit ? `Il manque encore environ ${deficit} mots.` : "La longueur totale est atteinte."}${weak.length ? ` ${weak.length} chapitre(s) doivent encore être développés.` : ""}`
        : `The body contains ${totalWords} words. ${deficit ? `It is still about ${deficit} words short.` : "The total length is reached."}${weak.length ? ` ${weak.length} chapter(s) still need development.` : ""}`;
      setStudioAiNotice({ projectId: activeId, kind: "warning", message });
      showToast(lang === "fr" ? "Corps généré, longueur à compléter" : "Body generated, length needs work", "warning");
    } else showToast(lang === "fr" ? "Corps long format généré par l’IA" : "Long-form body generated by AI");
    return true;
  };

  const generateStep = async () => {
    if (project.step === 1) { updateProject({ confirmed: true }); return; }
    if (project.step === 2) { await runHookAi("generate"); return; }
    if (project.step === 3) { await runChaptersAi(); return; }
    if (project.step === 4) { await runWriterAi("body"); return; }
    if (project.step === 5) { await runWriterAi("conclusion"); return; }
  };

  const validate = () => {
    const plan = scriptPlan(profile, project);
    if (project.step === 1 && !project.confirmed) return showToast(t.answerToContinue, "warning");
    if (project.step === 2 && (wordCount(project.hook) < 25 || wordCount(project.hook) > 40)) return showToast(lang === "fr" ? "Le hook doit contenir 25 à 40 mots." : "The hook must contain 25–40 words.", "warning");
    if (project.step === 2 && !project.promise.trim()) return showToast(lang === "fr" ? "La promesse doit être renseignée." : "The promise is required.", "warning");
    if (project.step === 3 && (project.chapters.length < 5 || project.chapters.length > 12 || project.chapters.some(chapter => !chapter.title.trim() || !chapter.objective.trim() || chapter.keyPoints.length < 2 || chapter.keyPoints.length > 5 || chapter.keyPoints.some(point => !point.trim()) || !Number.isFinite(chapter.targetWords) || chapter.targetWords < 50))) return showToast(lang === "fr" ? "Validez un plan complet de 5 à 12 chapitres, avec 2 à 5 points clés remplis par chapitre." : "Approve a complete 5–12 chapter plan with 2–5 completed key points per chapter.", "error");
    if (project.step === 4 && !project.body) return showToast(t.answerToContinue, "warning");
    if (project.step === 4 && wordCount(project.body) < plan.minimumBodyWords) return showToast(lang === "fr" ? `Le corps est trop court : ${wordCount(project.body)} mots. Minimum requis pour ${plan.minimum} minutes : ${plan.minimumBodyWords} mots.` : `The body is too short: ${wordCount(project.body)} words. Minimum for ${plan.minimum} minutes: ${plan.minimumBodyWords} words.`, "error");
    if (project.step === 4 && wordCount(project.body) > plan.maximumBodyWords) return showToast(lang === "fr" ? `Le corps est trop long : ${wordCount(project.body)} mots. Maximum conseillé pour ${plan.maximum} minutes : ${plan.maximumBodyWords} mots.` : `The body is too long: ${wordCount(project.body)} words. Recommended maximum for ${plan.maximum} minutes: ${plan.maximumBodyWords} words.`, "error");
    if (project.step === 5 && !project.conclusion) return showToast(t.answerToContinue, "warning");
    if (project.step === 6 && !project.reviewAccepted) return showToast(t.answerToContinue, "warning");
    if (project.step === 7 && (!project.packageAnswers.timecodes.trim() || !project.packageAnswers.links.trim())) return showToast(t.answerToContinue, "warning");
    const completed = Array.from(new Set([...project.completed, project.step]));
    const nextStep = Math.min(7, project.step + 1);
    updateProject({ completed, step: nextStep, status: project.step === 7 ? (lang === "fr" ? "Packagé" : "Packaged") : (lang === "fr" ? "Script en cours" : "Script in progress") });
  };

  const navigateStep = (number: number) => {
    const highestCompleted = project.completed.length ? Math.max(...project.completed) : 0;
    const highestUnlocked = Math.min(7, Math.max(project.step, highestCompleted + 1));
    if (number > highestUnlocked && !project.completed.includes(number)) return showToast(lang === "fr" ? "Validez d’abord les étapes précédentes." : "Approve the previous steps first.", "warning");
    updateProject({ step: number });
  };

  const download = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // Loaded on demand: the Word writer is only needed by people who export.
      const { buildWordDocument } = await import("./lib/word-export");
      let logo: { data: ArrayBuffer; type: "png" | "jpg" } | null = null;
      if (brandLogo) {
        const response = await fetch(brandLogo.url);
        if (response.ok) logo = { data: await response.arrayBuffer(), type: response.headers.get("content-type")?.includes("png") ? "png" : "jpg" };
      }
      // The body carries "CHAPITRE n — TITLE" markers; splitting on them turns each
      // chapter into its own Word heading, so the navigation pane mirrors the plan.
      const parts = project.body.split(/^(CHAPITRE\s+\d+[^\n]*)$/gim);
      const bodyByChapter: Array<{ heading: string; text: string }> = [];
      for (let index = 1; index < parts.length; index += 2) bodyByChapter.push({ heading: parts[index].trim(), text: parts[index + 1] ?? "" });
      const pack = project.packaging?.package;
      const blob = await buildWordDocument({
        lang, company: profile.channel, logo,
        title: project.title, subject: project.subject, status: project.status, updated: project.updated, step: project.step,
        hook: project.hook, promise: project.promise, conclusion: project.conclusion,
        chapters: project.chapters.map(chapter => ({ title: chapter.title, objective: chapter.objective, keyPoints: chapter.keyPoints, targetWords: chapter.targetWords })),
        bodyByChapter, bodyIntro: parts[0] ?? "",
        fixed: { presentation: profile.presentation, launch: profile.launch, closing: profile.closing },
        meta: {
          audience: profile.audience, tone: profile.tone, duration: profile.duration, theme: profile.theme,
          words: wordCount(script),
          models: [aiSettings.writerModel, aiSettings.openrouterModel, aiSettings.imageModel].filter(Boolean).join(" · "),
        },
        timecodes: estimatedTimecodes(project, profile),
        packaging: pack ? {
          options: pack.options.map(option => ({ id: option.id, register: option.register, title: option.title, description: option.description, overlay: option.overlay, concepts: option.concepts })),
          selected: project.packaging?.selected ?? {},
          description: pack.improvedDescription,
          tags: { ...mergeTags(pack.tags, profile.defaultTags ?? ""), limit: TAG_LIMIT },
          pinnedComment: pack.pinnedComment ?? "",
          quiz: pack.quiz.map(item => ({ question: item.question, options: item.options ?? [], correctOption: item.correctOption ?? 0 })),
          scores: project.packaging?.vidiqScores ?? {},
        } : null,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "projet"}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      showToast(lang === "fr" ? "Document Word téléchargé" : "Word document downloaded");
    } catch (error) {
      showToast(serverErrorMessage(error, lang), "error");
    } finally { setExporting(false); }
  };

  if (prompter) return <Prompter script={script} title={project.title} close={() => setPrompter(false)} t={t} copy={copy} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("studio")} aria-label="YoutubeMate"><span className="brand-mark">Y</span><span>YoutubeMate<small>Creator workspace</small></span></button>
        <button className="new-video" onClick={() => setNewOpen(true)}><span>＋</span>{t.newVideo}</button>
        <nav>
          <NavButton active={view === "studio"} icon="✍" label={t.studio} hint={t.hintStudio} onClick={() => setView("studio")} />
          <NavButton active={view === "shorts"} icon="✂" label={t.shorts} hint={t.hintShorts} onClick={() => setView("shorts")} />
          <NavButton active={view === "express"} icon="🎬" label={t.express} hint={t.hintExpress} onClick={() => setView("express")} />
          <NavButton active={view === "shorts-express"} icon="⚡" label={t.shortsExpress} hint={t.hintShortsExpress} onClick={() => setView("shorts-express")} />
          <NavButton active={view === "projects"} icon="▤" label={t.navProjects} count={projects.length} onClick={() => setView("projects")} />
          <NavButton active={view === "usage"} icon="◷" label={t.usage} hint={t.hintUsage} onClick={() => setView("usage")} />
          <NavButton active={view === "profile"} icon="◉" label={t.profile} onClick={() => setView("profile")} />
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-chip"><span>BK</span><div><strong>Baba Kourouma</strong><small>{profile.channel}</small></div><button>•••</button></div>
          <div className="language-toggle"><button className={lang === "fr" ? "active" : ""} onClick={() => setLang("fr")}>FR</button><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button></div>
        </div>
      </aside>

      <main className="main-area">
        {view === "studio" && <>
          <header className="topbar">
            <div><div className="breadcrumb">{t.projects} <span>/</span> <strong>{project.title}</strong></div><div className={`save-state ${saveState === "error" || saveState === "too-large" ? "failed" : ""}`} role={saveState === "error" || saveState === "too-large" ? "alert" : undefined}><i />{
              saveState === "saved" ? t.saved
              : saveState === "saving" ? (lang === "fr" ? "Sauvegarde…" : "Saving…")
              : saveState === "too-large" ? (lang === "fr" ? "Non sauvegardé : projet trop volumineux" : "Not saved: project too large")
              : (lang === "fr" ? "Non sauvegardé — vérifiez votre connexion" : "Not saved — check your connection")
            }</div></div>
            <div className="top-actions"><label className="pilot-switch"><span>{t.pilot}</span><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /><i /></label><button className="secondary" onClick={() => setPrompter(true)}>▣ {t.script}</button><button className="dark-button" onClick={download} disabled={exporting}>↓ {exporting ? (lang === "fr" ? "Préparation…" : "Preparing…") : t.export}</button></div>
          </header>
          <section className="stepper" aria-label="Pipeline">
            {t.steps.map((label, index) => { const number = index + 1; const state: StepState = project.step === number ? "active" : project.completed.includes(number) ? "done" : "todo"; return <button key={label} className={`step ${state}`} onClick={() => navigateStep(number)}><span>{state === "done" ? "✓" : number}</span><small>{label}</small></button>; })}
          </section>
          <div className="workspace">
            <section className="editor"><Stage project={project} profile={profile} t={t} lang={lang} updateProject={updateProject} generate={generateStep} copy={copy} showToast={showToast} aiLoading={studioAiLoading} bodyProgress={bodyProgress} integrations={integrations} aiModel={aiSettings.openrouterModel} writerModel={aiSettings.writerModel} iterateHook={(target, direction) => runHookAi("iterate", target, direction)} aiSettings={aiSettings} referenceThumbnails={referenceThumbnails} presenterKey={presenterPhoto?.key ?? ""} openAiSettings={() => setView("profile")} script={script} />
              {studioAiNotice?.projectId === activeId && <div className={`studio-ai-notice ${studioAiNotice.kind}`} role={studioAiNotice.kind === "error" ? "alert" : "status"}>
                <span>{studioAiNotice.kind === "error" ? "!" : "i"}</span>
                <div><strong>{studioAiNotice.kind === "error" ? (lang === "fr" ? "La génération n’a pas abouti" : "Generation did not complete") : (lang === "fr" ? "Ajustement conseillé" : "Adjustment recommended")}</strong><p>{studioAiNotice.message}</p><div><button onClick={generateStep} disabled={studioAiLoading}>↻ {lang === "fr" ? "Réessayer" : "Retry"}</button><button onClick={() => setView("profile")}>{lang === "fr" ? "Choisir un autre modèle" : "Choose another model"}</button></div></div>
                <button className="notice-close" aria-label={lang === "fr" ? "Fermer le message" : "Dismiss message"} onClick={() => setStudioAiNotice(null)}>×</button>
              </div>}
              <div className="editor-actions">{project.step <= 5 && <button className="ghost" onClick={generateStep} disabled={studioAiLoading}>{studioAiLoading ? (bodyProgress ? (lang === "fr" ? `L’IA rédige le chapitre ${bodyProgress.current}/${bodyProgress.total} — ${bodyProgress.title}…${bodyProgress.retrying ? " (nouvelle tentative…)" : ""}` : `AI is writing chapter ${bodyProgress.current}/${bodyProgress.total} — ${bodyProgress.title}…${bodyProgress.retrying ? " (retrying…)" : ""}`) : lang === "fr" ? (project.step === 3 ? "L’IA construit le plan…" : project.step === 4 ? "L’IA rédige le corps long…" : project.step === 5 ? "L’IA conclut…" : "L’IA travaille…") : "AI is working…") : `↻ ${t.regenerate}`}</button>}<button className="primary" onClick={validate} disabled={studioAiLoading}>{t.validate} <span>→</span></button></div>
            </section>
            <aside className="guard-panel"><div className="guard-title"><span>◆</span><div><strong>{t.guard}</strong><small>{lang === "fr" ? "Pour cette génération" : "For this generation"}</small></div></div><Guard label={t.facts} /><Guard label={t.fixed} /><Guard label={t.oral} /><Guard label={t.sources} /><hr /><div className="context-box"><small>{lang === "fr" ? "CONTEXTE ACTIF" : "ACTIVE CONTEXT"}</small><strong>{profile.channel}</strong><p>{profile.audience}</p><button onClick={() => setView("profile")}>{lang === "fr" ? "Voir le profil" : "View profile"} →</button></div></aside>
          </div>
        </>}
        {view === "shorts" && <ShortsStudio lang={lang} openrouterReady={integrations.openrouter.configured} openaiReady={integrations.openai.configured} writerModel={aiSettings.writerModel} imageModel={aiSettings.imageModel} imageQuality={aiSettings.imageQuality} channel={profile.channel} thumbnailSystemPrompt={profile.thumbnailSystemPrompt ?? ""} referenceKeys={referenceThumbnails.map(reference => reference.key)} presenterKey={presenterPhoto?.key ?? ""} showToast={showToast} copy={copy} openSettings={() => setView("profile")} postJson={postJsonWithRetry} connectionLost={connectionLostMessage} />}
        {view === "shorts-express" && <ShortsExpress lang={lang} openrouterReady={integrations.openrouter.configured} openaiReady={integrations.openai.configured} writerModel={aiSettings.writerModel} imageModel={aiSettings.imageModel} imageQuality={aiSettings.imageQuality} channel={profile.channel} thumbnailSystemPrompt={profile.thumbnailSystemPrompt ?? ""} referenceKeys={referenceThumbnails.map(reference => reference.key)} presenterKey={presenterPhoto?.key ?? ""} profile={{ channel: profile.channel, theme: profile.theme, audience: profile.audience, tone: profile.tone, descriptionFooter: profile.descriptionFooter }} showToast={showToast} copy={copy} openSettings={() => setView("profile")} postJson={postJsonWithRetry} connectionLost={connectionLostMessage} />}
        {view === "projects" && <Projects projects={projects} activeId={activeId} lang={lang} t={t} open={id => { setActiveId(id); setView("studio"); }} create={() => setNewOpen(true)} />}
        {view === "express" && <ExpressPackagingAI value={express} setValue={editExpress} profile={profile} lang={lang} copy={copy} showToast={showToast} aiSettings={aiSettings} integrations={integrations} referenceThumbnails={referenceThumbnails} presenterKey={presenterPhoto?.key ?? ""} openAiSettings={() => setView("profile")} projectRef={{ projectId: "", projectTitle: lang === "fr" ? "Package vidéo (hors projet)" : "Video package (standalone)" }} />}
        {view === "usage" && <CreditsUsage lang={lang} showToast={showToast} />}
        {view === "profile" && <ProfilePageAI profile={profile} setProfile={editProfile} lang={lang} t={t} aiSettings={aiSettings} setAiSettings={setAiSettings} integrations={integrations} youtube={youtube} refreshIntegrations={refreshIntegrations} legacyKeysFound={legacyKeysFound} clearLegacyKeys={() => { localStorage.removeItem("script-studio-ai-credentials"); setLegacyKeysFound(false); }} openRouterModels={openRouterModels} referenceThumbnails={referenceThumbnails} reloadReferences={loadReferenceThumbnails} presenterPhoto={presenterPhoto} reloadPresenter={loadPresenterPhoto} brandLogo={brandLogo} reloadLogo={loadBrandLogo} showToast={showToast} done={() => { showToast(lang === "fr" ? "Profil enregistré" : "Profile saved"); setView("studio"); }} />}
      </main>
      {newOpen && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title"><button className="modal-close" onClick={() => setNewOpen(false)}>×</button><span className="eyebrow">{lang === "fr" ? "NOUVEAU PROJET" : "NEW PROJECT"}</span><h2 id="new-project-title">{t.addSubject}</h2><p>{lang === "fr" ? "Soyez précis : le studio ne recherchera jamais une catégorie plus large." : "Be specific: the studio will never research a broader category."}</p><textarea value={newSubject} maxLength={2000} onChange={e => setNewSubject(e.target.value)} placeholder={lang === "fr" ? "Ex. Comment utiliser l’IA pour répondre aux clients sur WhatsApp Business" : "E.g. How to use AI to answer customers on WhatsApp Business"} /><div className="modal-actions"><button className="ghost" onClick={() => setNewOpen(false)}>{t.cancel}</button><button className="primary" onClick={createProject}>{t.create} →</button></div></div></div>}
      {alerts.length > 0 && <div className="alert-stack" aria-live="polite" aria-relevant="additions" onMouseEnter={() => setAlertsPaused(true)} onMouseLeave={() => setAlertsPaused(false)} onFocusCapture={() => setAlertsPaused(true)} onBlurCapture={() => setAlertsPaused(false)}>
        {alerts.length > 1 && <button className="alert-clear" onClick={() => setAlerts([])}>{lang === "fr" ? `Tout fermer (${alerts.length})` : `Dismiss all (${alerts.length})`}</button>}
        {alerts.map(alert => <div key={alert.id} className={`alert ${alert.kind}`} role={alert.kind === "success" ? "status" : "alert"}>
          <span className="alert-icon">{alert.kind === "success" ? "✓" : alert.kind === "warning" ? "i" : "!"}</span>
          <p className="alert-message">{alert.message}</p>
          {alert.count > 1 && <span className="alert-count">×{alert.count}</span>}
          <button className="alert-close" aria-label={lang === "fr" ? "Fermer l’alerte" : "Dismiss alert"} onClick={() => dismissAlert(alert.id)}>×</button>
        </div>)}
      </div>}
    </div>
  );
}

// The hint carries what the label cannot: which of the four entries applies to what the
// user already has in hand. It is hidden when the sidebar collapses.
function NavButton({ active, icon, label, hint, count, soon, onClick }: { active: boolean; icon: string; label: string; hint?: string; count?: number; soon?: string; onClick: () => void }) { return <button className={`${active ? "active" : ""}${soon ? " upcoming" : ""}${hint ? " with-hint" : ""}`} onClick={onClick}><span>{icon}</span><span className="nav-label">{label}{hint && <small>{hint}</small>}</span>{soon && <em>{soon}</em>}{count !== undefined && <i>{count}</i>}</button>; }
function Guard({ label }: { label: string }) { return <div className="guard-item"><span>✓</span>{label}</div>; }

function Stage({ project, profile, t, lang, updateProject, generate, copy, showToast, aiLoading, bodyProgress, integrations, aiModel, writerModel, iterateHook, aiSettings, referenceThumbnails, presenterKey, openAiSettings, script }: { project: Project; profile: Profile; t: (typeof labels)[Lang]; lang: Lang; updateProject: (p: Partial<Project>) => void; generate: () => void; copy: (v: string) => void; showToast: (message: string, kind?: AlertKind) => void; aiLoading: boolean; integrations: Integrations; bodyProgress: { current: number; total: number; title: string; retrying: boolean } | null; aiModel: string; writerModel: string; iterateHook: (target: HookIterationTarget, direction: string) => Promise<boolean>; aiSettings: AiSettings; referenceThumbnails: ReferenceThumbnail[]; presenterKey: string; openAiSettings: () => void; script: string }) {
  const wc = wordCount(project.hook); const title = t.steps[project.step - 1]; const plan = scriptPlan(profile, project);
  const [iterationTarget, setIterationTarget] = useState<HookIterationTarget>("both");
  const [hookDirection, setHookDirection] = useState("");
  const suggestions = lang === "fr" ? ["Plus direct", "Plus émotionnel", "Plus court", "Créer plus de curiosité"] : ["More direct", "More emotional", "Shorter", "Build more curiosity"];
  const applyHookDirection = async () => {
    if (!hookDirection.trim()) return;
    if (await iterateHook(iterationTarget, hookDirection.trim())) setHookDirection("");
  };
  const rebalanceTargets = (chapters: Chapter[]) => {
    const total = project.bodyWordTarget || plan.targetBodyWords;
    const each = Math.max(50, Math.floor(total / Math.max(1, chapters.length)));
    return chapters.map((chapter, index) => ({ ...chapter, targetWords: index === chapters.length - 1 ? total - each * (chapters.length - 1) : each }));
  };
  const changeChapters = (chapters: Chapter[]) => updateProject({ chapters, body: "", conclusion: "", bodyGeneratedByAi: false, bodyModel: "", reviewAccepted: false, completed: project.completed.filter(number => number < 3) });
  const editChapter = (id: string, patch: Partial<Chapter>) => changeChapters(project.chapters.map(chapter => chapter.id === id ? { ...chapter, ...patch } : chapter));
  const moveChapter = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= project.chapters.length) return;
    const chapters = [...project.chapters]; [chapters[index], chapters[nextIndex]] = [chapters[nextIndex], chapters[index]]; changeChapters(chapters);
  };
  const removeChapter = (id: string) => { if (project.chapters.length > 5) changeChapters(rebalanceTargets(project.chapters.filter(chapter => chapter.id !== id))); };
  const addChapter = () => {
    if (project.chapters.length >= 12) return;
    changeChapters(rebalanceTargets([...project.chapters, { id: `chapter-${crypto.randomUUID()}`, title: lang === "fr" ? "Nouveau chapitre" : "New chapter", objective: "", keyPoints: ["", ""], targetWords: 100 }]));
  };
  if (project.step === 1) return <><StageHead n={1} title={title} desc={lang === "fr" ? "Confirmez le cadrage avant toute recherche." : "Confirm the scope before any research."} /><div className="chat-bubble"><span className="ai-avatar">S</span><div><small>Script Studio AI</small><p>{lang === "fr" ? `Pour confirmer : tu souhaites traiter exactement « ${project.subject} », sans élargir le sujet. C’est bien ça ?` : `To confirm: you want to cover exactly “${project.subject}”, without broadening the topic. Is that correct?`}</p></div></div>{!project.confirmed ? <button className="confirm-card" onClick={generate}>✓ {lang === "fr" ? "Oui, confirmer ce cadrage" : "Yes, confirm this scope"}</button> : <div className="result-card"><div className="result-head"><span>✓</span><div><strong>{lang === "fr" ? "Cadrage confirmé" : "Scope confirmed"}</strong><small>{profile.youtubeConnected ? "YouTube Data API" : t.noKey}</small></div></div><div className="position-grid"><Position tag="SÛR" title={lang === "fr" ? "La méthode pas à pas" : "The step-by-step method"} /><Position tag="DIFFÉRENCIANT" title={lang === "fr" ? "Ce qu’il faut garder humain" : "What must stay human"} /><Position tag="LOCAL" title={lang === "fr" ? "Cas concret pour l’audience" : "A real audience use case"} /></div><p className="note">{lang === "fr" ? "Aucune donnée de marché n’a été inventée. Collez une recherche externe ou connectez votre clé YouTube pour enrichir l’analyse." : "No market data was invented. Paste external research or connect your YouTube key to enrich the analysis."}</p></div>}</>;
  if (project.step === 2) { const invalidateHookDownstream = (patch: Partial<Project>) => updateProject({ ...patch, hookGeneratedByAi: false, chapters: [], body: "", conclusion: "", bodyGeneratedByAi: false, bodyModel: "", reviewAccepted: false, completed: project.completed.filter(number => number < 2) }); return <><StageHead n={2} title={title} desc={lang === "fr" ? "Accrochez en 10–15 secondes, puis installez une promesse tenue." : "Hook viewers in 10–15 seconds, then set a promise you can keep."} />{!project.hook ? <EmptyGenerate onClick={generate} t={t} lang={lang} /> : <><div className={`ai-generated-note ${project.hookGeneratedByAi ? "verified" : "manual"}`}><span>{project.hookGeneratedByAi ? "✦" : "✎"}</span><div><strong>{project.hookGeneratedByAi ? (lang === "fr" ? "Contenu généré avec l’IA" : "AI-generated content") : (lang === "fr" ? "Version existante ou modifiée manuellement" : "Existing or manually edited version")}</strong><small>{project.hookGeneratedByAi ? `${aiModel || "OpenRouter"} · ${lang === "fr" ? "modifiable manuellement ou avec vos orientations" : "editable manually or with your directions"}` : (lang === "fr" ? "Régénérez ou utilisez vos orientations pour créer une nouvelle version avec OpenRouter." : "Regenerate or use your directions to create a new version with OpenRouter.")}</small></div></div><OutputBlock label="HOOK" value={project.hook} onChange={v => invalidateHookDownstream({ hook: v })} copy={() => copy(project.hook)} meta={<><span className={wc > 40 ? "danger" : "good"}>{wc} / 40 {t.words}</span><span>≈ {Math.max(1, Math.round(wc / 2.7))} {t.seconds}</span></>} /><div className="locked-copy"><div><span>⌕</span><strong>{lang === "fr" ? "Présentation fixe" : "Fixed introduction"}</strong><small>{lang === "fr" ? "Protégée mot pour mot" : "Protected word for word"}</small></div><p>{profile.presentation}</p></div><OutputBlock label={lang === "fr" ? "PROMESSE" : "PROMISE"} value={project.promise} onChange={v => invalidateHookDownstream({ promise: v })} copy={() => copy(project.promise)} /><div className="locked-line"><span>⌕</span>{profile.launch}</div><section className="hook-iteration"><div className="hook-iteration-head"><span>✦</span><div><h3>{lang === "fr" ? "Affiner avec l’IA" : "Refine with AI"}</h3><p>{lang === "fr" ? "Proposez une modification ou donnez une orientation précise. Les textes fixes resteront intacts." : "Suggest a change or give a precise direction. Fixed copy will remain unchanged."}</p></div></div><div className="iteration-targets" aria-label={lang === "fr" ? "Élément à modifier" : "Content to edit"}><button className={iterationTarget === "hook" ? "active" : ""} onClick={() => setIterationTarget("hook")}>Hook</button><button className={iterationTarget === "promise" ? "active" : ""} onClick={() => setIterationTarget("promise")}>{lang === "fr" ? "Promesse" : "Promise"}</button><button className={iterationTarget === "both" ? "active" : ""} onClick={() => setIterationTarget("both")}>{lang === "fr" ? "Les deux" : "Both"}</button></div><div className="direction-suggestions">{suggestions.map(suggestion => <button key={suggestion} onClick={() => setHookDirection(suggestion)}>＋ {suggestion}</button>)}</div><label><span>{lang === "fr" ? "Vos orientations" : "Your directions"}</span><textarea value={hookDirection} maxLength={2000} onChange={event => setHookDirection(event.target.value)} rows={3} placeholder={lang === "fr" ? "Ex. Commence par une question plus provocante, garde un ton simple et évite le mot automatiser…" : "E.g. Start with a more provocative question, keep it simple, and avoid the word automate…"} /></label><div className="hook-iteration-action"><small>{lang === "fr" ? "L’IA réécrit uniquement la partie sélectionnée." : "AI rewrites only the selected part."}</small><button className="primary" onClick={applyHookDirection} disabled={aiLoading || !hookDirection.trim()}>{aiLoading ? (lang === "fr" ? "Application…" : "Applying…") : (lang === "fr" ? "Appliquer mes orientations" : "Apply my directions")} →</button></div></section></>}</>; }
  if (project.step === 3) return <><StageHead n={3} title={title} desc={lang === "fr" ? "Validez la structure avant que l’IA développe le moindre paragraphe." : "Approve the structure before AI develops any paragraph."} /><div className="chapter-plan-summary"><div><span>{profile.duration}</span><small>{lang === "fr" ? "durée cible" : "target duration"}</small></div><div><span>≈ {project.bodyWordTarget || plan.targetBodyWords}</span><small>{lang === "fr" ? "mots dans le corps" : "body words"}</small></div><div><span>{plan.chapterCount}</span><small>{lang === "fr" ? "chapitres recommandés" : "recommended chapters"}</small></div><div><span>HIGH</span><small>{writerModel || (lang === "fr" ? "modèle thinking" : "thinking model")}</small></div></div>{!project.chapters.length ? <EmptyGenerate onClick={generate} t={t} lang={lang} /> : <><div className="chapter-toolbar"><div><strong>{project.chapters.length} {lang === "fr" ? "chapitres proposés" : "proposed chapters"}</strong><small>{lang === "fr" ? "Modifiez, réordonnez ou précisez les points clés avant validation." : "Edit, reorder or refine the key points before approval."}</small></div><button onClick={addChapter} disabled={project.chapters.length >= 12}>＋ {lang === "fr" ? "Ajouter" : "Add"}</button></div><div className="chapter-list">{project.chapters.map((chapter, index) => <article className="chapter-card" key={chapter.id}><div className="chapter-index"><span>{String(index + 1).padStart(2, "0")}</span><small>{chapter.targetWords} {t.words}</small></div><div className="chapter-fields"><label><span>{lang === "fr" ? "Titre" : "Title"}</span><input value={chapter.title} maxLength={160} onChange={event => editChapter(chapter.id, { title: event.target.value })} /></label><label><span>{lang === "fr" ? "Objectif du chapitre" : "Chapter objective"}</span><textarea rows={2} value={chapter.objective} maxLength={800} onChange={event => editChapter(chapter.id, { objective: event.target.value })} /></label><label><span>{lang === "fr" ? "Points clés — un par ligne" : "Key points — one per line"}</span><textarea rows={3} value={chapter.keyPoints.join("\n")} onChange={event => editChapter(chapter.id, { keyPoints: event.target.value.split("\n").slice(0, 5) })} /></label></div><div className="chapter-actions"><button onClick={() => moveChapter(index, -1)} disabled={index === 0} aria-label={lang === "fr" ? "Monter le chapitre" : "Move chapter up"}>↑</button><button onClick={() => moveChapter(index, 1)} disabled={index === project.chapters.length - 1} aria-label={lang === "fr" ? "Descendre le chapitre" : "Move chapter down"}>↓</button><button className="remove" onClick={() => removeChapter(chapter.id)} disabled={project.chapters.length <= 5} aria-label={lang === "fr" ? "Supprimer le chapitre" : "Remove chapter"}>×</button></div></article>)}</div><p className="chapter-edit-warning">ⓘ {lang === "fr" ? "Toute modification du plan efface l’ancien corps devenu obsolète. Rien ne sera rédigé avant votre validation." : "Any plan edit clears the now-stale body. Nothing is written before your approval."}</p></>}</>;
  if (project.step === 4) { const bodyWords = wordCount(project.body); const inRange = bodyWords >= plan.minimumBodyWords && bodyWords <= plan.maximumBodyWords; return <><StageHead n={4} title={title} desc={lang === "fr" ? `Corps long format fondé sur les ${project.chapters.length} chapitres validés.` : `Long-form body based on the ${project.chapters.length} approved chapters.`} /><div className={`body-target ${inRange ? "ready" : "short"}`}><div><strong>{bodyWords.toLocaleString(lang)} / {(project.bodyWordTarget || plan.targetBodyWords).toLocaleString(lang)} {t.words}</strong><small>{lang === "fr" ? `Minimum ${plan.minimumBodyWords.toLocaleString(lang)} mots pour ${plan.minimum} min` : `Minimum ${plan.minimumBodyWords.toLocaleString(lang)} words for ${plan.minimum} min`}</small></div><div><strong>≈ {plan.estimatedMinutes.toFixed(1)} min</strong><small>{lang === "fr" ? "vidéo complète estimée" : "estimated full video"}</small></div><span><i style={{ width: `${Math.min(100, bodyWords / Math.max(1, project.bodyWordTarget || plan.targetBodyWords) * 100)}%` }} /></span></div>{!project.body ? <EmptyGenerate onClick={generate} t={t} lang={lang} busy={aiLoading} busyLabel={bodyProgress ? (lang === "fr" ? `L’IA rédige le chapitre ${bodyProgress.current}/${bodyProgress.total} — ${bodyProgress.title}…` : `AI is writing chapter ${bodyProgress.current}/${bodyProgress.total} — ${bodyProgress.title}…`) : undefined} /> : <><div className={`ai-generated-note ${project.bodyGeneratedByAi ? "verified" : "manual"}`}><span>{project.bodyGeneratedByAi ? "✦" : "✎"}</span><div><strong>{aiLoading && bodyProgress ? (lang === "fr" ? `Rédaction en cours — chapitre ${bodyProgress.current}/${bodyProgress.total}` : `Writing in progress — chapter ${bodyProgress.current}/${bodyProgress.total}`) : project.bodyGeneratedByAi ? (lang === "fr" ? "Corps long généré avec réflexion élevée" : "Long-form body generated with high reasoning") : (lang === "fr" ? "Corps modifié manuellement" : "Manually edited body")}</strong><small>{project.bodyModel || writerModel}</small></div></div><OutputBlock label={lang === "fr" ? "CORPS DU SCRIPT" : "SCRIPT BODY"} value={project.body} onChange={v => updateProject({ body: v, bodySections: undefined, bodyGeneratedByAi: false, conclusion: "", reviewAccepted: false, completed: project.completed.filter(number => number < 4) })} copy={() => copy(project.body)} rows={28} readOnly={aiLoading} meta={<span className={bodyWords < plan.minimumBodyWords ? "danger" : "good"}>{bodyWords} {t.words}</span>} /></>}</> }
  if (project.step === 5) return <><StageHead n={5} title={title} desc={lang === "fr" ? "L’IA récapitule uniquement ce que le corps validé a réellement démontré." : "AI recaps only what the approved body actually demonstrated."} />{!project.conclusion ? <EmptyGenerate onClick={generate} t={t} lang={lang} /> : <><div className="ai-generated-note verified"><span>✦</span><div><strong>{lang === "fr" ? "Conclusion générée depuis le corps complet" : "Conclusion generated from the complete body"}</strong><small>{writerModel} · high thinking</small></div></div><OutputBlock label="CONCLUSION" value={project.conclusion} onChange={v => updateProject({ conclusion: v, reviewAccepted: false, completed: project.completed.filter(number => number < 5) })} copy={() => copy(project.conclusion)} rows={10} meta={<span>{wordCount(project.conclusion)} {t.words}</span>} /><div className="locked-line"><span>⌕</span>{profile.closing}</div></>}</>;
  if (project.step === 6) { const chaptersCovered = project.chapters.length >= 5 && project.chapters.every((_, index) => project.body.includes(`CHAPITRE ${index + 1}`)); const durationValid = plan.estimatedMinutes >= plan.minimum && plan.estimatedMinutes <= plan.maximum; return <><StageHead n={6} title={title} desc={lang === "fr" ? "Le relecteur signale les contrôles automatiques et ceux qui exigent votre jugement." : "The reviewer separates automatic checks from those requiring your judgment."} /><div className="stop-banner"><span>Ⅱ</span><div><strong>{t.mandatoryStop}</strong><p>{lang === "fr" ? "Même en Pilote automatique, vous décidez avant le packaging." : "Even in Autopilot, you decide before packaging."}</p></div></div><div className="review-list"><Review status="warn" label={lang === "fr" ? "Vérifiez que le corps tient réellement la promesse" : "Confirm that the body truly fulfils the promise"} detail={lang === "fr" ? "Ce contrôle sémantique reste une décision humaine." : "This semantic check remains a human decision."} /><Review status={chaptersCovered ? "ok" : "warn"} label={chaptersCovered ? (lang === "fr" ? `${project.chapters.length} chapitres présents dans l’ordre` : `${project.chapters.length} chapters present in order`) : (lang === "fr" ? "Un ou plusieurs chapitres sont absents" : "One or more chapters are missing")} /><Review status={durationValid ? "ok" : "warn"} label={lang === "fr" ? `${wordCount(project.body)} mots · environ ${plan.estimatedMinutes.toFixed(1)} minutes` : `${wordCount(project.body)} words · about ${plan.estimatedMinutes.toFixed(1)} minutes`} /><Review status="warn" label={lang === "fr" ? "Vérifiez les faits, chiffres et sources avant publication" : "Verify facts, figures, and sources before publishing"} detail={lang === "fr" ? "Le studio n’affirme pas avoir vérifié automatiquement des sources absentes." : "The studio does not claim to have automatically verified missing sources."} /></div><label className="decision"><input type="checkbox" checked={project.reviewAccepted} onChange={e => updateProject({ reviewAccepted: e.target.checked })} /><span><strong>{lang === "fr" ? "J’ai effectué les vérifications humaines" : "I completed the human checks"}</strong><small>{lang === "fr" ? "Cette décision déverrouille l’étape 7." : "This decision unlocks step 7."}</small></span></label></>; }
  return <StudioPackaging project={project} profile={profile} updateProject={updateProject} lang={lang} t={t} copy={copy} showToast={showToast} aiSettings={aiSettings} integrations={integrations} referenceThumbnails={referenceThumbnails} presenterKey={presenterKey} openAiSettings={openAiSettings} script={script} />;
}

function StageHead({ n, title, desc }: { n: number; title: string; desc: string }) { return <div className="stage-head"><span>ÉTAPE {n} / 7</span><h1>{title}</h1><p>{desc}</p></div>; }
function Position({ tag, title }: { tag: string; title: string }) { return <div><span>{tag}</span><strong>{title}</strong><small>Score estimé · 82/100</small></div>; }
function EmptyGenerate({ onClick, t, lang, busy = false, busyLabel }: { onClick: () => void; t: (typeof labels)[Lang]; lang: Lang; busy?: boolean; busyLabel?: string }) { return <div className="empty-generate"><span>✦</span><h3>{lang === "fr" ? "Tout est prêt pour cette étape" : "Everything is ready for this step"}</h3><p>{lang === "fr" ? "Le profil et les sorties validées seront utilisés comme contexte." : "Your profile and approved outputs will be used as context."}</p><button className="primary" onClick={onClick} disabled={busy}>✦ {busy ? (busyLabel ?? (lang === "fr" ? "Génération en cours…" : "Generating…")) : t.launch}</button></div>; }
function OutputBlock({ label, value, onChange, copy, meta, rows = 5, readOnly = false }: { label: string; value: string; onChange: (v: string) => void; copy: () => void; meta?: React.ReactNode; rows?: number; readOnly?: boolean }) { return <div className="output-block"><div className="output-label"><span>{label}</span><div>{meta}<button onClick={copy}>⧉ Copier</button></div></div><textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} readOnly={readOnly} /></div>; }
function Review({ status, label, detail }: { status: "ok" | "warn"; label: string; detail?: string }) { return <div className={`review ${status}`}><span>{status === "ok" ? "✓" : "!"}</span><div><strong>{label}</strong>{detail && <small>{detail}</small>}</div></div>; }

function quizChoices(item: PackagingResult["quiz"][number], lang: Lang) {
  if (Array.isArray(item.options) && item.options.length === 3) return item.options;
  return [item.answer || (lang === "fr" ? "Réponse enregistrée" : "Saved answer"), lang === "fr" ? "Régénérez le packaging" : "Regenerate packaging", lang === "fr" ? "pour obtenir trois choix" : "to obtain three choices"];
}

function quizClipboard(item: PackagingResult["quiz"][number], lang: Lang) {
  const choices = quizChoices(item, lang);
  const letters = ["A", "B", "C"];
  return `${item.question}\n${choices.map((choice, index) => `${letters[index]}. ${choice}`).join("\n")}\n${lang === "fr" ? "Bonne réponse" : "Correct answer"}: ${letters[item.correctOption ?? 0]}`;
}

function ExpressPackagingAI({ value, setValue, profile, lang, copy, showToast, aiSettings, integrations, referenceThumbnails, presenterKey, openAiSettings, projectRef, autoStart, embedded }: {
  value: ExpressState; setValue: (value: ExpressState) => void; profile: Profile; lang: Lang;
  copy: (value: string) => void; showToast: (message: string, kind?: AlertKind) => void; aiSettings: AiSettings; integrations: Integrations; referenceThumbnails: ReferenceThumbnail[]; presenterKey: string; openAiSettings: () => void;
  projectRef: { projectId: string; projectTitle: string };
  autoStart?: boolean; embedded?: boolean;
}) {
  const [loading, setLoading] = useState<"package" | "images" | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ id: string; src: string; title: string; caption: string } | null>(null);
  const [promptEditor, setPromptEditor] = useState<{ optionId: string; index: number; draft: string; direction: string } | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [direction, setDirection] = useState("");
  const update = (patch: Partial<ExpressState>) => setValue({ ...value, ...patch });
  const configured = Boolean(integrations.openrouter.configured && aiSettings.openrouterModel);
  const autoStarted = useRef(false);

  const savePrompt = () => {
    if (!promptEditor || !value.package) return;
    const nextPrompt = promptEditor.draft.trim();
    if (!nextPrompt) return;
    update({ package: { ...value.package, options: value.package.options.map(option => option.id !== promptEditor.optionId ? option : { ...option, concepts: option.concepts.map((concept, index) => index === promptEditor.index ? { ...concept, prompt: nextPrompt } : concept) }) } });
    setPromptEditor(null);
    showToast(lang === "fr" ? "Prompt de miniature mis à jour" : "Thumbnail prompt updated");
  };

  const regeneratePrompt = async (option: PackagingOption) => {
    if (!promptEditor || promptLoading) return;
    if (!configured) return showToast(lang === "fr" ? "Ajoutez votre clé OpenRouter et choisissez un modèle." : "Add your OpenRouter key and choose a model.", "warning");
    setPromptLoading(true);
    try {
      const response = await postJsonWithRetry("/api/concept-prompt", {
        ...projectRef,
        model: aiSettings.openrouterModel, language: lang,
        topic: value.package?.topic ?? value.subject, title: option.title, overlay: option.overlay,
        conceptName: option.concepts[promptEditor.index]?.name ?? "", currentPrompt: promptEditor.draft, direction: promptEditor.direction,
        profile: { channel: profile.channel, theme: profile.theme, thumbnailSystemPrompt: profile.thumbnailSystemPrompt },
      });
      const data = await response.json() as { prompt?: string; detail?: string; error?: string };
      const prompt = data.prompt;
      if (!response.ok || !prompt) throw new Error(data.detail || data.error || "prompt_failed");
      setPromptEditor(current => current && { ...current, draft: prompt });
      showToast(lang === "fr" ? "Prompt régénéré — vérifiez puis enregistrez" : "Prompt regenerated — review then save");
    } catch (error) {
      showToast(serverErrorMessage(error, lang, "openrouter"), "error");
    } finally { setPromptLoading(false); }
  };

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preview]);

  /**
   * `steer` regenerates the three options from a user direction. It runs on the
   * thinking model with high reasoning: following a brief across three coherent,
   * genuinely distinct options is a reasoning task, not a rephrasing one.
   */
  const generate = async (steer = false) => {
    if (value.source.trim().length < 80) return showToast(lang === "fr" ? "Ajoutez au moins 80 caractères de contenu." : "Add at least 80 characters of content.", "warning");
    if (!configured) return showToast(lang === "fr" ? "Ajoutez votre clé OpenRouter et choisissez un modèle." : "Add your OpenRouter key and choose a model.", "warning");
    const steering = steer ? direction.trim() : "";
    if (steer && !steering) return showToast(lang === "fr" ? "Écrivez d’abord votre orientation." : "Write your direction first.", "warning");
    setLoading("package");
    try {
      const response = await postJsonWithRetry("/api/openrouter-generate", {
        ...projectRef, pipeline: embedded ? "script" : "express",
        model: steering && aiSettings.writerModel ? aiSettings.writerModel : aiSettings.openrouterModel,
        thinking: Boolean(steering && aiSettings.writerModel),
        direction: steering,
        previousTitles: steering ? (value.package?.options ?? []).map(option => option.title) : [],
        language: lang, inputType: value.inputType, subject: value.subject, source: value.source,
        profile: { channel: profile.channel, theme: profile.theme, audience: profile.audience, tone: profile.tone, thumbnailSystemPrompt: profile.thumbnailSystemPrompt, descriptionFooter: profile.descriptionFooter },
      });
      const data = await response.json() as { result?: PackagingResult; error?: string; detail?: string };
      if (response.status === 401) throw new Error(lang === "fr" ? "Clé OpenRouter refusée. Testez-la dans le profil." : "OpenRouter rejected the key. Test it in your profile.");
      if (!response.ok || !data.result) throw new Error(data.detail || data.error || "generation_failed");
      const result = data.result;
      if (!Array.isArray(result.options) || result.options.length !== 3 || result.options.some(option => !Array.isArray(option.concepts) || option.concepts.length !== 3)) throw new Error("invalid_packaging_shape");
      update({ generated: true, thumbnailsGenerated: false, package: result, vidiqScores: {}, vidiqStatus: "idle", selected: { A: 0, B: 0, C: 0 } });
      setImages({});
      if (steering) showToast(lang === "fr" ? "Trois nouvelles options selon votre orientation" : "Three new options following your direction");
    } catch (error) {
      showToast(serverErrorMessage(error, lang, "openrouter"), "error");
    } finally { setLoading(null); }
  };

  // Fires once per mount: the studio hands over an already-approved script, so there is
  // nothing left to click before generating.
  useEffect(() => {
    if (!autoStart || autoStarted.current || value.generated || loading !== null) return;
    autoStarted.current = true;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, value.generated, loading]);

  const syncVidiqScores = async (options: PackagingOption[]) => {
    update({ vidiqStatus: "loading" });
    try {
      const response = await fetch("/api/vidiq-score", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ titles: options.map(option => ({ id: option.id, title: option.title })) }) });
      const data = await response.json() as { scores?: Record<string, number>; error?: string };
      if (!response.ok || !data.scores) throw new Error(data.error || "vidiq_unavailable");
      update({ vidiqScores: data.scores, vidiqStatus: "synced" });
      showToast(lang === "fr" ? "Scores vidIQ synchronisés" : "vidIQ scores synced");
    } catch {
      update({ vidiqStatus: "error" });
      showToast(lang === "fr" ? "Connexion vidIQ indisponible. Aucun score n’a été estimé." : "vidIQ unavailable. No score was estimated.", "error");
    }
  };

  const generateThumbnails = async (options: PackagingOption[]) => {
    if (!integrations.openai.configured) return showToast(lang === "fr" ? "Ajoutez votre clé OpenAI dans le Profil de chaîne." : "Add your OpenAI key in Channel profile.", "warning");
    setLoading("images");
    try {
      const generated = await Promise.all(options.map(async option => {
        const conceptIndex = value.selected[option.id] ?? 0;
        const concept = option.concepts[conceptIndex];
        const response = await fetch("/api/openai-image", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...projectRef, model: aiSettings.imageModel, quality: aiSettings.imageQuality, prompt: concept.prompt, overlay: option.overlay, channel: profile.channel, systemPrompt: profile.thumbnailSystemPrompt, referenceKeys: referenceThumbnails.map(reference => reference.key), presenterKey, pipeline: "script" }),
        });
        const data = await response.json() as { image?: string; error?: string; detail?: string };
        if (!response.ok || !data.image) throw new Error(data.detail || data.error || `image_${option.id}_failed`);
        return [option.id, data.image] as const;
      }));
      setImages(Object.fromEntries(generated));
      update({ thumbnailsGenerated: true });
      showToast(lang === "fr" ? "3 miniatures réellement générées" : "3 thumbnails generated");
    } catch (error) {
      update({ thumbnailsGenerated: false });
      showToast(serverErrorMessage(error, lang, "openai"), "error");
    } finally { setLoading(null); }
  };

  const downloadThumbnail = (src: string, id: string) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 720;
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
      const width = image.width * scale; const height = image.height * scale;
      ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      const link = document.createElement("a"); link.download = `miniature-${id.toLowerCase()}-1280x720.png`; link.href = canvas.toDataURL("image/png"); link.click();
    };
    image.src = src;
  };

  if (!value.generated || !value.package) return embedded ? <div className={`studio-packaging-pending ${configured ? "ready" : "blocked"}`}>
    <span>{configured ? "✦" : "!"}</span>
    <div>
      <strong>{loading === "package" ? (lang === "fr" ? "L’IA prépare le packaging…" : "AI is preparing the packaging…") : configured ? (lang === "fr" ? "Packaging prêt à générer" : "Packaging ready to generate") : (lang === "fr" ? "Configuration IA requise" : "AI setup required")}</strong>
      <small>{configured ? (lang === "fr" ? `${aiSettings.openrouterModel} · à partir du script validé et de vos réponses, sans rien inventer` : `${aiSettings.openrouterModel} · from the approved script and your answers, inventing nothing`) : (lang === "fr" ? "Ajoutez votre clé OpenRouter et choisissez un modèle dans le Profil de chaîne." : "Add your OpenRouter key and choose a model in Channel profile.")}</small>
    </div>
    {configured
      ? <button className="primary" onClick={() => generate()} disabled={loading !== null}>{loading === "package" ? (lang === "fr" ? "Génération…" : "Generating…") : (lang === "fr" ? "Générer le packaging" : "Generate packaging")}</button>
      : <button onClick={openAiSettings}>{lang === "fr" ? "Configurer" : "Configure"} →</button>}
  </div> : <div className="express-page">
    <div className="express-hero"><div><span className="eyebrow">{lang === "fr" ? "VIDÉO DÉJÀ TOURNÉE" : "VIDEO ALREADY RECORDED"}</span><h1>{lang === "fr" ? "Du contenu au clic." : "From content to click."}</h1><p>{lang === "fr" ? "Collez votre script ou votre description. Le modèle OpenRouter choisi prépare le packaging, puis OpenAI génère les vraies miniatures." : "Paste your script or description. Your chosen OpenRouter model prepares the packaging, then OpenAI generates real thumbnails."}</p></div><div className="express-orbit"><span>3×3</span><small>{lang === "fr" ? "titres × concepts" : "titles × concepts"}</small></div></div>
    <section className="express-input-card">
      <div className={`ai-ready-strip ${configured && integrations.openai.configured ? "ready" : ""}`}><span>{configured && integrations.openai.configured ? "✓" : "!"}</span><div><strong>{configured && integrations.openai.configured ? (lang === "fr" ? "IA configurée" : "AI configured") : (lang === "fr" ? "Configuration IA requise" : "AI setup required")}</strong><small>{configured ? aiSettings.openrouterModel : (lang === "fr" ? "Clé OpenRouter + modèle requis" : "OpenRouter key + model required")} · {integrations.openai.configured ? aiSettings.imageModel : (lang === "fr" ? "clé OpenAI manquante" : "OpenAI key missing")} · {lang === "fr" ? "clés chiffrées côté serveur" : "keys encrypted server-side"}</small></div><button onClick={openAiSettings}>{lang === "fr" ? "Configurer" : "Configure"}</button></div>
      <div className="vidiq-requirement"><span>◆</span><div><strong>{lang === "fr" ? "Scores vidIQ facultatifs" : "vidIQ scores are optional"}</strong><small>{lang === "fr" ? "Le packaging se génère sans vidIQ. Si votre relais est configuré, les scores sont repris tels quels — jamais estimés." : "Packaging works without vidIQ. If your relay is configured, scores are reported exactly as returned — never estimated."}</small></div></div>
      <div className="source-toggle"><button className={value.inputType === "script" ? "active" : ""} onClick={() => update({ inputType: "script", generated: false })}>▤ {lang === "fr" ? "J’ai le script" : "I have the script"}<small>{lang === "fr" ? "Inclut 5 quiz" : "Includes 5 quizzes"}</small></button><button className={value.inputType === "description" ? "active" : ""} onClick={() => update({ inputType: "description", generated: false })}>≡ {lang === "fr" ? "J’ai la description" : "I have the description"}<small>{lang === "fr" ? "Packaging uniquement" : "Packaging only"}</small></button></div>
      <label><span>{lang === "fr" ? "Sujet de la vidéo (facultatif)" : "Video topic (optional)"}</span><input value={value.subject} onChange={event => update({ subject: event.target.value, generated: false })} placeholder={lang === "fr" ? "Le système le déduira du contenu si ce champ est vide" : "The system will infer it from the content if left blank"} /></label>
      <label><span>{value.inputType === "script" ? (lang === "fr" ? "Script complet" : "Full script") : (lang === "fr" ? "Description existante" : "Existing description")}</span><textarea value={value.source} onChange={event => update({ source: event.target.value, generated: false })} rows={13} placeholder={lang === "fr" ? "Collez ici le contenu exact de la vidéo…" : "Paste the exact video content here…"} /></label>
      <div className="input-footer"><span>◆ {lang === "fr" ? "Les clés restent uniquement en mémoire pendant cette session" : "Keys remain only in memory for this session"}</span><button className="primary express-generate" onClick={() => generate()} disabled={loading !== null || !configured}>{loading === "package" ? (lang === "fr" ? "Génération avec l’IA…" : "Generating with AI…") : (lang === "fr" ? "Générer le packaging" : "Generate packaging")} →</button></div>
    </section>
  </div>;

  const pack = value.package;
  const bestScoredOption = pack.options.reduce<PackagingOption | undefined>((best, option) => {
    const optionScore = value.vidiqScores?.[option.id];
    if (typeof optionScore !== "number") return best;
    if (!best) return option;
    const bestScore = value.vidiqScores?.[best.id];
    return typeof bestScore !== "number" || optionScore > bestScore ? option : best;
  }, undefined);
  return <div className={`express-page results${embedded ? " embedded" : ""}`}>
    <div className="express-result-head"><div>{embedded
      ? <button onClick={() => generate()} disabled={loading !== null}>↻ {loading === "package" ? (lang === "fr" ? "Régénération…" : "Regenerating…") : (lang === "fr" ? "Régénérer le packaging" : "Regenerate packaging")}</button>
      : <button onClick={() => update({ generated: false, thumbnailsGenerated: false })}>← {lang === "fr" ? "Modifier la source" : "Edit source"}</button>}<span className="eyebrow">{embedded ? (lang === "fr" ? "PACKAGING · ÉTAPE 7" : "PACKAGING · STEP 7") : (lang === "fr" ? "PACKAGING EXPRESS · IA" : "AI EXPRESS PACKAGING")}</span><h1>{pack.topic}</h1></div><div className="result-status"><span>✓</span><div><strong>{lang === "fr" ? "Généré par" : "Generated by"} {aiSettings.openrouterModel}</strong><small>{value.inputType === "script" ? "Script + quiz" : (lang === "fr" ? "Description seule" : "Description only")}</small></div></div></div>
    <section className="express-section"><div className="express-section-title"><span>01</span><div><h2>{lang === "fr" ? "Tests A/B/C" : "A/B/C tests"}</h2><p>{lang === "fr" ? "Choisissez un concept visuel pour chaque paire titre–description." : "Choose one visual concept for each title–description pair."}</p></div><button className={`vidiq-sync ${value.vidiqStatus || "idle"}`} onClick={() => syncVidiqScores(pack.options)} disabled={value.vidiqStatus === "loading"}>{value.vidiqStatus === "loading" ? (lang === "fr" ? "Synchronisation…" : "Syncing…") : (lang === "fr" ? "Synchroniser les scores vidIQ" : "Sync vidIQ scores")}</button></div>
      <section className="ab-steer">
        <div className="ab-steer-head"><span>✦</span><div><strong>{lang === "fr" ? "Orienter les trois options" : "Steer the three options"}</strong><small>{lang === "fr" ? "Donnez une direction éditoriale : l’IA regénère les trois titres, descriptions et concepts en la suivant, sans reproposer les titres actuels." : "Give an editorial direction: AI regenerates all three titles, descriptions and concepts to follow it, without repeating the current titles."}</small></div></div>
        <div className="ab-steer-suggestions">{(lang === "fr"
          ? ["Plus provocant", "Plus concret et chiffré", "Angle débutant", "Insister sur la gratuité", "Ton plus calme"]
          : ["More provocative", "More concrete", "Beginner angle", "Stress that it is free", "Calmer tone"]
        ).map(suggestion => <button key={suggestion} onClick={() => setDirection(suggestion)}>＋ {suggestion}</button>)}</div>
        <textarea value={direction} rows={3} maxLength={2000} onChange={event => setDirection(event.target.value)} placeholder={lang === "fr" ? "Ex. Mets l’accent sur ce qui reste bloqué plutôt que sur la gratuité, et évite le mot « illimité » dans les titres…" : "E.g. Emphasise what stays locked rather than the free tier, and avoid the word “unlimited” in the titles…"} />
        <div className="ab-steer-action">
          <small>{aiSettings.writerModel ? (lang === "fr" ? `Régénération avec réflexion élevée · ${aiSettings.writerModel}` : `Regeneration with high reasoning · ${aiSettings.writerModel}`) : (lang === "fr" ? "Choisissez un modèle de scénarisation dans les réglages pour activer la réflexion élevée." : "Choose a long-form writing model in settings to enable high reasoning.")}</small>
          <button className="primary" onClick={() => generate(true)} disabled={loading !== null || !direction.trim()}>{loading === "package" ? (lang === "fr" ? "Régénération…" : "Regenerating…") : `↻ ${lang === "fr" ? "Régénérer les 3 options" : "Regenerate the 3 options"}`}</button>
        </div>
      </section>
      <div className="ab-options">{pack.options.map(option => <article className="ab-option" key={option.id}><div className="ab-option-head"><span>OPTION {option.id}</span><small>{option.register}</small></div><div className={`vidiq-score ${value.vidiqScores?.[option.id] !== undefined ? "ready" : "pending"}`}><b>{value.vidiqScores?.[option.id] ?? "—"}</b><span>{value.vidiqScores?.[option.id] !== undefined ? "/100 · vidIQ" : (lang === "fr" ? "score vidIQ en attente" : "vidIQ score pending")}</span></div><h3>{option.title}</h3><p>{option.description}</p><div className="copy-row"><button onClick={() => copy(option.title)}>⧉ {lang === "fr" ? "Titre" : "Title"}</button><button onClick={() => copy(option.description)}>⧉ Description</button></div><div className="concept-list"><strong>{lang === "fr" ? "3 concepts de miniature" : "3 thumbnail concepts"}</strong>{option.concepts.map((concept, index) => { const editing = promptEditor?.optionId === option.id && promptEditor.index === index; return <div className={`concept-row ${value.selected[option.id] === index ? "selected" : ""}`} key={`${option.id}-${index}`}>
        <button className="concept-select" onClick={() => { update({ selected: { ...value.selected, [option.id]: index }, thumbnailsGenerated: false }); setImages({}); }}><span>{value.selected[option.id] === index ? "✓" : index + 1}</span><div><b>{concept.name}</b><small>{concept.prompt}</small></div></button>
        <button className="concept-edit" aria-label={lang === "fr" ? `Modifier le prompt du concept « ${concept.name} »` : `Edit the prompt of concept “${concept.name}”`} aria-expanded={editing} onClick={() => setPromptEditor(editing ? null : { optionId: option.id, index, draft: concept.prompt, direction: "" })}>✎</button>
        {editing && promptEditor && <div className="prompt-editor">
          <label><span>{lang === "fr" ? "Prompt d’image (en anglais)" : "Image prompt (English)"}</span><textarea rows={5} maxLength={4000} value={promptEditor.draft} onChange={event => setPromptEditor({ ...promptEditor, draft: event.target.value })} /></label>
          <label><span>{lang === "fr" ? "Orientation pour l’IA (facultatif)" : "Direction for AI (optional)"}</span><input maxLength={1500} value={promptEditor.direction} onChange={event => setPromptEditor({ ...promptEditor, direction: event.target.value })} placeholder={lang === "fr" ? "Ex. fond plus sombre, gros plan sur le téléphone, ambiance studio…" : "E.g. darker background, close-up on the phone, studio mood…"} /></label>
          <div className="prompt-editor-actions">
            <button onClick={() => setPromptEditor(null)}>{lang === "fr" ? "Annuler" : "Cancel"}</button>
            <button onClick={() => regeneratePrompt(option)} disabled={promptLoading}>✦ {promptLoading ? (lang === "fr" ? "Régénération…" : "Regenerating…") : (lang === "fr" ? "Régénérer avec l’IA" : "Regenerate with AI")}</button>
            <button className="primary" onClick={savePrompt} disabled={promptLoading || !promptEditor.draft.trim()}>{lang === "fr" ? "Enregistrer" : "Save"}</button>
          </div>
        </div>}
      </div>; })}</div></article>)}</div>
      <div className="vidiq-truth-note">◆ {value.vidiqStatus === "error" ? (lang === "fr" ? "vidIQ n’a renvoyé aucun score. Aucun remplacement n’est affiché." : "vidIQ returned no score. No replacement is displayed.") : (lang === "fr" ? "Les valeurs vidIQ sont affichées telles quelles, sans estimation locale." : "vidIQ values are shown exactly as returned, with no local estimate.")}</div>
      <div className={`english-winner ${bestScoredOption ? "ready" : "pending"}`}><div className="english-winner-head"><div><span>EN</span><div><strong>{lang === "fr" ? "Meilleur packaging en anglais" : "Top-scoring packaging in English"}</strong><small>{bestScoredOption ? `OPTION ${bestScoredOption.id} · ${value.vidiqScores?.[bestScoredOption.id]}/100 vidIQ` : (lang === "fr" ? "Disponible après la synchronisation vidIQ" : "Available after vidIQ synchronization")}</small></div></div>{bestScoredOption && <button onClick={() => copy(`${bestScoredOption.englishTitle ?? bestScoredOption.title}\n\n${bestScoredOption.englishDescription ?? bestScoredOption.description}`)}>⧉ {lang === "fr" ? "Copier l’ensemble" : "Copy all"}</button>}</div>{bestScoredOption ? <div className="english-winner-copy"><article><small>ENGLISH TITLE</small><h3>{bestScoredOption.englishTitle ?? bestScoredOption.title}</h3><button onClick={() => copy(bestScoredOption.englishTitle ?? bestScoredOption.title)}>⧉</button></article><article><small>ENGLISH DESCRIPTION</small><p>{bestScoredOption.englishDescription ?? bestScoredOption.description}</p><button onClick={() => copy(bestScoredOption.englishDescription ?? bestScoredOption.description)}>⧉</button></article></div> : <p>{lang === "fr" ? "Cliquez sur « Synchroniser les scores vidIQ » : la traduction anglaise de l’option gagnante apparaîtra ici." : "Click “Sync vidIQ scores” to display the English version of the winning option here."}</p>}</div>
      {(referenceThumbnails.length > 0 || profile.thumbnailSystemPrompt) && <div className="visual-dna-active">◆ {lang === "fr" ? "ADN visuel actif" : "Visual DNA active"} · {referenceThumbnails.length} {lang === "fr" ? "référence(s)" : "reference(s)"} · {profile.thumbnailSystemPrompt ? (lang === "fr" ? "prompt système appliqué" : "system prompt applied") : (lang === "fr" ? "prompt système à générer" : "system prompt pending")}</div>}
      <button className="primary thumbnail-cta" onClick={() => generateThumbnails(pack.options)} disabled={loading !== null}>✦ {loading === "images" ? (lang === "fr" ? "OpenAI génère 3 images…" : "OpenAI is generating 3 images…") : (lang === "fr" ? "Générer les 3 vraies miniatures" : "Generate 3 real thumbnails")}</button>
      {!integrations.openai.configured && <button className="inline-config" onClick={openAiSettings}>{lang === "fr" ? "Ajouter la clé OpenAI" : "Add OpenAI key"} →</button>}
    </section>
    {value.thumbnailsGenerated && Object.keys(images).length === 3 && <section className="express-section generated-thumbnails"><div className="express-section-title"><span>02</span><div><h2>{lang === "fr" ? "Miniatures générées par OpenAI" : "OpenAI-generated thumbnails"}</h2><p>{lang === "fr" ? "Téléchargez chaque PNG recadré automatiquement en 1280 × 720." : "Download each PNG automatically cropped to 1280 × 720."}</p></div></div><div className="thumbnail-grid">{pack.options.map(option => <figure key={option.id} className="thumbnail-preview real-thumbnail"><img src={images[option.id]} alt={`${lang === "fr" ? "Miniature" : "Thumbnail"} ${option.id}: ${option.title}`} /><button className="thumbnail-zoom" aria-label={lang === "fr" ? `Agrandir la miniature ${option.id}` : `Enlarge thumbnail ${option.id}`} onClick={() => setPreview({ id: option.id, src: images[option.id], title: option.overlay, caption: option.concepts[value.selected[option.id] ?? 0].name })} /><figcaption><strong>{option.overlay}</strong><span>{option.concepts[value.selected[option.id] ?? 0].name}</span></figcaption><button className="thumbnail-download" onClick={() => downloadThumbnail(images[option.id], option.id)}>↓ PNG · 1280 × 720</button></figure>)}</div></section>}
    <section className="express-section"><div className="express-section-title"><span>{value.thumbnailsGenerated ? "03" : "02"}</span><div><h2>{lang === "fr" ? "Description, tags & commentaire épinglé" : "Description, tags & pinned comment"}</h2><p>{lang === "fr" ? "Générés par le modèle sélectionné et prêts à copier." : "Generated by the selected model and ready to copy."}</p></div></div><div className="delivery-grid"><div className="delivery-card"><div><strong>{lang === "fr" ? "DESCRIPTION AMÉLIORÉE" : "IMPROVED DESCRIPTION"}</strong><button onClick={() => copy(pack.improvedDescription)}>⧉ {lang === "fr" ? "Copier" : "Copy"}</button></div><pre>{pack.improvedDescription}</pre></div><div className="delivery-card tags-card"><div><strong>TAGS</strong><button onClick={() => copy(pack.tags.join(", "))}>⧉ {lang === "fr" ? "Copier tout" : "Copy all"}</button></div><div>{pack.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div></div><div className="pinned-comment-card"><div><span>📌</span><div><strong>{lang === "fr" ? "COMMENTAIRE À ÉPINGLER" : "PINNED COMMENT"}</strong><small>{lang === "fr" ? "Une relance naturelle pour engager la discussion sous la vidéo." : "A natural prompt to start a conversation below the video."}</small></div><button onClick={() => copy(pack.pinnedComment ?? "")} disabled={!pack.pinnedComment}>⧉ {lang === "fr" ? "Copier" : "Copy"}</button></div><p>{pack.pinnedComment ?? (lang === "fr" ? "Régénérez le packaging pour créer le commentaire épinglé." : "Regenerate the packaging to create the pinned comment.")}</p></div></section>
    {value.inputType === "script" && <section className="express-section"><div className="express-section-title"><span>{value.thumbnailsGenerated ? "04" : "03"}</span><div><h2>{lang === "fr" ? "5 quiz à trois choix" : "5 three-choice quizzes"}</h2><p>{lang === "fr" ? "Chaque question propose exactement trois réponses ; la bonne est appuyée par le script." : "Each question has exactly three answers; the correct one is supported by the script."}</p></div></div><div className="quiz-list">{pack.quiz.map((item, index) => { const choices = quizChoices(item, lang); const correctOption = item.correctOption ?? 0; return <article key={`${index}-${item.question}`}><span>{index + 1}</span><div><strong>{item.question}</strong><ol>{choices.map((choice, choiceIndex) => <li className={choiceIndex === correctOption ? "correct" : ""} key={`${choiceIndex}-${choice}`}><b>{String.fromCharCode(65 + choiceIndex)}</b><span>{choice}</span>{choiceIndex === correctOption && <em>✓ {lang === "fr" ? "Bonne réponse" : "Correct"}</em>}</li>)}</ol></div><button onClick={() => copy(quizClipboard(item, lang))} aria-label={lang === "fr" ? "Copier le quiz" : "Copy quiz"}>⧉</button></article>; })}</div></section>}
    {preview && <div className="lightbox-backdrop" role="dialog" aria-modal="true" aria-label={lang === "fr" ? `Miniature ${preview.id} en grand format` : `Thumbnail ${preview.id} enlarged`}>
      <button className="lightbox-scrim" aria-label={lang === "fr" ? "Fermer l’aperçu" : "Close preview"} onClick={() => setPreview(null)} />
      <figure className="lightbox">
        <img src={preview.src} alt={`${lang === "fr" ? "Miniature" : "Thumbnail"} ${preview.id}: ${preview.title}`} />
        <figcaption><strong>OPTION {preview.id} · {preview.title}</strong><span>{preview.caption} · 1280 × 720</span></figcaption>
        <div className="lightbox-actions">
          <button onClick={() => downloadThumbnail(preview.src, preview.id)}>↓ {lang === "fr" ? "Télécharger le PNG" : "Download PNG"}</button>
          <button onClick={() => setPreview(null)}>{lang === "fr" ? "Fermer" : "Close"}</button>
        </div>
        <button className="lightbox-close" aria-label={lang === "fr" ? "Fermer l’aperçu" : "Close preview"} onClick={() => setPreview(null)}>×</button>
      </figure>
    </div>}
  </div>;
}



function StudioPackaging({ project, profile, updateProject, lang, t, copy, showToast, aiSettings, integrations, referenceThumbnails, presenterKey, openAiSettings, script }: {
  project: Project; profile: Profile; updateProject: (p: Partial<Project>) => void; lang: Lang; t: (typeof labels)[Lang];
  copy: (v: string) => void; showToast: (message: string, kind?: AlertKind) => void; aiSettings: AiSettings; integrations: Integrations;
  referenceThumbnails: ReferenceThumbnail[]; presenterKey: string; openAiSettings: () => void; script: string;
}) {
  const a = project.packageAnswers;
  const setAnswer = (key: keyof typeof a, value: string) => updateProject({ packageAnswers: { ...a, [key]: value } });
  const prefilled = useRef(false);
  // Prefill once, in a single updateProject: two chained setAnswer calls would share the
  // same stale closure and the second would overwrite the first. Never touches a filled field.
  useEffect(() => {
    if (prefilled.current) return;
    prefilled.current = true;
    const patch: Partial<typeof a> = {};
    if (!a.links.trim()) { const links = [profile.contacts, profile.offer].filter(Boolean).join("\n"); if (links) patch.links = links; }
    if (!a.timecodes.trim()) { const timecodes = estimatedTimecodes(project, profile); if (timecodes) patch.timecodes = timecodes; }
    if (Object.keys(patch).length) updateProject({ packageAnswers: { ...a, ...patch } });
  }, [a, project, profile, updateProject]);
  const complete = Boolean(a.timecodes.trim() && a.links.trim());
  // The script is rebuilt from the project on every render, so it is never stored twice.
  const packagingValue: ExpressState = { ...expressDefault, ...(project.packaging ?? {}), inputType: "script", subject: project.subject, source: script };
  const setPackagingValue = (next: ExpressState) => updateProject({ packaging: { ...next, source: "" } });
  return <><StageHead n={7} title={t.steps[6]} desc={lang === "fr" ? "Trois options complètes, générées depuis le script validé et prêtes à tester dans YouTube Studio." : "Three complete options, generated from the approved script and ready to test in YouTube Studio."} />
    {!complete
      ? <><div className="stop-banner"><span>Ⅱ</span><div><strong>{lang === "fr" ? "2 vérifications obligatoires" : "2 required checks"}</strong><p>{lang === "fr" ? "Pré-rempli depuis votre profil et votre script — vérifiez avant de valider. Aucun tarif ni lien ne sera inventé." : "Pre-filled from your profile and your script — check before approving. No price or link will be invented."}</p></div></div>
        <div className="question-grid">
          <Question n="1" label={lang === "fr" ? "Timecodes réels" : "Real timecodes"} help={lang === "fr" ? "Estimés depuis le script — remplacez-les par les timecodes réels après montage, sinon les chapitres YouTube pointeront au mauvais endroit" : "Estimated from the script — replace them with the real timecodes after editing, otherwise the YouTube chapters will point to the wrong place"} value={a.timecodes} set={v => setAnswer("timecodes", v)} placeholder="00:00 Intro · 01:15 …" />
          <Question n="2" label={lang === "fr" ? "Liens et tarifs confirmés" : "Confirmed links and prices"} help={lang === "fr" ? "Repris de votre Profil de chaîne" : "Taken from your Channel profile"} value={a.links} set={v => setAnswer("links", v)} placeholder={lang === "fr" ? "Collez uniquement les informations confirmées" : "Paste confirmed information only"} />
          <Question n="3" label={lang === "fr" ? "Concept visuel retenu" : "Chosen visual concept"} optional={lang === "fr" ? "optionnel" : "optional"} help={lang === "fr" ? "Laissez vide pour choisir parmi les concepts proposés par l’IA" : "Leave empty to choose from the concepts proposed by AI"} value={a.visual} set={v => setAnswer("visual", v)} placeholder={lang === "fr" ? "Ex. visage surpris à gauche, téléphone à droite" : "E.g. surprised face left, phone right"} />
        </div></>
      : <><div className="ab-note">ⓘ {lang === "fr" ? "YouTube ne teste qu’une variable à la fois : titres OU miniatures." : "YouTube tests one variable at a time: titles OR thumbnails."}</div>
        <ExpressPackagingAI value={packagingValue} setValue={setPackagingValue} profile={profile} lang={lang} copy={copy} showToast={showToast} aiSettings={aiSettings} integrations={integrations} referenceThumbnails={referenceThumbnails} presenterKey={presenterKey} openAiSettings={openAiSettings} projectRef={{ projectId: project.id, projectTitle: project.title }} autoStart={complete} embedded />
        <div className="publish-section"><h3>{lang === "fr" ? "Checklist de publication" : "Publishing checklist"}</h3>{["Titre", "Description & liens", "Miniature à 120 px", "Chapitres", "Sous-titres", "Commentaire épinglé", "Test A/B", "CTR à 24–48 h"].map(x => <label key={x}><input type="checkbox" />{x}</label>)}</div></>}
  </>;
}
function Question({ n, label, value, set, placeholder, help, optional }: { n: string; label: string; value: string; set: (v: string) => void; placeholder: string; help?: string; optional?: string }) { return <label className="question"><span>{n}</span><div className="question-label"><strong>{label}{optional && <i>{optional}</i>}</strong>{help && <small>{help}</small>}</div><textarea value={value} onChange={e => set(e.target.value)} placeholder={placeholder} rows={3} /></label>; }

function Projects({ projects, activeId, lang, t, open, create }: { projects: Project[]; activeId: string; lang: Lang; t: (typeof labels)[Lang]; open: (id: string) => void; create: () => void }) { return <div className="page-view"><div className="page-title"><div><span className="eyebrow">{t.overview}</span><h1>{t.projects}</h1><p>{lang === "fr" ? "Toutes vos vidéos, de l’idée à la publication." : "All your videos, from idea to publication."}</p></div><button className="primary" onClick={create}>＋ {t.newVideo}</button></div><div className="stats"><div><strong>{projects.length}</strong><span>{lang === "fr" ? "projets actifs" : "active projects"}</span></div><div><strong>{projects.filter(p => p.completed.includes(7)).length}</strong><span>{lang === "fr" ? "prêts à publier" : "ready to publish"}</span></div><div><strong>{projects.filter(p => p.status.includes("cours") || p.status.includes("progress")).length}</strong><span>{lang === "fr" ? "scripts en cours" : "scripts in progress"}</span></div></div><div className="project-table"><div className="table-head"><span>{t.project}</span><span>{t.status}</span><span>{t.updated}</span><span /></div>{projects.map(p => <button key={p.id} onClick={() => open(p.id)} className={p.id === activeId ? "current" : ""}><span className="project-name"><i>{p.title.charAt(0)}</i><span><strong>{p.title}</strong><small>{p.subject}</small></span></span><span><b className="status-pill">{p.status}</b></span><span>{p.updated}</span><span>→</span></button>)}</div></div>; }

function formatTokenPrice(perToken: number) {
  const perMillion = perToken * 1_000_000;
  if (perMillion === 0) return "$0";
  return `$${perMillion < 0.01 ? perMillion.toFixed(4) : perMillion < 1 ? perMillion.toFixed(2) : perMillion.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/**
 * Re-encodes an image in the browser before upload: a phone photo is routinely 5-10 MB
 * and often in a format the server refuses, while the model only ever needs a modest
 * JPEG. Returns the original file when the browser cannot decode it, so the server
 * still gets to produce a precise error rather than a silent failure.
 */
async function optimizeImage(file: File, maxWidth: number, maxHeight: number) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .84));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}

function ProfilePageAI({ profile, setProfile, lang, t, aiSettings, setAiSettings, integrations, youtube, refreshIntegrations, legacyKeysFound, clearLegacyKeys, openRouterModels, referenceThumbnails, reloadReferences, presenterPhoto, reloadPresenter, brandLogo, reloadLogo, showToast, done }: {
  profile: Profile; setProfile: (p: Profile) => void; lang: Lang; t: (typeof labels)[Lang];
  aiSettings: AiSettings; setAiSettings: (settings: AiSettings) => void; integrations: Integrations; youtube: YoutubeState; refreshIntegrations: () => void; legacyKeysFound: boolean; clearLegacyKeys: () => void; openRouterModels: OpenRouterModel[];
  referenceThumbnails: ReferenceThumbnail[]; reloadReferences: () => void; presenterPhoto: { key: string; url: string } | null; reloadPresenter: () => void;
  brandLogo: { key: string; url: string } | null; reloadLogo: () => void; showToast: (message: string, kind?: AlertKind) => void; done: () => void;
}) {
  const field = (key: keyof Profile, value: string | boolean) => setProfile({ ...profile, [key]: value });
  // Shown live: how much of YouTube's 500-character budget the defaults already spend,
  // so it is obvious before export how much is left for a video's own tags.
  const defaultTagList = parseTagList(profile.defaultTags ?? "");
  const defaultTagBudget = { count: defaultTagList.length, characters: joinTags(defaultTagList).length };
  const selectedModel = openRouterModels.find(model => model.id === aiSettings.openrouterModel);
  const writerModels = openRouterModels.filter(supportsHighReasoning);
  const selectedWriterModel = writerModels.find(model => model.id === aiSettings.writerModel);
  const visionModels = openRouterModels.filter(model => model.supportsImages);
  const selectedVisionModel = visionModels.find(model => model.id === aiSettings.visionModel);
  const [styleLoading, setStyleLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [iteration, setIteration] = useState("");
  const [presenterUploading, setPresenterUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const uploadLogo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const form = new FormData();
      // Not re-encoded in the browser: a logo's transparency is the point, and the
      // JPEG conversion the presenter photo goes through would flatten it onto black.
      form.append("file", file);
      const response = await fetch("/api/brand-logo", { method: "POST", body: form });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || `http_${response.status}`);
      reloadLogo();
      showToast(lang === "fr" ? "Logo enregistré" : "Logo saved");
    } catch (error) {
      const code = error instanceof TypeError ? "network" : error instanceof Error ? error.message : "unknown";
      showToast(code === "invalid_logo_file"
        ? (lang === "fr" ? "Format refusé. Word n’intègre que le PNG et le JPEG — un SVG doit être exporté en PNG d’abord. Taille maximale 4 Mo."
          : "Format refused. Word only embeds PNG and JPEG — export an SVG to PNG first. Maximum size 4 MB.")
        : serverErrorMessage(error, lang), "error");
    } finally { setLogoUploading(false); }
  };
  const removeLogo = async () => {
    setLogoUploading(true);
    try {
      const response = await fetch("/api/brand-logo", { method: "DELETE" });
      if (!response.ok) throw new Error("logo_delete_failed");
      reloadLogo();
      showToast(lang === "fr" ? "Logo retiré" : "Logo removed");
    } catch (error) { showToast(serverErrorMessage(error, lang), "error"); }
    finally { setLogoUploading(false); }
  };
  const uploadPresenter = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setPresenterUploading(true);
    try {
      // Shrink and re-encode first: phone photos are large and often HEIC, and the
      // model only needs a portrait a fraction of that size.
      const prepared = await optimizeImage(file, 1400, 1400);
      const form = new FormData();
      form.append("file", prepared);
      const response = await fetch("/api/presenter-photo", { method: "POST", body: form });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || `http_${response.status}`);
      reloadPresenter();
      showToast(lang === "fr" ? "Photo enregistrée" : "Photo saved");
    } catch (error) {
      const code = error instanceof TypeError ? "network" : error instanceof Error ? error.message : "unknown";
      // Say what actually failed: a generic message left no way to act.
      const messages: Record<string, string> = {
        network: connectionLostMessage(lang),
        invalid_presenter_file: lang === "fr"
          ? `Votre navigateur n’a pas pu convertir ce fichier (${file.type || "format inconnu"}). Les photos iPhone en HEIC sont souvent en cause : exportez-la en JPEG, ou faites une capture d’écran de la photo.`
          : `Your browser could not convert this file (${file.type || "unknown format"}). iPhone HEIC photos are a common cause: export it as JPEG, or take a screenshot of it.`,
        presenter_file_required: lang === "fr" ? "Aucun fichier reçu. Réessayez." : "No file received. Try again.",
        presenter_storage_unavailable: lang === "fr" ? "Le stockage des images est indisponible sur ce déploiement." : "Image storage is unavailable on this deployment.",
        presenter_upload_failed: lang === "fr" ? "Le stockage a refusé l’image. Réessayez dans un instant." : "Storage refused the image. Try again shortly.",
        authentication_required: lang === "fr" ? "Session non authentifiée. Rechargez la page." : "Unauthenticated session. Reload the page.",
      };
      showToast(messages[code] ?? (lang === "fr" ? `Envoi impossible (${code}).` : `Upload failed (${code}).`), "error");
    } finally { setPresenterUploading(false); }
  };
  const removePresenter = async () => {
    setPresenterUploading(true);
    try {
      const response = await fetch("/api/presenter-photo", { method: "DELETE" });
      if (!response.ok) throw new Error("delete_failed");
      reloadPresenter();
      showToast(lang === "fr" ? "Photo retirée" : "Photo removed");
    } catch {
      showToast(lang === "fr" ? "Suppression impossible." : "Could not remove the photo.", "error");
    } finally { setPresenterUploading(false); }
  };
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});
  const [secretBusy, setSecretBusy] = useState<IntegrationService | null>(null);
  const serviceLabels: Record<IntegrationService, { name: string; use: string }> = {
    openrouter: { name: "OpenRouter", use: lang === "fr" ? "Scripts longs, titres, descriptions, tags, prompts et quiz" : "Long scripts, titles, descriptions, tags, prompts, and quizzes" },
    openai: { name: "OpenAI Images", use: lang === "fr" ? "Génération réelle des miniatures" : "Real thumbnail generation" },
    descript: { name: "Descript", use: lang === "fr" ? "Projets, transcriptions et compositions vidéo" : "Projects, transcripts, and video compositions" },
  };
  // The key is validated upstream before it is stored, so a typo never reaches a paid pipeline.
  const saveSecret = async (service: IntegrationService) => {
    const value = (secretDrafts[service] ?? "").trim();
    if (!value) return showToast(lang === "fr" ? "Saisissez d’abord une clé." : "Enter a key first.", "warning");
    setSecretBusy(service);
    try {
      const response = await postJsonWithRetry("/api/integrations", { service, value });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "secret_rejected");
      setSecretDrafts(current => ({ ...current, [service]: "" }));
      refreshIntegrations();
      clearLegacyKeys();
      showToast(lang === "fr" ? `Clé ${serviceLabels[service].name} testée et enregistrée` : `${serviceLabels[service].name} key tested and saved`);
    } catch (error) {
      const reason = error instanceof TypeError ? connectionLostMessage(lang) : error instanceof Error && error.message === "secret_rejected"
        ? (lang === "fr" ? "Le fournisseur a refusé cette clé." : "The provider rejected this key.")
        : (lang === "fr" ? "Enregistrement impossible." : "Could not save the key.");
      showToast(reason, "error");
    } finally { setSecretBusy(null); }
  };
  const removeSecret = async (service: IntegrationService | "youtube") => {
    setSecretBusy(service === "youtube" ? null : service);
    try {
      const response = await fetch(`/api/integrations?service=${service}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete_failed");
      refreshIntegrations();
      showToast(service === "youtube"
        ? (lang === "fr" ? "Chaîne YouTube déconnectée" : "YouTube channel disconnected")
        : (lang === "fr" ? `Clé ${serviceLabels[service].name} supprimée` : `${serviceLabels[service].name} key removed`));
    } catch {
      showToast(lang === "fr" ? "Suppression impossible." : "Could not remove the connection.", "error");
    } finally { setSecretBusy(null); }
  };
  const uploadReferences = async (files: FileList | null) => {
    if (!files?.length) return;
    const available = 4 - referenceThumbnails.length;
    if (available <= 0) return showToast(lang === "fr" ? "Maximum 4 miniatures de référence." : "Maximum 4 reference thumbnails.", "warning");
    setUploading(true);
    try {
      const form = new FormData();
      for (const file of Array.from(files).slice(0, available)) form.append("files", await optimizeImage(file, 1600, 900));
      const response = await fetch("/api/reference-thumbnails", { method: "POST", body: form });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "upload_failed");
      reloadReferences();
      showToast(lang === "fr" ? "Miniatures de référence ajoutées" : "Reference thumbnails added");
    } catch (error) { showToast(serverErrorMessage(error, lang), "error"); }
    finally { setUploading(false); }
  };
  const deleteReference = async (reference: ReferenceThumbnail) => {
    const response = await fetch(`/api/reference-thumbnails?key=${encodeURIComponent(reference.key)}`, { method: "DELETE" });
    if (response.ok) { reloadReferences(); showToast(lang === "fr" ? "Référence supprimée" : "Reference removed"); }
  };
  const generateEditorialPrompt = async (iterate = false) => {
    if (!integrations.openrouter.configured || !aiSettings.visionModel) return showToast(lang === "fr" ? "Ajoutez la clé OpenRouter et choisissez un modèle vision." : "Add an OpenRouter key and choose a vision model.", "warning");
    if (!referenceThumbnails.length) return showToast(lang === "fr" ? "Ajoutez d’abord une miniature de référence." : "Add a reference thumbnail first.", "warning");
    setStyleLoading(true);
    try {
      const response = await fetch("/api/reference-style", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: aiSettings.visionModel, referenceKeys: referenceThumbnails.map(reference => reference.key), currentPrompt: iterate ? profile.thumbnailSystemPrompt : "", instruction: iterate ? iteration : "", language: lang, profile: { channel: profile.channel, theme: profile.theme, audience: profile.audience, tone: profile.tone } }) });
      const data = await response.json() as { prompt?: string; error?: string; detail?: string };
      if (!response.ok || !data.prompt) throw new Error(data.detail || data.error || "analysis_failed");
      field("thumbnailSystemPrompt", data.prompt);
      setIteration("");
      showToast(iterate ? (lang === "fr" ? "Prompt système amélioré" : "System prompt improved") : (lang === "fr" ? "ADN visuel généré" : "Visual DNA generated"));
    } catch (error) { showToast(serverErrorMessage(error, lang, "openrouter"), "error"); }
    finally { setStyleLoading(false); }
  };
  return <div className="page-view profile-page"><div className="page-title"><div><span className="eyebrow">{lang === "fr" ? "PERSONNALISATION & IA" : "PERSONALIZATION & AI"}</span><h1>{t.channelProfile}</h1><p>{lang === "fr" ? "Configurez les modèles utilisés pour les scripts longs, le packaging et les miniatures." : "Configure the models used for long-form scripts, packaging, and thumbnails."}</p></div><button className="primary" onClick={done}>{t.saveProfile}</button></div>
    <section className="form-section ai-settings-section"><div className="section-heading"><div><h2>{lang === "fr" ? "Clés & connexions" : "Keys & connections"}</h2><p>{lang === "fr" ? "Chaque clé est testée auprès du fournisseur avant d’être enregistrée, puis chiffrée côté serveur." : "Every key is tested against the provider before being stored, then encrypted server-side."}</p></div><span className="session-badge remembered">⌕ {lang === "fr" ? "CHIFFRÉ · LIÉ À VOTRE COMPTE" : "ENCRYPTED · TIED TO YOUR ACCOUNT"}</span></div>
      {legacyKeysFound && <div className="legacy-keys-banner"><span>!</span><div><strong>{lang === "fr" ? "Vos clés étaient enregistrées dans ce navigateur" : "Your keys were stored in this browser"}</strong><p>{lang === "fr" ? "Elles sont désormais chiffrées côté serveur et liées à votre compte. Ressaisissez-les une fois ci-dessous — nous ne les téléversons jamais à votre place." : "They are now encrypted server-side and tied to your account. Enter them once below — we never upload them on your behalf."}</p></div><button type="button" onClick={clearLegacyKeys}>{lang === "fr" ? "Effacer de ce navigateur" : "Clear from this browser"}</button></div>}
      <div className="credential-grid">
        {(["openrouter", "openai", "descript"] as IntegrationService[]).map(service => {
          const state = integrations[service];
          const busy = secretBusy === service;
          return <div className="credential-card" key={service}>
            <span className={`provider-mark ${service}-mark`}>{service === "openrouter" ? "OR" : service === "openai" ? "AI" : "DS"}</span>
            <strong>{serviceLabels[service].name}</strong><small>{serviceLabels[service].use}</small>
            <label className="field-label" htmlFor={`secret-${service}`}>API KEY</label>
            <input id={`secret-${service}`} type="password" autoComplete="off" spellCheck={false} value={secretDrafts[service] ?? ""} onChange={event => setSecretDrafts(current => ({ ...current, [service]: event.target.value }))} placeholder={state.configured ? `•••• ${state.last4}` : service === "openrouter" ? "sk-or-v1-••••••••" : "sk-••••••••"} />
            <div className="credential-status-row">
              <em className={state.configured ? "present" : ""}>● {state.configured
                ? `${lang === "fr" ? "Configurée" : "Configured"}${state.last4 ? ` · ••••${state.last4}` : ""}${state.source === "environment" ? (lang === "fr" ? " · serveur" : " · server") : ""}`
                : (lang === "fr" ? "Clé requise" : "Key required")}</em>
              <button type="button" onClick={() => saveSecret(service)} disabled={busy || !(secretDrafts[service] ?? "").trim()}>{busy ? (lang === "fr" ? "Test…" : "Testing…") : (lang === "fr" ? "Tester et enregistrer" : "Test and save")}</button>
              {state.configured && state.source === "user" && <button type="button" className="danger" onClick={() => removeSecret(service)} disabled={busy}>{lang === "fr" ? "Supprimer" : "Remove"}</button>}
            </div>
          </div>;
        })}
        <div className="credential-card youtube-card">
          <span className="provider-mark youtube-mark">YT</span>
          <strong>YouTube</strong><small>{lang === "fr" ? "Envoi des vidéos vers votre chaîne, en privé" : "Uploads videos to your channel, privately"}</small>
          <div className="credential-status-row">
            <em className={youtube.connected ? "present" : ""}>● {youtube.connected
              ? `${lang === "fr" ? "Chaîne connectée" : "Channel connected"}${youtube.channelName ? ` · ${youtube.channelName}` : ""}`
              : (lang === "fr" ? "Non connectée" : "Not connected")}</em>
            {youtube.connected
              ? <button type="button" className="danger" onClick={() => removeSecret("youtube")}>{lang === "fr" ? "Déconnecter" : "Disconnect"}</button>
              : <a className="connect-link" href="/api/youtube/auth">{lang === "fr" ? "Connecter YouTube" : "Connect YouTube"} →</a>}
          </div>
          <p className="credential-note">{lang === "fr" ? "L’autorisation passe par la page sécurisée de Google. YoutubeMate ne reçoit jamais votre mot de passe, et demande uniquement le droit d’envoyer des vidéos." : "Authorisation happens on Google’s own page. YoutubeMate never sees your password, and only requests the right to upload videos."}</p>
        </div>
      </div>
      <div className="model-grid">
        <label className="writer-model-field"><span>{lang === "fr" ? "Scénarisation longue — modèle thinking" : "Long-form writing — thinking model"}</span><select value={aiSettings.writerModel} onChange={event => setAiSettings({ ...aiSettings, writerModel: event.target.value })}><option value="">{writerModels.length ? (lang === "fr" ? "Choisir un modèle puissant" : "Choose a powerful model") : (lang === "fr" ? "Aucun modèle thinking compatible" : "No compatible thinking model")}</option>{writerModels.map(model => <option key={model.id} value={model.id}>{model.id === "openai/gpt-5.6-sol" ? "★ " : ""}{model.name} · in {formatTokenPrice(model.inputPerToken)}/M · out {formatTokenPrice(model.outputPerToken)}/M</option>)}</select>{selectedWriterModel && <small><strong>{selectedWriterModel.id === "openai/gpt-5.6-sol" ? (lang === "fr" ? "Recommandé pour les scripts longs" : "Recommended for long-form scripts") : (lang === "fr" ? "Compatible scripts longs" : "Long-form compatible")}</strong> · {selectedWriterModel.contextLength ? `${Math.round(selectedWriterModel.contextLength / 1000)}k context` : "context n/a"} · {lang === "fr" ? "réflexion élevée activée automatiquement" : "high reasoning enabled automatically"}</small>}<em>{lang === "fr" ? "La réflexion consomme des jetons de sortie : le coût final dépend du raisonnement et de la longueur du script." : "Reasoning uses output tokens: final cost depends on thinking and script length."}</em></label>
        <label><span>{lang === "fr" ? "Modèle OpenRouter — packaging et hook" : "OpenRouter model — packaging and hook"}</span><select value={aiSettings.openrouterModel} onChange={event => setAiSettings({ ...aiSettings, openrouterModel: event.target.value })}><option value="">{openRouterModels.length ? (lang === "fr" ? "Choisir un modèle" : "Choose a model") : (lang === "fr" ? "Chargement du catalogue…" : "Loading catalog…")}</option>{openRouterModels.map(model => <option key={model.id} value={model.id}>{model.name} · in {formatTokenPrice(model.inputPerToken)}/M · out {formatTokenPrice(model.outputPerToken)}/M</option>)}</select>{selectedModel && <small>{selectedModel.id} · {selectedModel.contextLength ? `${Math.round(selectedModel.contextLength / 1000)}k context` : "context n/a"} · {lang === "fr" ? "tarifs OpenRouter en direct" : "live OpenRouter pricing"}</small>}</label>
        <label><span>{lang === "fr" ? "Modèle d’image OpenAI" : "OpenAI image model"}</span><select value={aiSettings.imageModel} onChange={event => setAiSettings({ ...aiSettings, imageModel: event.target.value as AiSettings["imageModel"] })}><option value="gpt-image-2">GPT Image 2 · texte in $5/M · image in $8/M · out $30/M</option><option value="gpt-image-1.5">GPT Image 1.5 (ancien) · texte in $5/M · image in $8/M · out $32/M</option></select><small>{lang === "fr" ? "GPT Image 2 est recommandé pour les nouvelles miniatures." : "GPT Image 2 is recommended for new thumbnails."}</small></label>
        <label><span>{lang === "fr" ? "Qualité de génération" : "Generation quality"}</span><select value={aiSettings.imageQuality} onChange={event => setAiSettings({ ...aiSettings, imageQuality: event.target.value as AiSettings["imageQuality"] })}><option value="low">Low · {lang === "fr" ? "économique" : "economy"}</option><option value="medium">Medium · {lang === "fr" ? "recommandé" : "recommended"}</option><option value="high">High · {lang === "fr" ? "qualité maximale" : "maximum quality"}</option></select><small>{lang === "fr" ? "Le coût réel dépend aussi de la résolution et du nombre de jetons image." : "Actual cost also depends on resolution and image-token usage."}</small></label>
      </div>
      <p className="privacy-note strong-privacy">⌕ {lang === "fr" ? "Vos clés sont chiffrées (AES-GCM) côté serveur et liées à votre compte. Elles ne sont jamais renvoyées au navigateur ni ajoutées aux projets : seuls les quatre derniers caractères sont affichés. Supprimez-les à tout moment depuis cet écran." : "Your keys are encrypted (AES-GCM) server-side and tied to your account. They are never returned to the browser or added to projects: only the last four characters are shown. Remove them at any time from this screen."}</p>
    </section>
    <section className="form-section presenter-section"><div className="section-heading"><div><h2>{lang === "fr" ? "Logo de l’entreprise" : "Company logo"}</h2><p>{lang === "fr" ? "Placé en tête des documents Word exportés, à côté du nom de la chaîne. PNG ou JPEG — un PNG à fond transparent donne le meilleur rendu dans Word." : "Placed at the top of exported Word documents, next to the channel name. PNG or JPEG — a transparent PNG renders best in Word."}</p></div><span className="reference-count">{brandLogo ? (lang === "fr" ? "LOGO ACTIF" : "LOGO ACTIVE") : (lang === "fr" ? "AUCUN LOGO" : "NO LOGO")}</span></div>
      <div className="presenter-row">
        {brandLogo
          ? <img className="presenter-preview brand-logo-preview" src={brandLogo.url} alt={lang === "fr" ? "Logo de l’entreprise" : "Company logo"} />
          : <div className="presenter-empty">{lang === "fr" ? "Aucun logo" : "No logo"}</div>}
        <div className="presenter-actions">
          <label className="presenter-upload">{logoUploading ? (lang === "fr" ? "Envoi…" : "Uploading…") : brandLogo ? (lang === "fr" ? "Remplacer le logo" : "Replace logo") : (lang === "fr" ? "Ajouter le logo" : "Add logo")}
            <input type="file" accept="image/png,image/jpeg" disabled={logoUploading} onChange={event => uploadLogo(event.target.files)} />
          </label>
          {brandLogo && <button type="button" className="danger" onClick={removeLogo} disabled={logoUploading}>{lang === "fr" ? "Retirer" : "Remove"}</button>}
          <p>{lang === "fr" ? "Sans logo, le document porte le nom de la chaîne seul. Le logo n’est jamais envoyé à un modèle d’IA : il ne sert qu’aux exports." : "Without a logo, the document carries the channel name alone. The logo is never sent to an AI model: it is only used for exports."}</p>
        </div>
      </div>
    </section>

    <section className="form-section presenter-section"><div className="section-heading"><div><h2>{lang === "fr" ? "Votre photo dans les miniatures" : "Your photo in thumbnails"}</h2><p>{lang === "fr" ? "Ajoutez une photo de vous nette et bien éclairée. Elle sera intégrée aux miniatures générées, cadrée selon le format : de côté en 16:9, verticalement en 9:16 pour les Shorts." : "Add a sharp, well-lit photo of yourself. It is composed into generated thumbnails, framed for the format: to one side in 16:9, vertically in 9:16 for Shorts."}</p></div><span className="reference-count">{presenterPhoto ? (lang === "fr" ? "PHOTO ACTIVE" : "PHOTO ACTIVE") : (lang === "fr" ? "AUCUNE PHOTO" : "NO PHOTO")}</span></div>
      <div className="presenter-row">
        {presenterPhoto
          ? <img className="presenter-preview" src={presenterPhoto.url} alt={lang === "fr" ? "Photo du présentateur" : "Presenter photo"} />
          : <div className="presenter-empty">{lang === "fr" ? "Aucune photo" : "No photo"}</div>}
        <div className="presenter-actions">
          <label className="presenter-upload">{presenterUploading ? (lang === "fr" ? "Envoi…" : "Uploading…") : presenterPhoto ? (lang === "fr" ? "Remplacer la photo" : "Replace photo") : (lang === "fr" ? "Ajouter ma photo" : "Add my photo")}
            <input type="file" accept="image/*" disabled={presenterUploading} onChange={event => uploadPresenter(event.target.files)} />
          </label>
          {presenterPhoto && <button type="button" className="danger" onClick={removePresenter} disabled={presenterUploading}>{lang === "fr" ? "Retirer" : "Remove"}</button>}
          <p>{lang === "fr" ? "La photo est réduite et convertie automatiquement dans votre navigateur. Un portrait cadré poitrine, sur fond simple, donne les meilleurs résultats. La photo n’est jamais publiée : elle sert uniquement de référence au modèle." : "The photo is resized and converted automatically in your browser. A chest-up portrait on a plain background works best. The photo is never published: it only guides the model."}</p>
        </div>
      </div>
    </section>
    <section className="form-section visual-style-section"><div className="section-heading"><div><h2>{lang === "fr" ? "ADN visuel des miniatures" : "Thumbnail visual DNA"}</h2><p>{lang === "fr" ? "Ajoutez jusqu’à 4 références. L’IA en extrait des règles éditoriales réutilisables sans copier une miniature précise." : "Add up to 4 references. AI extracts reusable editorial rules without copying a specific thumbnail."}</p></div><span className="reference-count">{referenceThumbnails.length}/4 {lang === "fr" ? "RÉFÉRENCES" : "REFERENCES"}</span></div>
      <div className="reference-grid">{referenceThumbnails.map(reference => <figure key={reference.key} className="reference-card"><img src={reference.url} alt={reference.name} /><figcaption title={reference.name}>{reference.name}</figcaption><button onClick={() => deleteReference(reference)} aria-label={`${lang === "fr" ? "Supprimer" : "Remove"} ${reference.name}`}>×</button></figure>)}{referenceThumbnails.length < 4 && <label className="reference-upload"><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={event => { uploadReferences(event.target.files); event.target.value = ""; }} /><span>＋</span><strong>{uploading ? (lang === "fr" ? "Import…" : "Uploading…") : (lang === "fr" ? "Ajouter des références" : "Add references")}</strong><small>PNG, JPG ou WebP · 4 max.</small></label>}</div>
      <div className="vision-controls"><label><span>{lang === "fr" ? "Modèle vision OpenRouter pour l’analyse" : "OpenRouter vision model for analysis"}</span><select value={aiSettings.visionModel} onChange={event => setAiSettings({ ...aiSettings, visionModel: event.target.value })}><option value="">{visionModels.length ? (lang === "fr" ? "Choisir un modèle vision" : "Choose a vision model") : (lang === "fr" ? "Chargement des modèles vision…" : "Loading vision models…")}</option>{visionModels.map(model => <option key={model.id} value={model.id}>{model.name} · in {formatTokenPrice(model.inputPerToken)}/M · out {formatTokenPrice(model.outputPerToken)}/M</option>)}</select>{selectedVisionModel && <small>{selectedVisionModel.id} · {lang === "fr" ? "entrée image compatible" : "image input supported"}</small>}</label><button className="primary" onClick={() => generateEditorialPrompt(false)} disabled={styleLoading || uploading || !referenceThumbnails.length}>{styleLoading ? (lang === "fr" ? "Analyse des références…" : "Analyzing references…") : (profile.thumbnailSystemPrompt ? (lang === "fr" ? "Régénérer depuis les références" : "Regenerate from references") : (lang === "fr" ? "Générer le prompt système" : "Generate system prompt"))}</button></div>
      <label className="system-prompt-editor"><span>{lang === "fr" ? "Prompt système éditorial — modifiable" : "Editorial system prompt — editable"}</span><textarea value={profile.thumbnailSystemPrompt ?? ""} onChange={event => field("thumbnailSystemPrompt", event.target.value)} rows={14} placeholder={lang === "fr" ? "Le prompt généré décrira la composition, la hiérarchie, les couleurs, la typographie, les visages, le contraste et les règles à éviter…" : "The generated prompt will describe composition, hierarchy, colors, typography, faces, contrast, and rules to avoid…"} /><small>{lang === "fr" ? "Vous pouvez tout modifier manuellement. Ce texte sera appliqué aux concepts et à chaque génération OpenAI." : "You can edit everything manually. This text is applied to concepts and every OpenAI generation."}</small></label>
      {profile.thumbnailSystemPrompt && <div className="prompt-iteration"><label><span>{lang === "fr" ? "Demander une amélioration" : "Request an improvement"}</span><input value={iteration} onChange={event => setIteration(event.target.value)} placeholder={lang === "fr" ? "Ex. plus de contraste, moins de texte, visages plus naturels…" : "E.g. more contrast, less text, more natural faces…"} /></label><button onClick={() => generateEditorialPrompt(true)} disabled={styleLoading || !iteration.trim()}>↻ {lang === "fr" ? "Itérer avec l’IA" : "Iterate with AI"}</button></div>}
      <p className="privacy-note">⌕ {lang === "fr" ? "Les références sont stockées dans votre espace privé. Elles servent à l’analyse et sont envoyées à OpenAI comme références lorsque vous générez une miniature." : "References are stored in your private workspace. They are used for analysis and sent to OpenAI as references when generating a thumbnail."}</p>
    </section>
    <section className="form-section protected description-footer-section"><div className="section-heading"><div><h2>{lang === "fr" ? "Tags par défaut de la chaîne" : "Channel default tags"}</h2><p>{lang === "fr" ? "Ajoutés après les tags propres à la vidéo, dans le document Word exporté." : "Added after the video’s own tags, in the exported Word document."}</p></div><span>{defaultTagBudget.characters} / {TAG_LIMIT}</span></div>
      <label className="description-footer-editor"><span>{lang === "fr" ? "Séparés par des virgules ou des retours à la ligne" : "Separated by commas or line breaks"}</span><textarea value={profile.defaultTags ?? ""} onChange={event => field("defaultTags", event.target.value)} rows={3} placeholder={lang === "fr" ? "intelligence artificielle, ia afrique, envol ia, formation ia…" : "artificial intelligence, ai africa, ai training…"} /><small>{lang === "fr" ? "YouTube limite le champ des tags à 500 caractères au total. Si l’ensemble dépasse, les derniers tags sont retirés — donc ceux-ci avant ceux de la vidéo." : "YouTube caps the tags field at 500 characters in total. If the whole set overflows, the last tags are dropped — so these before the video’s own."}</small></label>
      <div className="description-footer-actions"><span>{defaultTagBudget.count > 0
        ? (lang === "fr" ? `${defaultTagBudget.count} tags par défaut · ${Math.max(0, TAG_LIMIT - defaultTagBudget.characters)} caractères restants pour la vidéo` : `${defaultTagBudget.count} default tags · ${Math.max(0, TAG_LIMIT - defaultTagBudget.characters)} characters left for the video`)
        : (lang === "fr" ? "Aucun tag par défaut : le document ne portera que les tags de la vidéo." : "No default tags: the document will carry only the video’s own.")}</span></div>
    </section>

    <section className="form-section protected description-footer-section"><div className="section-heading"><div><h2>{lang === "fr" ? "Bloc automatique de description" : "Automatic description block"}</h2><p>{lang === "fr" ? "Ajouté mot pour mot à la fin de chaque description améliorée." : "Added word for word at the end of every improved description."}</p></div><span>⌕ {lang === "fr" ? "AUTOMATIQUE" : "AUTOMATIC"}</span></div>
      <label className="description-footer-editor"><span>{lang === "fr" ? "Coordonnées, liens et appel à l’action" : "Contact details, links, and call to action"}</span><textarea value={profile.descriptionFooter ?? ""} onChange={event => field("descriptionFooter", event.target.value)} rows={5} placeholder={lang === "fr" ? "Ajoutez ici le texte qui doit apparaître automatiquement dans toutes vos descriptions…" : "Add the text that should automatically appear in all your descriptions…"} /><small>{lang === "fr" ? "Les sauts de ligne, emojis, numéros et liens sont conservés exactement. Laissez ce champ vide pour ne rien ajouter." : "Line breaks, emojis, phone numbers, and links are preserved exactly. Leave this empty to add nothing."}</small></label>
      <div className="description-footer-actions"><button type="button" onClick={() => field("descriptionFooter", profileDemo.descriptionFooter ?? "")}>{lang === "fr" ? "Restaurer le bloc Envol IA" : "Restore Envol IA block"}</button><span>{lang === "fr" ? "Ce bloc n’est jamais reformulé par l’IA." : "This block is never rewritten by AI."}</span></div>
    </section>
    <section className="form-section"><h2>{lang === "fr" ? "Identité éditoriale" : "Editorial identity"}</h2><div className="form-grid"><Field label={lang === "fr" ? "Nom de la chaîne" : "Channel name"} value={profile.channel} set={v => field("channel", v)} /><Field label={lang === "fr" ? "Thématique" : "Topic"} value={profile.theme} set={v => field("theme", v)} /><Field label={t.primaryLang} value={profile.primary} set={v => field("primary", v)} /><Field label={t.secondaryLang} value={profile.secondary} set={v => field("secondary", v)} /><Field label={t.audience} value={profile.audience} set={v => field("audience", v)} wide textarea /><Field label={t.tone} value={profile.tone} set={v => field("tone", v)} wide textarea /><Field label={t.duration} value={profile.duration} set={v => field("duration", v)} /></div></section>
    <section className="form-section protected"><div className="section-heading"><div><h2>{t.fixedText}</h2><p>{lang === "fr" ? "Le studio les reproduit exactement, sans reformulation." : "The studio reproduces these exactly, without rewriting."}</p></div><span>⌕ {lang === "fr" ? "PROTÉGÉ" : "PROTECTED"}</span></div><Field label={lang === "fr" ? "Texte de présentation" : "Introduction copy"} value={profile.presentation} set={v => field("presentation", v)} wide textarea /><div className="form-grid"><Field label={lang === "fr" ? "Phrase de lancement" : "Launch line"} value={profile.launch} set={v => field("launch", v)} /><Field label={lang === "fr" ? "Phrase de clôture" : "Closing line"} value={profile.closing} set={v => field("closing", v)} /></div></section>
  </div>;
}

function Field({ label, value, set, wide, textarea }: { label: string; value: string; set: (v: string) => void; wide?: boolean; textarea?: boolean }) { return <label className={wide ? "wide" : ""}><span>{label}</span>{textarea ? <textarea value={value} onChange={e => set(e.target.value)} rows={4} /> : <input value={value} onChange={e => set(e.target.value)} />}</label>; }
function Prompter({ script, title, close, t, copy }: { script: string; title: string; close: () => void; t: (typeof labels)[Lang]; copy: (v: string) => void }) { const [size, setSize] = useState(34); return <div className="prompter"><header><button onClick={close}>← {t.back}</button><strong>{title}</strong><div><button onClick={() => setSize(Math.max(22, size - 4))}>A−</button><button onClick={() => setSize(Math.min(58, size + 4))}>A＋</button><button onClick={() => copy(script)}>⧉ {t.copyScript}</button></div></header><article style={{ fontSize: `${size}px` }}>{script || "Le script apparaîtra ici après validation des étapes."}</article></div>; }

