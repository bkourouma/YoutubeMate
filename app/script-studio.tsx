/* eslint-disable @next/next/no-img-element, jsx-a11y/label-has-associated-control */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Lang = "fr" | "en";
type View = "studio" | "express" | "projects" | "profile";
type StepState = "done" | "active" | "todo";
type HookIterationTarget = "hook" | "promise" | "both";
type NoticeKind = "warning" | "error";
type ToastState = { message: string; kind: "success" | NoticeKind };

type Profile = {
  channel: string; theme: string; primary: string; secondary: string; audience: string;
  tone: string; presentation: string; launch: string; closing: string; contacts: string;
  offer: string; duration: string; youtubeConnected: boolean; vidiqConnected: boolean;
  thumbnailSystemPrompt?: string;
  descriptionFooter?: string;
};

type Chapter = {
  id: string; title: string; objective: string; keyPoints: string[]; targetWords: number;
};

type Project = {
  id: string; title: string; subject: string; status: string; updated: string; step: number;
  confirmed: boolean; completed: number[]; hook: string; promise: string; body: string;
  conclusion: string; reviewAccepted: boolean; hookGeneratedByAi?: boolean; packageAnswers: { visual: string; timecodes: string; links: string };
  workflowVersion: 2; chapters: Chapter[]; bodyWordTarget: number; bodyGeneratedByAi?: boolean; bodyModel?: string;
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
type AiSettings = {
  openaiKey: string; openrouterKey: string; openrouterModel: string; writerModel: string; visionModel: string;
  imageModel: "gpt-image-2" | "gpt-image-1.5"; imageQuality: "low" | "medium" | "high";
  rememberKeys: boolean;
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
    projects: "Projets", studio: "Studio", express: "Packaging express", profile: "Profil de chaîne", newVideo: "Nouvelle vidéo", pilot: "Pilote automatique", saved: "Sauvegardé à l’instant", steps: ["Recherche & angle", "Hook & intro", "Validation des chapitres", "Corps du script", "Conclusion & CTA", "Relecture finale", "Packaging"],
    validate: "Valider l’étape", regenerate: "Régénérer", edit: "Modifier", copy: "Copier", words: "mots", seconds: "secondes", guard: "Garde-fous actifs", facts: "Aucune donnée inventée", fixed: "Textes fixes protégés", oral: "Écriture orale", sources: "Sources vérifiées uniquement", project: "Projet", script: "Prompteur", export: "Exporter", allProjects: "Tous les projets", continue: "Continuer", recent: "Projets récents", channelProfile: "Profil de chaîne", integrations: "Intégrations personnelles", connected: "Connecté", disconnected: "Non connecté", test: "Tester la connexion", disconnect: "Déconnecter", saveProfile: "Enregistrer le profil", primaryLang: "Langue principale", secondaryLang: "Langue secondaire", fixedText: "Textes fixes — protégés mot pour mot", audience: "Audience cible", tone: "Ton & style", duration: "Durée cible", close: "Fermer", download: "Télécharger le document", copyScript: "Copier le script", fullScreen: "Plein écran", back: "Retour au studio", status: "Statut", updated: "Dernière modification", noKey: "Recherche manuelle disponible", ready: "Prêt à tourner", mandatoryStop: "Arrêt obligatoire", answerToContinue: "Votre réponse est requise pour continuer.", launch: "Lancer la génération", overview: "Vue d’ensemble", addSubject: "Quel est le sujet exact de la vidéo ?", create: "Créer le projet", cancel: "Annuler"
  },
  en: {
    projects: "Projects", studio: "Studio", express: "Express packaging", profile: "Channel profile", newVideo: "New video", pilot: "Autopilot", saved: "Saved just now", steps: ["Research & angle", "Hook & intro", "Chapter validation", "Script body", "Conclusion & CTA", "Final review", "Packaging"],
    validate: "Approve step", regenerate: "Regenerate", edit: "Edit", copy: "Copy", words: "words", seconds: "seconds", guard: "Guardrails active", facts: "No invented data", fixed: "Fixed copy protected", oral: "Written for speech", sources: "Verified sources only", project: "Project", script: "Teleprompter", export: "Export", allProjects: "All projects", continue: "Continue", recent: "Recent projects", channelProfile: "Channel profile", integrations: "Personal integrations", connected: "Connected", disconnected: "Not connected", test: "Test connection", disconnect: "Disconnect", saveProfile: "Save profile", primaryLang: "Primary language", secondaryLang: "Secondary language", fixedText: "Fixed copy — protected word for word", audience: "Target audience", tone: "Tone & style", duration: "Target duration", close: "Close", download: "Download document", copyScript: "Copy script", fullScreen: "Full screen", back: "Back to studio", status: "Status", updated: "Last updated", noKey: "Manual research available", ready: "Ready to record", mandatoryStop: "Mandatory stop", answerToContinue: "Your answer is required to continue.", launch: "Start generation", overview: "Overview", addSubject: "What is the exact video topic?", create: "Create project", cancel: "Cancel"
  },
};

function wordCount(value: string) { return value.trim() ? value.trim().split(/\s+/).length : 0; }

const WORDS_PER_MINUTE = 145;
const CONCLUSION_WORD_RESERVE = 90;

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
  const [aiSettings, setAiSettings] = useState<AiSettings>({ openaiKey: "", openrouterKey: "", openrouterModel: "", writerModel: "", visionModel: "", imageModel: "gpt-image-2", imageQuality: "medium", rememberKeys: false });
  const [credentialsHydrated, setCredentialsHydrated] = useState(false);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
  const [referenceThumbnails, setReferenceThumbnails] = useState<ReferenceThumbnail[]>([]);
  const [activeId, setActiveId] = useState(demoProjects[0].id);
  const [auto, setAuto] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [newOpen, setNewOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [prompter, setPrompter] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [studioAiLoading, setStudioAiLoading] = useState(false);
  const [studioAiNotice, setStudioAiNotice] = useState<{ projectId: string; kind: NoticeKind; message: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (savedCredentials) {
      try {
        const parsed = JSON.parse(savedCredentials) as Partial<AiSettings>;
        setAiSettings(current => ({ ...current, ...parsed, rememberKeys: true }));
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
      if (data.payload?.projects?.length) {
        const nextProfile = { ...profileDemo, ...data.payload.profile };
        const nextProjects = data.payload.projects.map(item => migrateProject(item, nextProfile));
        setProfile(nextProfile); setProjects(nextProjects); setActiveId(nextProjects.some(item => item.id === data.payload?.activeId) ? data.payload.activeId : nextProjects[0].id); setExpress(data.payload.express ?? expressDefault);
      }
    }).catch(() => null).finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!credentialsHydrated) return;
    if (aiSettings.rememberKeys) {
      localStorage.setItem("script-studio-ai-credentials", JSON.stringify(aiSettings));
    } else {
      localStorage.removeItem("script-studio-ai-credentials");
    }
  }, [aiSettings, credentialsHydrated]);

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

  useEffect(() => { loadReferenceThumbnails(); }, [loadReferenceThumbnails]);

  useEffect(() => {
    if (!hydrated) return;
    const payload = { profile, projects, activeId, express };
    localStorage.setItem("script-studio-lang", lang);
    localStorage.setItem("script-studio-workspace", JSON.stringify(payload));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/workspace", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null).finally(() => setSaveState("saved"));
    }, 700);
  }, [profile, projects, activeId, express, lang, hydrated]);

  const updateProject = (patch: Partial<Project>) => setProjects(items => items.map(p => p.id === activeId ? { ...p, ...patch, updated: lang === "fr" ? "À l’instant" : "Just now" } : p));
  const showToast = (message: string, kind: ToastState["kind"] = "success") => { setToast({ message, kind }); setTimeout(() => setToast(null), kind === "success" ? 1800 : 4200); };
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); showToast(lang === "fr" ? "Copié dans le presse-papiers" : "Copied to clipboard"); };
  const closingAlreadyIncluded = Boolean(profile.closing.trim() && project.conclusion.includes(profile.closing.trim()));
  const script = [project.hook, profile.presentation, project.promise, profile.launch, project.body, project.conclusion, closingAlreadyIncluded ? "" : profile.closing].filter(Boolean).join("\n\n");

  const createProject = () => {
    if (newSubject.trim().length < 3) {
      showToast(lang === "fr" ? "Le sujet doit contenir au moins 3 caractères." : "The subject must contain at least 3 characters.", "error");
      return;
    }
    const draft = { hook: "", promise: "", body: "", conclusion: "" };
    const next: Project = { id: crypto.randomUUID(), title: newSubject.trim(), subject: newSubject.trim(), status: lang === "fr" ? "Idée" : "Idea", updated: lang === "fr" ? "À l’instant" : "Just now", step: 1, confirmed: false, completed: [], ...draft, reviewAccepted: false, packageAnswers: { visual: "", timecodes: "", links: "" }, workflowVersion: 2, chapters: [], bodyWordTarget: scriptPlan(profile, draft).targetBodyWords };
    setProjects(items => [next, ...items]); setActiveId(next.id); setNewSubject(""); setNewOpen(false); setView("studio");
  };

  const runHookAi = async (action: "generate" | "iterate", target: HookIterationTarget = "both", direction = "") => {
    if (studioAiLoading) return false;
    if (!aiSettings.openrouterKey || !aiSettings.openrouterModel) {
      showToast(lang === "fr" ? "Ajoutez votre clé OpenRouter et choisissez un modèle dans le profil." : "Add your OpenRouter key and choose a model in the profile.");
      return false;
    }
    setStudioAiLoading(true);
    setStudioAiNotice(null);
    try {
      const response = await fetch("/api/studio-hook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: aiSettings.openrouterKey,
          model: aiSettings.openrouterModel,
          language: lang,
          action,
          target,
          direction,
          subject: project.subject,
          currentHook: project.hook,
          currentPromise: project.promise,
          profile: { channel: profile.channel, theme: profile.theme, audience: profile.audience, tone: profile.tone },
        }),
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
      const message = error instanceof Error ? error.message : (lang === "fr" ? "Génération impossible" : "Generation failed");
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
    if (aiSettings.openrouterKey && aiSettings.writerModel) return true;
    showToast(lang === "fr" ? "Ajoutez votre clé OpenRouter et choisissez le modèle de scénarisation dans le profil." : "Add your OpenRouter key and choose the long-form writing model in your profile.", "error");
    return false;
  };

  const runChaptersAi = async () => {
    if (studioAiLoading || !writerReady()) return false;
    const plan = scriptPlan(profile, project);
    setStudioAiLoading(true); setStudioAiNotice(null);
    try {
      const response = await fetch("/api/studio-chapters", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: aiSettings.openrouterKey, model: aiSettings.writerModel, language: lang, subject: project.subject,
          duration: profile.duration, targetBodyWords: plan.targetBodyWords, chapterCount: plan.chapterCount,
          hook: project.hook, promise: project.promise,
          profile: { channel: profile.channel, theme: profile.theme, audience: profile.audience, tone: profile.tone },
        }),
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
      const message = error instanceof Error ? error.message : (lang === "fr" ? "Plan impossible à générer" : "Could not generate the chapter plan");
      setStudioAiNotice({ projectId: activeId, kind: "error", message }); showToast(lang === "fr" ? "La génération des chapitres a été interrompue" : "Chapter generation was interrupted", "error");
      return false;
    } finally { setStudioAiLoading(false); }
  };

  const runWriterAi = async (action: "body" | "conclusion") => {
    if (studioAiLoading || !writerReady()) return false;
    const plan = scriptPlan(profile, project);
    setStudioAiLoading(true); setStudioAiNotice(null);
    try {
      const response = await fetch("/api/studio-write", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: aiSettings.openrouterKey, model: aiSettings.writerModel, language: lang, action,
          subject: project.subject, duration: profile.duration, targetBodyWords: project.bodyWordTarget || plan.targetBodyWords,
          hook: project.hook, promise: project.promise, body: project.body, chapters: project.chapters,
          profile: { channel: profile.channel, theme: profile.theme, audience: profile.audience, tone: profile.tone, closing: profile.closing },
        }),
      });
      const data = await response.json() as {
        result?: { body?: string; conclusion?: string; wordCount?: number; targetBodyWords?: number };
        warning?: { code?: string; actualWords?: number; targetWords?: number; targetMinimum?: number; deficit?: number; wordCount?: number; chapterDeficits?: Array<{ title?: string }> } | null;
        detail?: string; error?: string;
      };
      if (!response.ok) throw new Error(studioProviderError(response.status, data.detail || data.error));
      if (action === "body") {
        if (!data.result?.body) throw new Error(studioProviderError(response.status, data.detail || data.error));
        updateProject({ body: data.result.body, bodyWordTarget: data.result.targetBodyWords ?? (project.bodyWordTarget || plan.targetBodyWords), bodyGeneratedByAi: true, bodyModel: aiSettings.writerModel, conclusion: "", reviewAccepted: false, completed: project.completed.filter(number => number <= 3) });
        if (data.warning?.code === "body_under_target") {
          const weakChapters = data.warning.chapterDeficits?.length ?? 0;
          const message = lang === "fr" ? `Le corps contient ${data.warning.actualWords ?? wordCount(data.result.body)} mots. ${data.warning.deficit ? `Il manque encore environ ${data.warning.deficit} mots.` : "La longueur totale est atteinte."}${weakChapters ? ` ${weakChapters} chapitre(s) doivent encore être développés.` : ""}` : `The body contains ${data.warning.actualWords ?? wordCount(data.result.body)} words. ${data.warning.deficit ? `It is still about ${data.warning.deficit} words short.` : "The total length is reached."}${weakChapters ? ` ${weakChapters} chapter(s) still need development.` : ""}`;
          setStudioAiNotice({ projectId: activeId, kind: "warning", message }); showToast(lang === "fr" ? "Corps généré, longueur à compléter" : "Body generated, length needs work", "warning");
        } else showToast(lang === "fr" ? "Corps long format généré par l’IA" : "Long-form body generated by AI");
      } else {
        if (!data.result?.conclusion) throw new Error(studioProviderError(response.status, data.detail || data.error));
        updateProject({ conclusion: data.result.conclusion, reviewAccepted: false, completed: project.completed.filter(number => number <= 4) });
        if (data.warning) setStudioAiNotice({ projectId: activeId, kind: "warning", message: lang === "fr" ? `Conclusion générée : ${data.warning.wordCount ?? "?"} mots. Vérifiez sa longueur avant de valider.` : `Generated conclusion: ${data.warning.wordCount ?? "?"} words. Review its length before approval.` });
        showToast(lang === "fr" ? "Conclusion générée par l’IA" : "Conclusion generated by AI");
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : (lang === "fr" ? "Génération impossible" : "Generation failed");
      setStudioAiNotice({ projectId: activeId, kind: "error", message }); showToast(lang === "fr" ? "La génération a été interrompue" : "Generation was interrupted", "error");
      return false;
    } finally { setStudioAiLoading(false); }
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
    if (project.step === 1 && !project.confirmed) return showToast(t.answerToContinue);
    if (project.step === 2 && (wordCount(project.hook) < 25 || wordCount(project.hook) > 40)) return showToast(lang === "fr" ? "Le hook doit contenir 25 à 40 mots." : "The hook must contain 25–40 words.");
    if (project.step === 2 && !project.promise.trim()) return showToast(lang === "fr" ? "La promesse doit être renseignée." : "The promise is required.");
    if (project.step === 3 && (project.chapters.length < 5 || project.chapters.length > 12 || project.chapters.some(chapter => !chapter.title.trim() || !chapter.objective.trim() || chapter.keyPoints.length < 2 || chapter.keyPoints.length > 5 || chapter.keyPoints.some(point => !point.trim()) || !Number.isFinite(chapter.targetWords) || chapter.targetWords < 50))) return showToast(lang === "fr" ? "Validez un plan complet de 5 à 12 chapitres, avec 2 à 5 points clés remplis par chapitre." : "Approve a complete 5–12 chapter plan with 2–5 completed key points per chapter.", "error");
    if (project.step === 4 && !project.body) return showToast(t.answerToContinue);
    if (project.step === 4 && wordCount(project.body) < plan.minimumBodyWords) return showToast(lang === "fr" ? `Le corps est trop court : ${wordCount(project.body)} mots. Minimum requis pour ${plan.minimum} minutes : ${plan.minimumBodyWords} mots.` : `The body is too short: ${wordCount(project.body)} words. Minimum for ${plan.minimum} minutes: ${plan.minimumBodyWords} words.`, "error");
    if (project.step === 4 && wordCount(project.body) > plan.maximumBodyWords) return showToast(lang === "fr" ? `Le corps est trop long : ${wordCount(project.body)} mots. Maximum conseillé pour ${plan.maximum} minutes : ${plan.maximumBodyWords} mots.` : `The body is too long: ${wordCount(project.body)} words. Recommended maximum for ${plan.maximum} minutes: ${plan.maximumBodyWords} words.`, "error");
    if (project.step === 5 && !project.conclusion) return showToast(t.answerToContinue);
    if (project.step === 6 && !project.reviewAccepted) return showToast(t.answerToContinue);
    if (project.step === 7 && (!project.packageAnswers.visual || !project.packageAnswers.timecodes || !project.packageAnswers.links)) return showToast(t.answerToContinue);
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

  const download = () => {
    const content = `# ${project.title}\n\n## Idée & angle\n${project.subject}\n\n## Script continu\n${script}\n\n## Verdict\nTextes fixes : conforme · Faits non vérifiés : aucun ajouté\n\n## Packaging\nVoir les options A/B/C dans Script Studio.`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${project.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`; a.click(); URL.revokeObjectURL(url);
  };

  if (prompter) return <Prompter script={script} title={project.title} close={() => setPrompter(false)} t={t} copy={copy} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("studio")} aria-label="Script Studio"><span className="brand-mark">S</span><span>Script Studio<small>Creator workspace</small></span></button>
        <button className="new-video" onClick={() => setNewOpen(true)}><span>＋</span>{t.newVideo}</button>
        <nav>
          <NavButton active={view === "studio"} icon="◫" label={t.studio} onClick={() => setView("studio")} />
          <NavButton active={view === "express"} icon="✦" label={t.express} onClick={() => setView("express")} />
          <NavButton active={view === "projects"} icon="▤" label={t.projects} count={projects.length} onClick={() => setView("projects")} />
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
            <div><div className="breadcrumb">{t.projects} <span>/</span> <strong>{project.title}</strong></div><div className="save-state"><i />{saveState === "saved" ? t.saved : (lang === "fr" ? "Sauvegarde…" : "Saving…")}</div></div>
            <div className="top-actions"><label className="pilot-switch"><span>{t.pilot}</span><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /><i /></label><button className="secondary" onClick={() => setPrompter(true)}>▣ {t.script}</button><button className="dark-button" onClick={download}>↓ {t.export}</button></div>
          </header>
          <section className="stepper" aria-label="Pipeline">
            {t.steps.map((label, index) => { const number = index + 1; const state: StepState = project.step === number ? "active" : project.completed.includes(number) ? "done" : "todo"; return <button key={label} className={`step ${state}`} onClick={() => navigateStep(number)}><span>{state === "done" ? "✓" : number}</span><small>{label}</small></button>; })}
          </section>
          <div className="workspace">
            <section className="editor"><Stage project={project} profile={profile} t={t} lang={lang} updateProject={updateProject} generate={generateStep} copy={copy} aiLoading={studioAiLoading} aiModel={aiSettings.openrouterModel} writerModel={aiSettings.writerModel} iterateHook={(target, direction) => runHookAi("iterate", target, direction)} />
              {studioAiNotice?.projectId === activeId && <div className={`studio-ai-notice ${studioAiNotice.kind}`} role={studioAiNotice.kind === "error" ? "alert" : "status"}>
                <span>{studioAiNotice.kind === "error" ? "!" : "i"}</span>
                <div><strong>{studioAiNotice.kind === "error" ? (lang === "fr" ? "La génération n’a pas abouti" : "Generation did not complete") : (lang === "fr" ? "Ajustement conseillé" : "Adjustment recommended")}</strong><p>{studioAiNotice.message}</p><div><button onClick={generateStep} disabled={studioAiLoading}>↻ {lang === "fr" ? "Réessayer" : "Retry"}</button><button onClick={() => setView("profile")}>{lang === "fr" ? "Choisir un autre modèle" : "Choose another model"}</button></div></div>
                <button className="notice-close" aria-label={lang === "fr" ? "Fermer le message" : "Dismiss message"} onClick={() => setStudioAiNotice(null)}>×</button>
              </div>}
              <div className="editor-actions">{project.step <= 5 && <button className="ghost" onClick={generateStep} disabled={studioAiLoading}>{studioAiLoading ? (lang === "fr" ? (project.step === 3 ? "L’IA construit le plan…" : project.step === 4 ? "L’IA rédige le corps long…" : project.step === 5 ? "L’IA conclut…" : "L’IA travaille…") : "AI is working…") : `↻ ${t.regenerate}`}</button>}<button className="primary" onClick={validate} disabled={studioAiLoading}>{t.validate} <span>→</span></button></div>
            </section>
            <aside className="guard-panel"><div className="guard-title"><span>◆</span><div><strong>{t.guard}</strong><small>{lang === "fr" ? "Pour cette génération" : "For this generation"}</small></div></div><Guard label={t.facts} /><Guard label={t.fixed} /><Guard label={t.oral} /><Guard label={t.sources} /><hr /><div className="context-box"><small>{lang === "fr" ? "CONTEXTE ACTIF" : "ACTIVE CONTEXT"}</small><strong>{profile.channel}</strong><p>{profile.audience}</p><button onClick={() => setView("profile")}>{lang === "fr" ? "Voir le profil" : "View profile"} →</button></div></aside>
          </div>
        </>}
        {view === "projects" && <Projects projects={projects} activeId={activeId} lang={lang} t={t} open={id => { setActiveId(id); setView("studio"); }} create={() => setNewOpen(true)} />}
        {view === "express" && <ExpressPackagingAI value={express} setValue={setExpress} profile={profile} lang={lang} copy={copy} showToast={showToast} aiSettings={aiSettings} referenceThumbnails={referenceThumbnails} openAiSettings={() => setView("profile")} />}
        {view === "profile" && <ProfilePageAI profile={profile} setProfile={setProfile} lang={lang} t={t} aiSettings={aiSettings} setAiSettings={setAiSettings} openRouterModels={openRouterModels} referenceThumbnails={referenceThumbnails} reloadReferences={loadReferenceThumbnails} showToast={message => showToast(message)} done={() => { showToast(lang === "fr" ? "Profil enregistré" : "Profile saved"); setView("studio"); }} />}
      </main>
      {newOpen && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title"><button className="modal-close" onClick={() => setNewOpen(false)}>×</button><span className="eyebrow">{lang === "fr" ? "NOUVEAU PROJET" : "NEW PROJECT"}</span><h2 id="new-project-title">{t.addSubject}</h2><p>{lang === "fr" ? "Soyez précis : le studio ne recherchera jamais une catégorie plus large." : "Be specific: the studio will never research a broader category."}</p><textarea value={newSubject} maxLength={2000} onChange={e => setNewSubject(e.target.value)} placeholder={lang === "fr" ? "Ex. Comment utiliser l’IA pour répondre aux clients sur WhatsApp Business" : "E.g. How to use AI to answer customers on WhatsApp Business"} /><div className="modal-actions"><button className="ghost" onClick={() => setNewOpen(false)}>{t.cancel}</button><button className="primary" onClick={createProject}>{t.create} →</button></div></div></div>}
      {toast && <div className={`toast ${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>{toast.kind === "success" ? "✓" : toast.kind === "warning" ? "i" : "!"} {toast.message}</div>}
    </div>
  );
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: string; label: string; count?: number; onClick: () => void }) { return <button className={active ? "active" : ""} onClick={onClick}><span>{icon}</span>{label}{count !== undefined && <i>{count}</i>}</button>; }
function Guard({ label }: { label: string }) { return <div className="guard-item"><span>✓</span>{label}</div>; }

function Stage({ project, profile, t, lang, updateProject, generate, copy, aiLoading, aiModel, writerModel, iterateHook }: { project: Project; profile: Profile; t: (typeof labels)[Lang]; lang: Lang; updateProject: (p: Partial<Project>) => void; generate: () => void; copy: (v: string) => void; aiLoading: boolean; aiModel: string; writerModel: string; iterateHook: (target: HookIterationTarget, direction: string) => Promise<boolean> }) {
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
  if (project.step === 4) { const bodyWords = wordCount(project.body); const inRange = bodyWords >= plan.minimumBodyWords && bodyWords <= plan.maximumBodyWords; return <><StageHead n={4} title={title} desc={lang === "fr" ? `Corps long format fondé sur les ${project.chapters.length} chapitres validés.` : `Long-form body based on the ${project.chapters.length} approved chapters.`} /><div className={`body-target ${inRange ? "ready" : "short"}`}><div><strong>{bodyWords.toLocaleString(lang)} / {(project.bodyWordTarget || plan.targetBodyWords).toLocaleString(lang)} {t.words}</strong><small>{lang === "fr" ? `Minimum ${plan.minimumBodyWords.toLocaleString(lang)} mots pour ${plan.minimum} min` : `Minimum ${plan.minimumBodyWords.toLocaleString(lang)} words for ${plan.minimum} min`}</small></div><div><strong>≈ {plan.estimatedMinutes.toFixed(1)} min</strong><small>{lang === "fr" ? "vidéo complète estimée" : "estimated full video"}</small></div><span><i style={{ width: `${Math.min(100, bodyWords / Math.max(1, project.bodyWordTarget || plan.targetBodyWords) * 100)}%` }} /></span></div>{!project.body ? <EmptyGenerate onClick={generate} t={t} lang={lang} /> : <><div className={`ai-generated-note ${project.bodyGeneratedByAi ? "verified" : "manual"}`}><span>{project.bodyGeneratedByAi ? "✦" : "✎"}</span><div><strong>{project.bodyGeneratedByAi ? (lang === "fr" ? "Corps long généré avec réflexion élevée" : "Long-form body generated with high reasoning") : (lang === "fr" ? "Corps modifié manuellement" : "Manually edited body")}</strong><small>{project.bodyModel || writerModel}</small></div></div><OutputBlock label={lang === "fr" ? "CORPS DU SCRIPT" : "SCRIPT BODY"} value={project.body} onChange={v => updateProject({ body: v, bodyGeneratedByAi: false, conclusion: "", reviewAccepted: false, completed: project.completed.filter(number => number < 4) })} copy={() => copy(project.body)} rows={28} meta={<span className={bodyWords < plan.minimumBodyWords ? "danger" : "good"}>{bodyWords} {t.words}</span>} /></>}</> }
  if (project.step === 5) return <><StageHead n={5} title={title} desc={lang === "fr" ? "L’IA récapitule uniquement ce que le corps validé a réellement démontré." : "AI recaps only what the approved body actually demonstrated."} />{!project.conclusion ? <EmptyGenerate onClick={generate} t={t} lang={lang} /> : <><div className="ai-generated-note verified"><span>✦</span><div><strong>{lang === "fr" ? "Conclusion générée depuis le corps complet" : "Conclusion generated from the complete body"}</strong><small>{writerModel} · high thinking</small></div></div><OutputBlock label="CONCLUSION" value={project.conclusion} onChange={v => updateProject({ conclusion: v, reviewAccepted: false, completed: project.completed.filter(number => number < 5) })} copy={() => copy(project.conclusion)} rows={10} meta={<span>{wordCount(project.conclusion)} {t.words}</span>} /><div className="locked-line"><span>⌕</span>{profile.closing}</div></>}</>;
  if (project.step === 6) { const chaptersCovered = project.chapters.length >= 5 && project.chapters.every((_, index) => project.body.includes(`CHAPITRE ${index + 1}`)); const durationValid = plan.estimatedMinutes >= plan.minimum && plan.estimatedMinutes <= plan.maximum; return <><StageHead n={6} title={title} desc={lang === "fr" ? "Le relecteur signale les contrôles automatiques et ceux qui exigent votre jugement." : "The reviewer separates automatic checks from those requiring your judgment."} /><div className="stop-banner"><span>Ⅱ</span><div><strong>{t.mandatoryStop}</strong><p>{lang === "fr" ? "Même en Pilote automatique, vous décidez avant le packaging." : "Even in Autopilot, you decide before packaging."}</p></div></div><div className="review-list"><Review status="warn" label={lang === "fr" ? "Vérifiez que le corps tient réellement la promesse" : "Confirm that the body truly fulfils the promise"} detail={lang === "fr" ? "Ce contrôle sémantique reste une décision humaine." : "This semantic check remains a human decision."} /><Review status={chaptersCovered ? "ok" : "warn"} label={chaptersCovered ? (lang === "fr" ? `${project.chapters.length} chapitres présents dans l’ordre` : `${project.chapters.length} chapters present in order`) : (lang === "fr" ? "Un ou plusieurs chapitres sont absents" : "One or more chapters are missing")} /><Review status={durationValid ? "ok" : "warn"} label={lang === "fr" ? `${wordCount(project.body)} mots · environ ${plan.estimatedMinutes.toFixed(1)} minutes` : `${wordCount(project.body)} words · about ${plan.estimatedMinutes.toFixed(1)} minutes`} /><Review status="warn" label={lang === "fr" ? "Vérifiez les faits, chiffres et sources avant publication" : "Verify facts, figures, and sources before publishing"} detail={lang === "fr" ? "Le studio n’affirme pas avoir vérifié automatiquement des sources absentes." : "The studio does not claim to have automatically verified missing sources."} /></div><label className="decision"><input type="checkbox" checked={project.reviewAccepted} onChange={e => updateProject({ reviewAccepted: e.target.checked })} /><span><strong>{lang === "fr" ? "J’ai effectué les vérifications humaines" : "I completed the human checks"}</strong><small>{lang === "fr" ? "Cette décision déverrouille l’étape 7." : "This decision unlocks step 7."}</small></span></label></>; }
  return <Packaging project={project} updateProject={updateProject} lang={lang} t={t} copy={copy} />;
}

function StageHead({ n, title, desc }: { n: number; title: string; desc: string }) { return <div className="stage-head"><span>ÉTAPE {n} / 7</span><h1>{title}</h1><p>{desc}</p></div>; }
function Position({ tag, title }: { tag: string; title: string }) { return <div><span>{tag}</span><strong>{title}</strong><small>Score estimé · 82/100</small></div>; }
function EmptyGenerate({ onClick, t, lang }: { onClick: () => void; t: (typeof labels)[Lang]; lang: Lang }) { return <div className="empty-generate"><span>✦</span><h3>{lang === "fr" ? "Tout est prêt pour cette étape" : "Everything is ready for this step"}</h3><p>{lang === "fr" ? "Le profil et les sorties validées seront utilisés comme contexte." : "Your profile and approved outputs will be used as context."}</p><button className="primary" onClick={onClick}>✦ {t.launch}</button></div>; }
function OutputBlock({ label, value, onChange, copy, meta, rows = 5 }: { label: string; value: string; onChange: (v: string) => void; copy: () => void; meta?: React.ReactNode; rows?: number }) { return <div className="output-block"><div className="output-label"><span>{label}</span><div>{meta}<button onClick={copy}>⧉ Copier</button></div></div><textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} /></div>; }
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

function ExpressPackagingAI({ value, setValue, profile, lang, copy, showToast, aiSettings, referenceThumbnails, openAiSettings }: {
  value: ExpressState; setValue: (value: ExpressState) => void; profile: Profile; lang: Lang;
  copy: (value: string) => void; showToast: (value: string) => void; aiSettings: AiSettings; referenceThumbnails: ReferenceThumbnail[]; openAiSettings: () => void;
}) {
  const [loading, setLoading] = useState<"package" | "images" | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const update = (patch: Partial<ExpressState>) => setValue({ ...value, ...patch });
  const configured = Boolean(aiSettings.openrouterKey && aiSettings.openrouterModel);

  const generate = async () => {
    if (value.source.trim().length < 80) return showToast(lang === "fr" ? "Ajoutez au moins 80 caractères de contenu." : "Add at least 80 characters of content.");
    if (!configured) return showToast(lang === "fr" ? "Ajoutez votre clé OpenRouter et choisissez un modèle." : "Add your OpenRouter key and choose a model.");
    setLoading("package");
    try {
      const response = await fetch("/api/openrouter-generate", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: aiSettings.openrouterKey, model: aiSettings.openrouterModel, language: lang, inputType: value.inputType, subject: value.subject, source: value.source, profile: { channel: profile.channel, theme: profile.theme, audience: profile.audience, tone: profile.tone, thumbnailSystemPrompt: profile.thumbnailSystemPrompt, descriptionFooter: profile.descriptionFooter } }),
      });
      const data = await response.json() as { result?: PackagingResult; error?: string; detail?: string };
      if (response.status === 401) throw new Error(lang === "fr" ? "Clé OpenRouter refusée. Testez-la dans le profil." : "OpenRouter rejected the key. Test it in your profile.");
      if (!response.ok || !data.result) throw new Error(data.detail || data.error || "generation_failed");
      const result = data.result;
      if (!Array.isArray(result.options) || result.options.length !== 3 || result.options.some(option => !Array.isArray(option.concepts) || option.concepts.length !== 3)) throw new Error("invalid_packaging_shape");
      update({ generated: true, thumbnailsGenerated: false, package: result, vidiqScores: {}, vidiqStatus: "idle", selected: { A: 0, B: 0, C: 0 } });
      setImages({});
    } catch (error) {
      showToast(lang === "fr" ? `OpenRouter : ${error instanceof Error ? error.message : "génération impossible"}` : `OpenRouter: ${error instanceof Error ? error.message : "generation failed"}`);
    } finally { setLoading(null); }
  };

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
      showToast(lang === "fr" ? "Connexion vidIQ indisponible. Aucun score n’a été estimé." : "vidIQ unavailable. No score was estimated.");
    }
  };

  const generateThumbnails = async (options: PackagingOption[]) => {
    if (!aiSettings.openaiKey) return showToast(lang === "fr" ? "Ajoutez votre clé OpenAI dans le Profil de chaîne." : "Add your OpenAI key in Channel profile.");
    setLoading("images");
    try {
      const generated = await Promise.all(options.map(async option => {
        const conceptIndex = value.selected[option.id] ?? 0;
        const concept = option.concepts[conceptIndex];
        const response = await fetch("/api/openai-image", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ apiKey: aiSettings.openaiKey, model: aiSettings.imageModel, quality: aiSettings.imageQuality, prompt: concept.prompt, overlay: option.overlay, channel: profile.channel, systemPrompt: profile.thumbnailSystemPrompt, referenceKeys: referenceThumbnails.map(reference => reference.key) }),
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
      showToast(lang === "fr" ? `OpenAI : ${error instanceof Error ? error.message : "génération impossible"}` : `OpenAI: ${error instanceof Error ? error.message : "generation failed"}`);
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

  if (!value.generated || !value.package) return <div className="express-page">
    <div className="express-hero"><div><span className="eyebrow">{lang === "fr" ? "VIDÉO DÉJÀ TOURNÉE" : "VIDEO ALREADY RECORDED"}</span><h1>{lang === "fr" ? "Du contenu au clic." : "From content to click."}</h1><p>{lang === "fr" ? "Collez votre script ou votre description. Le modèle OpenRouter choisi prépare le packaging, puis OpenAI génère les vraies miniatures." : "Paste your script or description. Your chosen OpenRouter model prepares the packaging, then OpenAI generates real thumbnails."}</p></div><div className="express-orbit"><span>3×3</span><small>{lang === "fr" ? "titres × concepts" : "titles × concepts"}</small></div></div>
    <section className="express-input-card">
      <div className={`ai-ready-strip ${configured && aiSettings.openaiKey ? "ready" : ""}`}><span>{configured && aiSettings.openaiKey ? "✓" : "!"}</span><div><strong>{configured && aiSettings.openaiKey ? (lang === "fr" ? "IA configurée" : "AI configured") : (lang === "fr" ? "Configuration IA requise" : "AI setup required")}</strong><small>{configured ? aiSettings.openrouterModel : (lang === "fr" ? "Clé OpenRouter + modèle requis" : "OpenRouter key + model required")} · {aiSettings.openaiKey ? aiSettings.imageModel : (lang === "fr" ? "clé OpenAI manquante" : "OpenAI key missing")} · {aiSettings.rememberKeys ? (lang === "fr" ? "clés mémorisées sur cet appareil" : "keys remembered on this device") : (lang === "fr" ? "session uniquement" : "session only")}</small></div><button onClick={openAiSettings}>{lang === "fr" ? "Configurer" : "Configure"}</button></div>
      <div className={`vidiq-requirement ${profile.vidiqConnected ? "connected" : ""}`}><span>{profile.vidiqConnected ? "✓" : "!"}</span><div><strong>{profile.vidiqConnected ? (lang === "fr" ? "Compte vidIQ connecté" : "vidIQ account connected") : (lang === "fr" ? "Connexion vidIQ requise" : "vidIQ connection required")}</strong><small>{lang === "fr" ? "Les scores seront repris tels quels depuis vidIQ — jamais estimés." : "Scores are reported exactly as returned by vidIQ — never estimated."}</small></div></div>
      <div className="source-toggle"><button className={value.inputType === "script" ? "active" : ""} onClick={() => update({ inputType: "script", generated: false })}>▤ {lang === "fr" ? "J’ai le script" : "I have the script"}<small>{lang === "fr" ? "Inclut 5 quiz" : "Includes 5 quizzes"}</small></button><button className={value.inputType === "description" ? "active" : ""} onClick={() => update({ inputType: "description", generated: false })}>≡ {lang === "fr" ? "J’ai la description" : "I have the description"}<small>{lang === "fr" ? "Packaging uniquement" : "Packaging only"}</small></button></div>
      <label><span>{lang === "fr" ? "Sujet de la vidéo (facultatif)" : "Video topic (optional)"}</span><input value={value.subject} onChange={event => update({ subject: event.target.value, generated: false })} placeholder={lang === "fr" ? "Le système le déduira du contenu si ce champ est vide" : "The system will infer it from the content if left blank"} /></label>
      <label><span>{value.inputType === "script" ? (lang === "fr" ? "Script complet" : "Full script") : (lang === "fr" ? "Description existante" : "Existing description")}</span><textarea value={value.source} onChange={event => update({ source: event.target.value, generated: false })} rows={13} placeholder={lang === "fr" ? "Collez ici le contenu exact de la vidéo…" : "Paste the exact video content here…"} /></label>
      <div className="input-footer"><span>◆ {lang === "fr" ? "Les clés restent uniquement en mémoire pendant cette session" : "Keys remain only in memory for this session"}</span><button className="primary express-generate" onClick={generate} disabled={loading !== null || !profile.vidiqConnected || !configured}>{loading === "package" ? (lang === "fr" ? "Génération avec l’IA…" : "Generating with AI…") : (lang === "fr" ? "Générer le packaging" : "Generate packaging")} →</button></div>
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
  return <div className="express-page results">
    <div className="express-result-head"><div><button onClick={() => update({ generated: false, thumbnailsGenerated: false })}>← {lang === "fr" ? "Modifier la source" : "Edit source"}</button><span className="eyebrow">{lang === "fr" ? "PACKAGING EXPRESS · IA" : "AI EXPRESS PACKAGING"}</span><h1>{pack.topic}</h1></div><div className="result-status"><span>✓</span><div><strong>{lang === "fr" ? "Généré par" : "Generated by"} {aiSettings.openrouterModel}</strong><small>{value.inputType === "script" ? "Script + quiz" : (lang === "fr" ? "Description seule" : "Description only")}</small></div></div></div>
    <section className="express-section"><div className="express-section-title"><span>01</span><div><h2>{lang === "fr" ? "Tests A/B/C" : "A/B/C tests"}</h2><p>{lang === "fr" ? "Choisissez un concept visuel pour chaque paire titre–description." : "Choose one visual concept for each title–description pair."}</p></div><button className={`vidiq-sync ${value.vidiqStatus || "idle"}`} onClick={() => syncVidiqScores(pack.options)} disabled={value.vidiqStatus === "loading"}>{value.vidiqStatus === "loading" ? (lang === "fr" ? "Synchronisation…" : "Syncing…") : (lang === "fr" ? "Synchroniser les scores vidIQ" : "Sync vidIQ scores")}</button></div>
      <div className="ab-options">{pack.options.map(option => <article className="ab-option" key={option.id}><div className="ab-option-head"><span>OPTION {option.id}</span><small>{option.register}</small></div><div className={`vidiq-score ${value.vidiqScores?.[option.id] !== undefined ? "ready" : "pending"}`}><b>{value.vidiqScores?.[option.id] ?? "—"}</b><span>{value.vidiqScores?.[option.id] !== undefined ? "/100 · vidIQ" : (lang === "fr" ? "score vidIQ en attente" : "vidIQ score pending")}</span></div><h3>{option.title}</h3><p>{option.description}</p><div className="copy-row"><button onClick={() => copy(option.title)}>⧉ {lang === "fr" ? "Titre" : "Title"}</button><button onClick={() => copy(option.description)}>⧉ Description</button></div><div className="concept-list"><strong>{lang === "fr" ? "3 concepts de miniature" : "3 thumbnail concepts"}</strong>{option.concepts.map((concept, index) => <button className={value.selected[option.id] === index ? "selected" : ""} key={`${option.id}-${index}`} onClick={() => { update({ selected: { ...value.selected, [option.id]: index }, thumbnailsGenerated: false }); setImages({}); }}><span>{value.selected[option.id] === index ? "✓" : index + 1}</span><div><b>{concept.name}</b><small>{concept.prompt}</small></div></button>)}</div></article>)}</div>
      <div className="vidiq-truth-note">◆ {value.vidiqStatus === "error" ? (lang === "fr" ? "vidIQ n’a renvoyé aucun score. Aucun remplacement n’est affiché." : "vidIQ returned no score. No replacement is displayed.") : (lang === "fr" ? "Les valeurs vidIQ sont affichées telles quelles, sans estimation locale." : "vidIQ values are shown exactly as returned, with no local estimate.")}</div>
      <div className={`english-winner ${bestScoredOption ? "ready" : "pending"}`}><div className="english-winner-head"><div><span>EN</span><div><strong>{lang === "fr" ? "Meilleur packaging en anglais" : "Top-scoring packaging in English"}</strong><small>{bestScoredOption ? `OPTION ${bestScoredOption.id} · ${value.vidiqScores?.[bestScoredOption.id]}/100 vidIQ` : (lang === "fr" ? "Disponible après la synchronisation vidIQ" : "Available after vidIQ synchronization")}</small></div></div>{bestScoredOption && <button onClick={() => copy(`${bestScoredOption.englishTitle ?? bestScoredOption.title}\n\n${bestScoredOption.englishDescription ?? bestScoredOption.description}`)}>⧉ {lang === "fr" ? "Copier l’ensemble" : "Copy all"}</button>}</div>{bestScoredOption ? <div className="english-winner-copy"><article><small>ENGLISH TITLE</small><h3>{bestScoredOption.englishTitle ?? bestScoredOption.title}</h3><button onClick={() => copy(bestScoredOption.englishTitle ?? bestScoredOption.title)}>⧉</button></article><article><small>ENGLISH DESCRIPTION</small><p>{bestScoredOption.englishDescription ?? bestScoredOption.description}</p><button onClick={() => copy(bestScoredOption.englishDescription ?? bestScoredOption.description)}>⧉</button></article></div> : <p>{lang === "fr" ? "Cliquez sur « Synchroniser les scores vidIQ » : la traduction anglaise de l’option gagnante apparaîtra ici." : "Click “Sync vidIQ scores” to display the English version of the winning option here."}</p>}</div>
      {(referenceThumbnails.length > 0 || profile.thumbnailSystemPrompt) && <div className="visual-dna-active">◆ {lang === "fr" ? "ADN visuel actif" : "Visual DNA active"} · {referenceThumbnails.length} {lang === "fr" ? "référence(s)" : "reference(s)"} · {profile.thumbnailSystemPrompt ? (lang === "fr" ? "prompt système appliqué" : "system prompt applied") : (lang === "fr" ? "prompt système à générer" : "system prompt pending")}</div>}
      <button className="primary thumbnail-cta" onClick={() => generateThumbnails(pack.options)} disabled={loading !== null}>✦ {loading === "images" ? (lang === "fr" ? "OpenAI génère 3 images…" : "OpenAI is generating 3 images…") : (lang === "fr" ? "Générer les 3 vraies miniatures" : "Generate 3 real thumbnails")}</button>
      {!aiSettings.openaiKey && <button className="inline-config" onClick={openAiSettings}>{lang === "fr" ? "Ajouter la clé OpenAI" : "Add OpenAI key"} →</button>}
    </section>
    {value.thumbnailsGenerated && Object.keys(images).length === 3 && <section className="express-section generated-thumbnails"><div className="express-section-title"><span>02</span><div><h2>{lang === "fr" ? "Miniatures générées par OpenAI" : "OpenAI-generated thumbnails"}</h2><p>{lang === "fr" ? "Téléchargez chaque PNG recadré automatiquement en 1280 × 720." : "Download each PNG automatically cropped to 1280 × 720."}</p></div></div><div className="thumbnail-grid">{pack.options.map(option => <figure key={option.id} className="thumbnail-preview real-thumbnail"><img src={images[option.id]} alt={`${lang === "fr" ? "Miniature" : "Thumbnail"} ${option.id}: ${option.title}`} /><figcaption><strong>{option.overlay}</strong><span>{option.concepts[value.selected[option.id] ?? 0].name}</span></figcaption><button onClick={() => downloadThumbnail(images[option.id], option.id)}>↓ PNG · 1280 × 720</button></figure>)}</div></section>}
    <section className="express-section"><div className="express-section-title"><span>{value.thumbnailsGenerated ? "03" : "02"}</span><div><h2>{lang === "fr" ? "Description, tags & commentaire épinglé" : "Description, tags & pinned comment"}</h2><p>{lang === "fr" ? "Générés par le modèle sélectionné et prêts à copier." : "Generated by the selected model and ready to copy."}</p></div></div><div className="delivery-grid"><div className="delivery-card"><div><strong>{lang === "fr" ? "DESCRIPTION AMÉLIORÉE" : "IMPROVED DESCRIPTION"}</strong><button onClick={() => copy(pack.improvedDescription)}>⧉ {lang === "fr" ? "Copier" : "Copy"}</button></div><pre>{pack.improvedDescription}</pre></div><div className="delivery-card tags-card"><div><strong>TAGS</strong><button onClick={() => copy(pack.tags.join(", "))}>⧉ {lang === "fr" ? "Copier tout" : "Copy all"}</button></div><div>{pack.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div></div><div className="pinned-comment-card"><div><span>📌</span><div><strong>{lang === "fr" ? "COMMENTAIRE À ÉPINGLER" : "PINNED COMMENT"}</strong><small>{lang === "fr" ? "Une relance naturelle pour engager la discussion sous la vidéo." : "A natural prompt to start a conversation below the video."}</small></div><button onClick={() => copy(pack.pinnedComment ?? "")} disabled={!pack.pinnedComment}>⧉ {lang === "fr" ? "Copier" : "Copy"}</button></div><p>{pack.pinnedComment ?? (lang === "fr" ? "Régénérez le packaging pour créer le commentaire épinglé." : "Regenerate the packaging to create the pinned comment.")}</p></div></section>
    {value.inputType === "script" && <section className="express-section"><div className="express-section-title"><span>{value.thumbnailsGenerated ? "04" : "03"}</span><div><h2>{lang === "fr" ? "5 quiz à trois choix" : "5 three-choice quizzes"}</h2><p>{lang === "fr" ? "Chaque question propose exactement trois réponses ; la bonne est appuyée par le script." : "Each question has exactly three answers; the correct one is supported by the script."}</p></div></div><div className="quiz-list">{pack.quiz.map((item, index) => { const choices = quizChoices(item, lang); const correctOption = item.correctOption ?? 0; return <article key={`${index}-${item.question}`}><span>{index + 1}</span><div><strong>{item.question}</strong><ol>{choices.map((choice, choiceIndex) => <li className={choiceIndex === correctOption ? "correct" : ""} key={`${choiceIndex}-${choice}`}><b>{String.fromCharCode(65 + choiceIndex)}</b><span>{choice}</span>{choiceIndex === correctOption && <em>✓ {lang === "fr" ? "Bonne réponse" : "Correct"}</em>}</li>)}</ol></div><button onClick={() => copy(quizClipboard(item, lang))} aria-label={lang === "fr" ? "Copier le quiz" : "Copy quiz"}>⧉</button></article>; })}</div></section>}
  </div>;
}

function ExpressPackaging({ value, setValue, profile, lang, copy, showToast }: { value: ExpressState; setValue: (value: ExpressState) => void; profile: Profile; lang: Lang; copy: (value: string) => void; showToast: (value: string) => void }) {
  const [loading, setLoading] = useState(false);
  const sourceSentences = value.source.split(/(?<=[.!?])\s+/).map(item => item.trim()).filter(Boolean);
  const sourceTopic = (value.subject.trim() || sourceSentences[0] || (lang === "fr" ? "Votre vidéo" : "Your video")).replace(/[.!?]+$/, "");
  const topic = sourceTopic.length > 70 ? `${sourceTopic.slice(0, 67)}…` : sourceTopic;
  const options = [
    {
      id: "A", register: lang === "fr" ? "Bascule émotionnelle" : "Emotional shift",
      title: lang === "fr" ? `Pourquoi ${topic} change tout` : `Why ${topic} changes everything`,
      description: lang === "fr" ? `Ce que ${topic.toLowerCase()} change concrètement — et le point essentiel à garder sous contrôle.` : `What ${topic.toLowerCase()} changes in practice — and the essential point to keep under control.`,
      overlay: lang === "fr" ? "ÇA CHANGE TOUT" : "THIS CHANGES EVERYTHING",
      concepts: [
        { name: lang === "fr" ? "Le déclic" : "The realization", prompt: `YouTube thumbnail, creator on the left reacting with a sudden realization, one clear visual symbol representing ${topic} on the right, deep forest green background, dramatic warm rim light, strong contrast, generous negative space, no text, no watermark`, art: "portrait" },
        { name: lang === "fr" ? "Avant / après" : "Before / after", prompt: `YouTube thumbnail, split composition showing a cluttered before state and a calm organized after state inspired by ${topic}, bold visual transformation, warm orange accent, cinematic lighting, no text, no watermark`, art: "split" },
        { name: lang === "fr" ? "L’objet impossible" : "The impossible object", prompt: `YouTube thumbnail, one oversized everyday object used as a visual metaphor for ${topic}, creator looking at it with curiosity, minimal dark green studio, high contrast editorial lighting, no text, no watermark`, art: "object" },
      ],
    },
    {
      id: "B", register: lang === "fr" ? "Résultat concret" : "Concrete result",
      title: lang === "fr" ? `Comment réussir ${topic} sans perdre le contrôle` : `How to master ${topic} without losing control`,
      description: lang === "fr" ? `Une méthode claire, tirée de la vidéo, pour passer de l’idée à l’action sans ajouter de promesse non vérifiée.` : `A clear method drawn from the video to move from idea to action without adding an unverified promise.`,
      overlay: lang === "fr" ? "GARDE LE CONTRÔLE" : "STAY IN CONTROL",
      concepts: [
        { name: lang === "fr" ? "La méthode en main" : "Method in hand", prompt: `YouTube thumbnail, confident creator holding a simple three-step card related to ${topic}, clean dark green backdrop, warm key light, focused expression, premium editorial composition, no text, no watermark`, art: "cards" },
        { name: lang === "fr" ? "Le choix décisif" : "The key choice", prompt: `YouTube thumbnail, creator between two large contrasting paths representing a wrong and right approach to ${topic}, decisive gesture toward the clear path, cinematic orange and green lighting, no text, no watermark`, art: "choice" },
        { name: lang === "fr" ? "Le tableau de bord" : "The dashboard", prompt: `YouTube thumbnail, close-up creator pointing at a clean visual dashboard metaphor for ${topic}, only three bold visual indicators, dark background, crisp studio lighting, no text, no watermark`, art: "dashboard" },
      ],
    },
    {
      id: "C", register: lang === "fr" ? "Vidéo de référence" : "Reference video",
      title: lang === "fr" ? `${topic} : le guide clair` : `${topic}: the clear guide`,
      description: lang === "fr" ? `Les idées, étapes et limites réellement présentées dans la vidéo, réunies dans un guide facile à retrouver.` : `The ideas, steps and limits actually presented in the video, brought together in an easy-to-find guide.`,
      overlay: lang === "fr" ? "LE GUIDE" : "THE GUIDE",
      concepts: [
        { name: lang === "fr" ? "La carte complète" : "The complete map", prompt: `YouTube thumbnail, creator beside a clean visual map of ${topic} with one starting point and three connected milestones, forest green and warm ivory palette, authoritative editorial lighting, no text, no watermark`, art: "map" },
        { name: lang === "fr" ? "Le sujet isolé" : "The isolated subject", prompt: `YouTube thumbnail, one iconic subject representing ${topic} isolated at large scale in the center, creator small on the side pointing toward it, minimal premium composition, no text, no watermark`, art: "focus" },
        { name: lang === "fr" ? "La boîte à outils" : "The toolkit", prompt: `YouTube thumbnail, open toolkit containing three symbolic objects derived from ${topic}, creator presenting it with a calm expert expression, warm studio light, deep green background, no text, no watermark`, art: "toolkit" },
      ],
    },
  ];
  const meaningfulWords = Array.from(new Set(`${topic} ${profile.channel} ${profile.theme}`.toLowerCase().replace(/[^a-zà-ÿ0-9\s-]/gi, "").split(/\s+/).filter(word => word.length > 3))).slice(0, 10);
  const tags = Array.from(new Set([topic.toLowerCase(), `${topic.toLowerCase()} guide`, `${topic.toLowerCase()} tutoriel`, profile.channel.toLowerCase(), ...meaningfulWords, lang === "fr" ? "vidéo explicative" : "explainer video", lang === "fr" ? "guide pratique" : "practical guide"])).slice(0, 15);
  const improvedDescription = lang === "fr"
    ? `${topic} : cette vidéo présente une méthode claire à partir du contenu réellement expliqué.\n\nCE QUE TU VAS VOIR\n• L’idée centrale de la vidéo\n• La méthode ou le raisonnement présenté\n• Un point concret à retenir\n• Les limites et nuances mentionnées\n\nÀ NOTER\nCette description n’ajoute aucun chiffre, tarif, lien ou promesse absent du contenu fourni.\n\n${profile.offer}\n\n${profile.contacts}\n\nAbonne-toi pour recevoir les prochaines vidéos de ${profile.channel}.`
    : `${topic}: this video presents a clear method using only what was actually explained.\n\nWHAT YOU WILL SEE\n• The video’s central idea\n• The method or reasoning presented\n• One concrete takeaway\n• The limits and nuances mentioned\n\nPLEASE NOTE\nThis description adds no figure, price, link or promise absent from the supplied content.\n\n${profile.offer}\n\n${profile.contacts}\n\nSubscribe for the next videos from ${profile.channel}.`;
  const quizPrompts = lang === "fr"
    ? ["Quelle est l’idée centrale présentée dans la vidéo ?", "Quel problème ou besoin est expliqué ?", "Quelle méthode ou solution est proposée ?", "Quel exemple ou argument faut-il retenir ?", "Quelle limite ou nuance est mentionnée ?"]
    : ["What is the central idea presented in the video?", "What problem or need is explained?", "What method or solution is proposed?", "What example or argument should viewers remember?", "What limit or nuance is mentioned?"];
  const quiz = quizPrompts.map((question, index) => ({ question, answer: sourceSentences[index] || sourceSentences[0] || value.source }));
  const update = (patch: Partial<ExpressState>) => setValue({ ...value, ...patch });
  const generate = () => {
    if (value.source.trim().length < 80) return showToast(lang === "fr" ? "Ajoutez au moins 80 caractères de contenu." : "Add at least 80 characters of content.");
    if (!profile.vidiqConnected) return showToast(lang === "fr" ? "Connectez d’abord votre compte vidIQ dans le Profil de chaîne." : "Connect your vidIQ account in Channel profile first.");
    setLoading(true);
    setTimeout(() => { update({ generated: true, thumbnailsGenerated: false, vidiqScores: {}, vidiqStatus: "idle" }); setLoading(false); }, 650);
  };
  const syncVidiqScores = async () => {
    update({ vidiqStatus: "loading" });
    try {
      const response = await fetch("/api/vidiq-score", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ titles: options.map(option => ({ id: option.id, title: option.title })) }) });
      const data = await response.json() as { scores?: Record<string, number>; error?: string };
      if (!response.ok || !data.scores) throw new Error(data.error || "vidiq_unavailable");
      update({ vidiqScores: data.scores, vidiqStatus: "synced" });
      showToast(lang === "fr" ? "Scores vidIQ synchronisés" : "vidIQ scores synced");
    } catch {
      update({ vidiqStatus: "error" });
      showToast(lang === "fr" ? "Connexion vidIQ indisponible. Aucun score n’a été estimé." : "vidIQ connection unavailable. No score was estimated.");
    }
  };
  const generateThumbnails = () => {
    setLoading(true);
    setTimeout(() => { update({ thumbnailsGenerated: true }); setLoading(false); }, 850);
  };
  const downloadThumbnail = (option: typeof options[number], conceptIndex: number) => {
    const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const palettes = [["#10251d", "#d95d2b"], ["#17221f", "#e2a565"], ["#0f2d23", "#d9efe2"]];
    const [background, accent] = palettes[conceptIndex];
    ctx.fillStyle = background; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = accent; ctx.fillRect(0, 0, 24, 720);
    ctx.globalAlpha = .14; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(960, 350, 265, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = "#f7f8f5"; ctx.beginPath(); ctx.arc(960, 278, 105, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(820, 395, 280, 210);
    ctx.fillStyle = accent; ctx.fillRect(760, 570, 400, 18);
    ctx.fillStyle = "#f7f8f5"; ctx.font = "900 34px Arial"; ctx.fillText(profile.channel.toUpperCase(), 86, 105);
    ctx.font = "900 68px Arial"; wrapCanvasText(ctx, option.overlay, 86, 310, 600, 78);
    ctx.fillStyle = accent; ctx.font = "700 28px Arial"; ctx.fillText(option.concepts[conceptIndex].name.toUpperCase(), 88, 585);
    ctx.fillStyle = "#f7f8f5"; ctx.font = "500 21px Arial"; wrapCanvasText(ctx, topic, 88, 635, 620, 28);
    const link = document.createElement("a"); link.download = `miniature-${option.id.toLowerCase()}-${conceptIndex + 1}.png`; link.href = canvas.toDataURL("image/png"); link.click();
  };

  if (!value.generated) return <div className="express-page"><div className="express-hero"><div><span className="eyebrow">{lang === "fr" ? "VIDÉO DÉJÀ TOURNÉE" : "VIDEO ALREADY RECORDED"}</span><h1>{lang === "fr" ? "Du contenu au clic." : "From content to click."}</h1><p>{lang === "fr" ? "Collez votre script ou votre description. Script Studio prépare le test A/B, les concepts de miniature et les quiz — sans réécrire la vidéo." : "Paste your script or description. Script Studio prepares the A/B test, thumbnail concepts and quizzes — without rewriting the video."}</p></div><div className="express-orbit"><span>3×3</span><small>{lang === "fr" ? "titres × concepts" : "titles × concepts"}</small></div></div><section className="express-input-card"><div className={`vidiq-requirement ${profile.vidiqConnected ? "connected" : ""}`}><span>{profile.vidiqConnected ? "✓" : "!"}</span><div><strong>{profile.vidiqConnected ? (lang === "fr" ? "Compte vidIQ connecté" : "vidIQ account connected") : (lang === "fr" ? "Connexion vidIQ requise" : "vidIQ connection required")}</strong><small>{lang === "fr" ? "Les scores de titres seront repris tels quels depuis vidIQ — jamais estimés." : "Title scores will be reported exactly as returned by vidIQ — never estimated."}</small></div></div><div className="source-toggle"><button className={value.inputType === "script" ? "active" : ""} onClick={() => update({ inputType: "script", generated: false })}>▤ {lang === "fr" ? "J’ai le script" : "I have the script"}<small>{lang === "fr" ? "Inclut 5 quiz" : "Includes 5 quizzes"}</small></button><button className={value.inputType === "description" ? "active" : ""} onClick={() => update({ inputType: "description", generated: false })}>≡ {lang === "fr" ? "J’ai la description" : "I have the description"}<small>{lang === "fr" ? "Packaging uniquement" : "Packaging only"}</small></button></div><label><span>{lang === "fr" ? "Sujet de la vidéo (facultatif)" : "Video topic (optional)"}</span><input value={value.subject} onChange={event => update({ subject: event.target.value, generated: false })} placeholder={lang === "fr" ? "Le système le déduira du contenu si ce champ est vide" : "The system will infer it from the content if left blank"} /></label><label><span>{value.inputType === "script" ? (lang === "fr" ? "Script complet" : "Full script") : (lang === "fr" ? "Description existante" : "Existing description")}</span><textarea value={value.source} onChange={event => update({ source: event.target.value, generated: false })} rows={13} placeholder={lang === "fr" ? "Collez ici le contenu exact de la vidéo…" : "Paste the exact video content here…"} /></label><div className="input-footer"><span>◆ {lang === "fr" ? "Seules les informations collées seront utilisées" : "Only pasted information will be used"}</span><button className="primary express-generate" onClick={generate} disabled={loading || !profile.vidiqConnected}>{loading ? (lang === "fr" ? "Analyse…" : "Analyzing…") : (lang === "fr" ? "Générer le packaging" : "Generate packaging")} →</button></div></section></div>;

  return <div className="express-page results"><div className="express-result-head"><div><button onClick={() => update({ generated: false, thumbnailsGenerated: false })}>← {lang === "fr" ? "Modifier la source" : "Edit source"}</button><span className="eyebrow">{lang === "fr" ? "PACKAGING EXPRESS" : "EXPRESS PACKAGING"}</span><h1>{topic}</h1></div><div className="result-status"><span>✓</span><div><strong>{lang === "fr" ? "Analyse terminée" : "Analysis complete"}</strong><small>{value.inputType === "script" ? (lang === "fr" ? "Script + quiz" : "Script + quiz") : (lang === "fr" ? "Description seule" : "Description only")}</small></div></div></div><section className="express-section"><div className="express-section-title"><span>01</span><div><h2>{lang === "fr" ? "Tests A/B/C" : "A/B/C tests"}</h2><p>{lang === "fr" ? "Choisissez un concept visuel pour chaque paire titre–description." : "Choose one visual concept for each title–description pair."}</p></div><button className={`vidiq-sync ${value.vidiqStatus || "idle"}`} onClick={syncVidiqScores} disabled={value.vidiqStatus === "loading"}>{value.vidiqStatus === "loading" ? (lang === "fr" ? "Synchronisation…" : "Syncing…") : (lang === "fr" ? "Synchroniser les scores vidIQ" : "Sync vidIQ scores")}</button></div><div className="ab-options">{options.map(option => <article className="ab-option" key={option.id}><div className="ab-option-head"><span>OPTION {option.id}</span><small>{option.register}</small></div><div className={`vidiq-score ${value.vidiqScores?.[option.id] !== undefined ? "ready" : "pending"}`}><b>{value.vidiqScores?.[option.id] ?? "—"}</b><span>{value.vidiqScores?.[option.id] !== undefined ? "/100 · vidIQ" : (lang === "fr" ? "score vidIQ en attente" : "vidIQ score pending")}</span></div><h3>{option.title}</h3><p>{option.description}</p><div className="copy-row"><button onClick={() => copy(option.title)}>⧉ {lang === "fr" ? "Titre" : "Title"}</button><button onClick={() => copy(option.description)}>⧉ Description</button></div><div className="concept-list"><strong>{lang === "fr" ? "3 concepts de miniature" : "3 thumbnail concepts"}</strong>{option.concepts.map((concept, index) => <button className={value.selected[option.id] === index ? "selected" : ""} key={concept.name} onClick={() => update({ selected: { ...value.selected, [option.id]: index }, thumbnailsGenerated: false })}><span>{value.selected[option.id] === index ? "✓" : index + 1}</span><div><b>{concept.name}</b><small>{concept.prompt}</small></div></button>)}</div></article>)}</div><div className="vidiq-truth-note">◆ {value.vidiqStatus === "error" ? (lang === "fr" ? "vidIQ n’a renvoyé aucun score. Aucun score de remplacement n’est affiché." : "vidIQ returned no score. No replacement score is displayed.") : (lang === "fr" ? "Les valeurs vidIQ sont affichées telles quelles, sans arrondi ni estimation locale." : "vidIQ values are shown exactly as returned, with no rounding or local estimate.")}</div><button className="primary thumbnail-cta" onClick={generateThumbnails} disabled={loading}>✦ {loading ? (lang === "fr" ? "Génération…" : "Generating…") : (lang === "fr" ? "Générer les 3 miniatures choisies" : "Generate the 3 selected thumbnails")}</button></section>{value.thumbnailsGenerated && <section className="express-section generated-thumbnails"><div className="express-section-title"><span>02</span><div><h2>{lang === "fr" ? "Miniatures générées" : "Generated thumbnails"}</h2><p>{lang === "fr" ? "Téléchargez les fichiers PNG au format YouTube 1280 × 720." : "Download PNG files in YouTube’s 1280 × 720 format."}</p></div></div><div className="thumbnail-grid">{options.map(option => { const conceptIndex = value.selected[option.id] ?? 0; return <div key={option.id} className={`thumbnail-preview art-${option.concepts[conceptIndex].art}`}><div className="thumb-brand">{profile.channel}</div><div className="thumb-copy"><strong>{option.overlay}</strong><small>{option.concepts[conceptIndex].name}</small></div><div className="thumb-person"><i /><span /></div><button onClick={() => downloadThumbnail(option, conceptIndex)}>↓ PNG · 1280 × 720</button></div>; })}</div></section>}<section className="express-section"><div className="express-section-title"><span>{value.thumbnailsGenerated ? "03" : "02"}</span><div><h2>{lang === "fr" ? "Description améliorée & tags" : "Improved description & tags"}</h2><p>{lang === "fr" ? "Prêts à copier dans YouTube Studio." : "Ready to paste into YouTube Studio."}</p></div></div><div className="delivery-grid"><div className="delivery-card"><div><strong>{lang === "fr" ? "DESCRIPTION AMÉLIORÉE" : "IMPROVED DESCRIPTION"}</strong><button onClick={() => copy(improvedDescription)}>⧉ {lang === "fr" ? "Copier" : "Copy"}</button></div><pre>{improvedDescription}</pre></div><div className="delivery-card tags-card"><div><strong>TAGS</strong><button onClick={() => copy(tags.join(", "))}>⧉ {lang === "fr" ? "Copier tout" : "Copy all"}</button></div><div>{tags.map(tag => <span key={tag}>{tag}</span>)}</div></div></div></section>{value.inputType === "script" && <section className="express-section"><div className="express-section-title"><span>{value.thumbnailsGenerated ? "04" : "03"}</span><div><h2>{lang === "fr" ? "5 questions / réponses Quiz" : "5 quiz questions / answers"}</h2><p>{lang === "fr" ? "Les réponses reprennent uniquement des passages du script fourni." : "Answers only reuse passages from the supplied script."}</p></div></div><div className="quiz-list">{quiz.map((item, index) => <article key={item.question}><span>{index + 1}</span><div><strong>{item.question}</strong><p>{item.answer}</p></div><button onClick={() => copy(`${item.question}\n${item.answer}`)}>⧉</button></article>)}</div></section>}</div>;
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" "); let line = ""; let currentY = y;
  for (const word of words) { const test = `${line}${word} `; if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line.trim(), x, currentY); line = `${word} `; currentY += lineHeight; } else line = test; }
  if (line) ctx.fillText(line.trim(), x, currentY);
}

function Packaging({ project, updateProject, lang, t, copy }: { project: Project; updateProject: (p: Partial<Project>) => void; lang: Lang; t: (typeof labels)[Lang]; copy: (v: string) => void }) {
  const a = project.packageAnswers; const setAnswer = (key: keyof typeof a, value: string) => updateProject({ packageAnswers: { ...a, [key]: value } });
  const complete = a.visual && a.timecodes && a.links;
  const packs = [
    { letter: "A", reg: lang === "fr" ? "Bascule émotionnelle" : "Emotional shift", title: lang === "fr" ? "IA sur WhatsApp : arrête de tout faire seul" : "AI on WhatsApp: stop doing everything alone", overlay: "GARDE LE CONTRÔLE", score: 86 },
    { letter: "B", reg: lang === "fr" ? "Résultat concret" : "Concrete result", title: lang === "fr" ? "Automatiser WhatsApp sans perdre ses clients" : "Automate WhatsApp without losing customers", overlay: "RÉPONDS PLUS VITE", score: 91 },
    { letter: "C", reg: lang === "fr" ? "Vidéo de référence" : "Reference video", title: lang === "fr" ? "Le guide de l’IA pour WhatsApp Business" : "The guide to AI for WhatsApp Business", overlay: "LE GUIDE", score: 84 },
  ];
  return <><StageHead n={7} title={t.steps[6]} desc={lang === "fr" ? "Trois options complètes, prêtes à tester dans YouTube Studio." : "Three complete options, ready to test in YouTube Studio."} />{!complete ? <><div className="stop-banner"><span>Ⅱ</span><div><strong>{lang === "fr" ? "3 réponses obligatoires" : "3 required answers"}</strong><p>{lang === "fr" ? "Aucun concept, timecode, lien ou tarif ne sera inventé." : "No concept, timecode, link or price will be invented."}</p></div></div><div className="question-grid"><Question n="1" label={lang === "fr" ? "Concept visuel retenu" : "Chosen visual concept"} value={a.visual} set={v => setAnswer("visual", v)} placeholder={lang === "fr" ? "Ex. visage surpris à gauche, téléphone à droite" : "E.g. surprised face left, phone right"} /><Question n="2" label={lang === "fr" ? "Timecodes réels" : "Real timecodes"} value={a.timecodes} set={v => setAnswer("timecodes", v)} placeholder="00:00 Intro · 01:15 …" /><Question n="3" label={lang === "fr" ? "Liens et tarifs confirmés" : "Confirmed links and prices"} value={a.links} set={v => setAnswer("links", v)} placeholder={lang === "fr" ? "Collez uniquement les informations confirmées" : "Paste confirmed information only"} /></div></> : <><div className="ab-note">ⓘ {lang === "fr" ? "YouTube ne teste qu’une variable à la fois : titres OU miniatures." : "YouTube tests one variable at a time: titles OR thumbnails."}</div><div className="pack-grid">{packs.map(pack => <div className="pack-card" key={pack.letter}><div className="pack-top"><span>OPTION {pack.letter}</span><small>{pack.reg}</small></div><h3>{pack.title}</h3><div className="score"><span style={{ width: `${pack.score}%` }} /><b>{pack.score}/100</b><small>{lang === "fr" ? "score estimé" : "estimated score"}</small></div><div className="overlay"><small>OVERLAY</small><strong>{pack.overlay}</strong></div><button onClick={() => copy(`${pack.title}\n${pack.overlay}\n${a.visual}\nno text, no watermark`)}>⧉ {t.copy}</button></div>)}</div><div className="publish-section"><h3>{lang === "fr" ? "Checklist de publication" : "Publishing checklist"}</h3>{["Titre", "Description & liens", "Miniature à 120 px", "Chapitres", "Sous-titres", "Commentaire épinglé", "Test A/B", "CTR à 24–48 h"].map(x => <label key={x}><input type="checkbox" />{x}</label>)}</div></>}</>;
}
function Question({ n, label, value, set, placeholder }: { n: string; label: string; value: string; set: (v: string) => void; placeholder: string }) { return <label className="question"><span>{n}</span><strong>{label}</strong><textarea value={value} onChange={e => set(e.target.value)} placeholder={placeholder} rows={3} /></label>; }

function Projects({ projects, activeId, lang, t, open, create }: { projects: Project[]; activeId: string; lang: Lang; t: (typeof labels)[Lang]; open: (id: string) => void; create: () => void }) { return <div className="page-view"><div className="page-title"><div><span className="eyebrow">{t.overview}</span><h1>{t.projects}</h1><p>{lang === "fr" ? "Toutes vos vidéos, de l’idée à la publication." : "All your videos, from idea to publication."}</p></div><button className="primary" onClick={create}>＋ {t.newVideo}</button></div><div className="stats"><div><strong>{projects.length}</strong><span>{lang === "fr" ? "projets actifs" : "active projects"}</span></div><div><strong>{projects.filter(p => p.completed.includes(7)).length}</strong><span>{lang === "fr" ? "prêts à publier" : "ready to publish"}</span></div><div><strong>{projects.filter(p => p.status.includes("cours") || p.status.includes("progress")).length}</strong><span>{lang === "fr" ? "scripts en cours" : "scripts in progress"}</span></div></div><div className="project-table"><div className="table-head"><span>{t.project}</span><span>{t.status}</span><span>{t.updated}</span><span /></div>{projects.map(p => <button key={p.id} onClick={() => open(p.id)} className={p.id === activeId ? "current" : ""}><span className="project-name"><i>{p.title.charAt(0)}</i><span><strong>{p.title}</strong><small>{p.subject}</small></span></span><span><b className="status-pill">{p.status}</b></span><span>{p.updated}</span><span>→</span></button>)}</div></div>; }

function formatTokenPrice(perToken: number) {
  const perMillion = perToken * 1_000_000;
  if (perMillion === 0) return "$0";
  return `$${perMillion < 0.01 ? perMillion.toFixed(4) : perMillion < 1 ? perMillion.toFixed(2) : perMillion.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

async function optimizeReferenceImage(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / bitmap.width, 900 / bitmap.height);
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

function ProfilePageAI({ profile, setProfile, lang, t, aiSettings, setAiSettings, openRouterModels, referenceThumbnails, reloadReferences, showToast, done }: {
  profile: Profile; setProfile: (p: Profile) => void; lang: Lang; t: (typeof labels)[Lang];
  aiSettings: AiSettings; setAiSettings: (settings: AiSettings) => void; openRouterModels: OpenRouterModel[];
  referenceThumbnails: ReferenceThumbnail[]; reloadReferences: () => void; showToast: (message: string) => void; done: () => void;
}) {
  const field = (key: keyof Profile, value: string | boolean) => setProfile({ ...profile, [key]: value });
  const selectedModel = openRouterModels.find(model => model.id === aiSettings.openrouterModel);
  const writerModels = openRouterModels.filter(supportsHighReasoning);
  const selectedWriterModel = writerModels.find(model => model.id === aiSettings.writerModel);
  const visionModels = openRouterModels.filter(model => model.supportsImages);
  const selectedVisionModel = visionModels.find(model => model.id === aiSettings.visionModel);
  const [styleLoading, setStyleLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [iteration, setIteration] = useState("");
  const [openRouterKeyStatus, setOpenRouterKeyStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [openRouterKeyLabel, setOpenRouterKeyLabel] = useState("");
  const validateOpenRouterKey = async () => {
    if (!aiSettings.openrouterKey.trim()) return showToast(lang === "fr" ? "Ajoutez d’abord une clé OpenRouter." : "Add an OpenRouter key first.");
    setOpenRouterKeyStatus("loading");
    try {
      const response = await fetch("/api/openrouter-key", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey: aiSettings.openrouterKey }) });
      const data = await response.json() as { valid?: boolean; label?: string; error?: string };
      if (!response.ok || !data.valid) throw new Error(data.error || "key_rejected");
      setOpenRouterKeyStatus("valid");
      setOpenRouterKeyLabel(data.label ?? "OpenRouter");
      showToast(lang === "fr" ? "Clé OpenRouter valide" : "OpenRouter key is valid");
    } catch {
      setOpenRouterKeyStatus("invalid");
      setOpenRouterKeyLabel("");
      showToast(lang === "fr" ? "OpenRouter refuse cette clé. Vérifiez-la ou créez-en une nouvelle." : "OpenRouter rejected this key. Check it or create a new one.");
    }
  };
  const uploadReferences = async (files: FileList | null) => {
    if (!files?.length) return;
    const available = 4 - referenceThumbnails.length;
    if (available <= 0) return showToast(lang === "fr" ? "Maximum 4 miniatures de référence." : "Maximum 4 reference thumbnails.");
    setUploading(true);
    try {
      const form = new FormData();
      for (const file of Array.from(files).slice(0, available)) form.append("files", await optimizeReferenceImage(file));
      const response = await fetch("/api/reference-thumbnails", { method: "POST", body: form });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "upload_failed");
      reloadReferences();
      showToast(lang === "fr" ? "Miniatures de référence ajoutées" : "Reference thumbnails added");
    } catch (error) { showToast(lang === "fr" ? `Import impossible : ${error instanceof Error ? error.message : "erreur"}` : `Upload failed: ${error instanceof Error ? error.message : "error"}`); }
    finally { setUploading(false); }
  };
  const deleteReference = async (reference: ReferenceThumbnail) => {
    const response = await fetch(`/api/reference-thumbnails?key=${encodeURIComponent(reference.key)}`, { method: "DELETE" });
    if (response.ok) { reloadReferences(); showToast(lang === "fr" ? "Référence supprimée" : "Reference removed"); }
  };
  const generateEditorialPrompt = async (iterate = false) => {
    if (!aiSettings.openrouterKey || !aiSettings.visionModel) return showToast(lang === "fr" ? "Ajoutez la clé OpenRouter et choisissez un modèle vision." : "Add an OpenRouter key and choose a vision model.");
    if (!referenceThumbnails.length) return showToast(lang === "fr" ? "Ajoutez d’abord une miniature de référence." : "Add a reference thumbnail first.");
    setStyleLoading(true);
    try {
      const response = await fetch("/api/reference-style", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey: aiSettings.openrouterKey, model: aiSettings.visionModel, referenceKeys: referenceThumbnails.map(reference => reference.key), currentPrompt: iterate ? profile.thumbnailSystemPrompt : "", instruction: iterate ? iteration : "", language: lang, profile: { channel: profile.channel, theme: profile.theme, audience: profile.audience, tone: profile.tone } }) });
      const data = await response.json() as { prompt?: string; error?: string; detail?: string };
      if (!response.ok || !data.prompt) throw new Error(data.detail || data.error || "analysis_failed");
      field("thumbnailSystemPrompt", data.prompt);
      setIteration("");
      showToast(iterate ? (lang === "fr" ? "Prompt système amélioré" : "System prompt improved") : (lang === "fr" ? "ADN visuel généré" : "Visual DNA generated"));
    } catch (error) { showToast(`OpenRouter : ${error instanceof Error ? error.message : "analyse impossible"}`); }
    finally { setStyleLoading(false); }
  };
  return <div className="page-view profile-page"><div className="page-title"><div><span className="eyebrow">{lang === "fr" ? "PERSONNALISATION & IA" : "PERSONALIZATION & AI"}</span><h1>{t.channelProfile}</h1><p>{lang === "fr" ? "Configurez les modèles utilisés pour les scripts longs, le packaging et les miniatures." : "Configure the models used for long-form scripts, packaging, and thumbnails."}</p></div><button className="primary" onClick={done}>{t.saveProfile}</button></div>
    <section className="form-section ai-settings-section"><div className="section-heading"><div><h2>{lang === "fr" ? "Clés IA & modèles" : "AI keys & models"}</h2><p>{lang === "fr" ? "Les prix OpenRouter sont récupérés en direct et affichés par million de jetons." : "OpenRouter prices are fetched live and shown per million tokens."}</p></div><span className={`session-badge ${aiSettings.rememberKeys ? "remembered" : ""}`}>⌕ {aiSettings.rememberKeys ? (lang === "fr" ? "MÉMORISÉ SUR CET APPAREIL" : "REMEMBERED ON THIS DEVICE") : (lang === "fr" ? "SESSION UNIQUEMENT" : "SESSION ONLY")}</span></div>
      <div className="credential-grid">
        <div className="credential-card"><span className="provider-mark openrouter-mark">OR</span><strong>OpenRouter</strong><small>{lang === "fr" ? "Scripts longs, titres, descriptions, tags, prompts et quiz" : "Long scripts, titles, descriptions, tags, prompts, and quizzes"}</small><label className="field-label" htmlFor="openrouter-api-key">API KEY</label><input id="openrouter-api-key" type="password" autoComplete="off" spellCheck={false} value={aiSettings.openrouterKey} onChange={event => { setAiSettings({ ...aiSettings, openrouterKey: event.target.value }); setOpenRouterKeyStatus("idle"); }} placeholder="sk-or-v1-••••••••" /><div className="credential-status-row"><em className={openRouterKeyStatus === "invalid" ? "invalid" : aiSettings.openrouterKey ? "present" : ""}>● {openRouterKeyStatus === "valid" ? `${lang === "fr" ? "Clé valide" : "Valid key"}${openRouterKeyLabel ? ` · ${openRouterKeyLabel}` : ""}` : openRouterKeyStatus === "invalid" ? (lang === "fr" ? "Clé refusée par OpenRouter" : "Key rejected by OpenRouter") : aiSettings.openrouterKey ? (lang === "fr" ? "Clé saisie — test recommandé" : "Key entered — test recommended") : (lang === "fr" ? "Clé requise" : "Key required")}</em><button type="button" onClick={validateOpenRouterKey} disabled={openRouterKeyStatus === "loading" || !aiSettings.openrouterKey.trim()}>{openRouterKeyStatus === "loading" ? (lang === "fr" ? "Test…" : "Testing…") : (lang === "fr" ? "Tester la clé" : "Test key")}</button></div></div>
        <label className="credential-card"><span className="provider-mark openai-mark">AI</span><strong>OpenAI Images</strong><small>{lang === "fr" ? "Génération réelle des miniatures PNG" : "Real PNG thumbnail generation"}</small><span className="field-label">API KEY</span><input type="password" autoComplete="off" spellCheck={false} value={aiSettings.openaiKey} onChange={event => setAiSettings({ ...aiSettings, openaiKey: event.target.value })} placeholder="sk-proj-••••••••" /><em className={aiSettings.openaiKey ? "present" : ""}>● {aiSettings.openaiKey ? (lang === "fr" ? "Clé présente en mémoire" : "Key held in memory") : (lang === "fr" ? "Clé requise pour les images" : "Key required for images")}</em></label>
      </div>
      <label className="remember-keys"><input type="checkbox" checked={aiSettings.rememberKeys} onChange={event => setAiSettings({ ...aiSettings, rememberKeys: event.target.checked })} /><span><strong>{lang === "fr" ? "Mémoriser mes clés sur cet appareil" : "Remember my keys on this device"}</strong><small>{lang === "fr" ? "Vous ne devrez plus les ressaisir après une actualisation. À activer uniquement sur votre appareil personnel." : "You will not need to enter them after a refresh. Enable only on your personal device."}</small></span></label>
      <div className="model-grid">
        <label className="writer-model-field"><span>{lang === "fr" ? "Scénarisation longue — modèle thinking" : "Long-form writing — thinking model"}</span><select value={aiSettings.writerModel} onChange={event => setAiSettings({ ...aiSettings, writerModel: event.target.value })}><option value="">{writerModels.length ? (lang === "fr" ? "Choisir un modèle puissant" : "Choose a powerful model") : (lang === "fr" ? "Aucun modèle thinking compatible" : "No compatible thinking model")}</option>{writerModels.map(model => <option key={model.id} value={model.id}>{model.id === "openai/gpt-5.6-sol" ? "★ " : ""}{model.name} · in {formatTokenPrice(model.inputPerToken)}/M · out {formatTokenPrice(model.outputPerToken)}/M</option>)}</select>{selectedWriterModel && <small><strong>{selectedWriterModel.id === "openai/gpt-5.6-sol" ? (lang === "fr" ? "Recommandé pour les scripts longs" : "Recommended for long-form scripts") : (lang === "fr" ? "Compatible scripts longs" : "Long-form compatible")}</strong> · {selectedWriterModel.contextLength ? `${Math.round(selectedWriterModel.contextLength / 1000)}k context` : "context n/a"} · {lang === "fr" ? "réflexion élevée activée automatiquement" : "high reasoning enabled automatically"}</small>}<em>{lang === "fr" ? "La réflexion consomme des jetons de sortie : le coût final dépend du raisonnement et de la longueur du script." : "Reasoning uses output tokens: final cost depends on thinking and script length."}</em></label>
        <label><span>{lang === "fr" ? "Modèle OpenRouter — packaging et hook" : "OpenRouter model — packaging and hook"}</span><select value={aiSettings.openrouterModel} onChange={event => setAiSettings({ ...aiSettings, openrouterModel: event.target.value })}><option value="">{openRouterModels.length ? (lang === "fr" ? "Choisir un modèle" : "Choose a model") : (lang === "fr" ? "Chargement du catalogue…" : "Loading catalog…")}</option>{openRouterModels.map(model => <option key={model.id} value={model.id}>{model.name} · in {formatTokenPrice(model.inputPerToken)}/M · out {formatTokenPrice(model.outputPerToken)}/M</option>)}</select>{selectedModel && <small>{selectedModel.id} · {selectedModel.contextLength ? `${Math.round(selectedModel.contextLength / 1000)}k context` : "context n/a"} · {lang === "fr" ? "tarifs OpenRouter en direct" : "live OpenRouter pricing"}</small>}</label>
        <label><span>{lang === "fr" ? "Modèle d’image OpenAI" : "OpenAI image model"}</span><select value={aiSettings.imageModel} onChange={event => setAiSettings({ ...aiSettings, imageModel: event.target.value as AiSettings["imageModel"] })}><option value="gpt-image-2">GPT Image 2 · texte in $5/M · image in $8/M · out $30/M</option><option value="gpt-image-1.5">GPT Image 1.5 (ancien) · texte in $5/M · image in $8/M · out $32/M</option></select><small>{lang === "fr" ? "GPT Image 2 est recommandé pour les nouvelles miniatures." : "GPT Image 2 is recommended for new thumbnails."}</small></label>
        <label><span>{lang === "fr" ? "Qualité de génération" : "Generation quality"}</span><select value={aiSettings.imageQuality} onChange={event => setAiSettings({ ...aiSettings, imageQuality: event.target.value as AiSettings["imageQuality"] })}><option value="low">Low · {lang === "fr" ? "économique" : "economy"}</option><option value="medium">Medium · {lang === "fr" ? "recommandé" : "recommended"}</option><option value="high">High · {lang === "fr" ? "qualité maximale" : "maximum quality"}</option></select><small>{lang === "fr" ? "Le coût réel dépend aussi de la résolution et du nombre de jetons image." : "Actual cost also depends on resolution and image-token usage."}</small></label>
      </div>
      <p className="privacy-note strong-privacy">⌕ {aiSettings.rememberKeys ? (lang === "fr" ? "Vos clés sont enregistrées uniquement dans le stockage local de ce navigateur. Elles ne sont jamais ajoutées aux projets ni à la base du site. Décochez l’option pour les effacer de cet appareil." : "Your keys are stored only in this browser's local storage. They are never added to projects or the site's database. Turn the option off to remove them from this device.") : (lang === "fr" ? "Vos clés restent uniquement en mémoire pendant cette session et disparaissent au rechargement." : "Your keys remain in memory only for this session and disappear on reload.")}</p>
    </section>
    <section className="form-section visual-style-section"><div className="section-heading"><div><h2>{lang === "fr" ? "ADN visuel des miniatures" : "Thumbnail visual DNA"}</h2><p>{lang === "fr" ? "Ajoutez jusqu’à 4 références. L’IA en extrait des règles éditoriales réutilisables sans copier une miniature précise." : "Add up to 4 references. AI extracts reusable editorial rules without copying a specific thumbnail."}</p></div><span className="reference-count">{referenceThumbnails.length}/4 {lang === "fr" ? "RÉFÉRENCES" : "REFERENCES"}</span></div>
      <div className="reference-grid">{referenceThumbnails.map(reference => <figure key={reference.key} className="reference-card"><img src={reference.url} alt={reference.name} /><figcaption title={reference.name}>{reference.name}</figcaption><button onClick={() => deleteReference(reference)} aria-label={`${lang === "fr" ? "Supprimer" : "Remove"} ${reference.name}`}>×</button></figure>)}{referenceThumbnails.length < 4 && <label className="reference-upload"><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={event => { uploadReferences(event.target.files); event.target.value = ""; }} /><span>＋</span><strong>{uploading ? (lang === "fr" ? "Import…" : "Uploading…") : (lang === "fr" ? "Ajouter des références" : "Add references")}</strong><small>PNG, JPG ou WebP · 4 max.</small></label>}</div>
      <div className="vision-controls"><label><span>{lang === "fr" ? "Modèle vision OpenRouter pour l’analyse" : "OpenRouter vision model for analysis"}</span><select value={aiSettings.visionModel} onChange={event => setAiSettings({ ...aiSettings, visionModel: event.target.value })}><option value="">{visionModels.length ? (lang === "fr" ? "Choisir un modèle vision" : "Choose a vision model") : (lang === "fr" ? "Chargement des modèles vision…" : "Loading vision models…")}</option>{visionModels.map(model => <option key={model.id} value={model.id}>{model.name} · in {formatTokenPrice(model.inputPerToken)}/M · out {formatTokenPrice(model.outputPerToken)}/M</option>)}</select>{selectedVisionModel && <small>{selectedVisionModel.id} · {lang === "fr" ? "entrée image compatible" : "image input supported"}</small>}</label><button className="primary" onClick={() => generateEditorialPrompt(false)} disabled={styleLoading || uploading || !referenceThumbnails.length}>{styleLoading ? (lang === "fr" ? "Analyse des références…" : "Analyzing references…") : (profile.thumbnailSystemPrompt ? (lang === "fr" ? "Régénérer depuis les références" : "Regenerate from references") : (lang === "fr" ? "Générer le prompt système" : "Generate system prompt"))}</button></div>
      <label className="system-prompt-editor"><span>{lang === "fr" ? "Prompt système éditorial — modifiable" : "Editorial system prompt — editable"}</span><textarea value={profile.thumbnailSystemPrompt ?? ""} onChange={event => field("thumbnailSystemPrompt", event.target.value)} rows={14} placeholder={lang === "fr" ? "Le prompt généré décrira la composition, la hiérarchie, les couleurs, la typographie, les visages, le contraste et les règles à éviter…" : "The generated prompt will describe composition, hierarchy, colors, typography, faces, contrast, and rules to avoid…"} /><small>{lang === "fr" ? "Vous pouvez tout modifier manuellement. Ce texte sera appliqué aux concepts et à chaque génération OpenAI." : "You can edit everything manually. This text is applied to concepts and every OpenAI generation."}</small></label>
      {profile.thumbnailSystemPrompt && <div className="prompt-iteration"><label><span>{lang === "fr" ? "Demander une amélioration" : "Request an improvement"}</span><input value={iteration} onChange={event => setIteration(event.target.value)} placeholder={lang === "fr" ? "Ex. plus de contraste, moins de texte, visages plus naturels…" : "E.g. more contrast, less text, more natural faces…"} /></label><button onClick={() => generateEditorialPrompt(true)} disabled={styleLoading || !iteration.trim()}>↻ {lang === "fr" ? "Itérer avec l’IA" : "Iterate with AI"}</button></div>}
      <p className="privacy-note">⌕ {lang === "fr" ? "Les références sont stockées dans votre espace privé. Elles servent à l’analyse et sont envoyées à OpenAI comme références lorsque vous générez une miniature." : "References are stored in your private workspace. They are used for analysis and sent to OpenAI as references when generating a thumbnail."}</p>
    </section>
    <section className="form-section protected description-footer-section"><div className="section-heading"><div><h2>{lang === "fr" ? "Bloc automatique de description" : "Automatic description block"}</h2><p>{lang === "fr" ? "Ajouté mot pour mot à la fin de chaque description améliorée." : "Added word for word at the end of every improved description."}</p></div><span>⌕ {lang === "fr" ? "AUTOMATIQUE" : "AUTOMATIC"}</span></div>
      <label className="description-footer-editor"><span>{lang === "fr" ? "Coordonnées, liens et appel à l’action" : "Contact details, links, and call to action"}</span><textarea value={profile.descriptionFooter ?? ""} onChange={event => field("descriptionFooter", event.target.value)} rows={5} placeholder={lang === "fr" ? "Ajoutez ici le texte qui doit apparaître automatiquement dans toutes vos descriptions…" : "Add the text that should automatically appear in all your descriptions…"} /><small>{lang === "fr" ? "Les sauts de ligne, emojis, numéros et liens sont conservés exactement. Laissez ce champ vide pour ne rien ajouter." : "Line breaks, emojis, phone numbers, and links are preserved exactly. Leave this empty to add nothing."}</small></label>
      <div className="description-footer-actions"><button type="button" onClick={() => field("descriptionFooter", profileDemo.descriptionFooter ?? "")}>{lang === "fr" ? "Restaurer le bloc Envol IA" : "Restore Envol IA block"}</button><span>{lang === "fr" ? "Ce bloc n’est jamais reformulé par l’IA." : "This block is never rewritten by AI."}</span></div>
    </section>
    <section className="form-section"><h2>{lang === "fr" ? "Identité éditoriale" : "Editorial identity"}</h2><div className="form-grid"><Field label={lang === "fr" ? "Nom de la chaîne" : "Channel name"} value={profile.channel} set={v => field("channel", v)} /><Field label={lang === "fr" ? "Thématique" : "Topic"} value={profile.theme} set={v => field("theme", v)} /><Field label={t.primaryLang} value={profile.primary} set={v => field("primary", v)} /><Field label={t.secondaryLang} value={profile.secondary} set={v => field("secondary", v)} /><Field label={t.audience} value={profile.audience} set={v => field("audience", v)} wide textarea /><Field label={t.tone} value={profile.tone} set={v => field("tone", v)} wide textarea /><Field label={t.duration} value={profile.duration} set={v => field("duration", v)} /></div></section>
    <section className="form-section protected"><div className="section-heading"><div><h2>{t.fixedText}</h2><p>{lang === "fr" ? "Le studio les reproduit exactement, sans reformulation." : "The studio reproduces these exactly, without rewriting."}</p></div><span>⌕ {lang === "fr" ? "PROTÉGÉ" : "PROTECTED"}</span></div><Field label={lang === "fr" ? "Texte de présentation" : "Introduction copy"} value={profile.presentation} set={v => field("presentation", v)} wide textarea /><div className="form-grid"><Field label={lang === "fr" ? "Phrase de lancement" : "Launch line"} value={profile.launch} set={v => field("launch", v)} /><Field label={lang === "fr" ? "Phrase de clôture" : "Closing line"} value={profile.closing} set={v => field("closing", v)} /></div></section>
    <section className="form-section"><h2>{t.integrations}</h2><div className="integration-grid"><Integration name="YouTube Data API v3" connected={profile.youtubeConnected} toggle={() => field("youtubeConnected", !profile.youtubeConnected)} t={t} /><Integration name="vidIQ" connected={profile.vidiqConnected} toggle={() => field("vidiqConnected", !profile.vidiqConnected)} t={t} /></div><p className="privacy-note">◆ {lang === "fr" ? "Les scores vidIQ restent des données externes : aucun score local n’est fabriqué." : "vidIQ scores remain external data: no local score is fabricated."}</p></section>
  </div>;
}

function ProfilePage({ profile, setProfile, lang, t, done }: { profile: Profile; setProfile: (p: Profile) => void; lang: Lang; t: (typeof labels)[Lang]; done: () => void }) { const field = (key: keyof Profile, value: string | boolean) => setProfile({ ...profile, [key]: value }); return <div className="page-view profile-page"><div className="page-title"><div><span className="eyebrow">{lang === "fr" ? "PERSONNALISATION" : "PERSONALIZATION"}</span><h1>{t.channelProfile}</h1><p>{lang === "fr" ? "Ce contexte guide chaque génération. Les textes fixes restent intouchables." : "This context guides every generation. Fixed copy remains untouched."}</p></div><button className="primary" onClick={done}>{t.saveProfile}</button></div><section className="form-section"><h2>{lang === "fr" ? "Identité éditoriale" : "Editorial identity"}</h2><div className="form-grid"><Field label={lang === "fr" ? "Nom de la chaîne" : "Channel name"} value={profile.channel} set={v => field("channel", v)} /><Field label={lang === "fr" ? "Thématique" : "Topic"} value={profile.theme} set={v => field("theme", v)} /><Field label={t.primaryLang} value={profile.primary} set={v => field("primary", v)} /><Field label={t.secondaryLang} value={profile.secondary} set={v => field("secondary", v)} /><Field label={t.audience} value={profile.audience} set={v => field("audience", v)} wide textarea /><Field label={t.tone} value={profile.tone} set={v => field("tone", v)} wide textarea /><Field label={t.duration} value={profile.duration} set={v => field("duration", v)} /></div></section><section className="form-section protected"><div className="section-heading"><div><h2>{t.fixedText}</h2><p>{lang === "fr" ? "Le studio les reproduit exactement, sans reformulation." : "The studio reproduces these exactly, without rewriting."}</p></div><span>⌕ {lang === "fr" ? "PROTÉGÉ" : "PROTECTED"}</span></div><Field label={lang === "fr" ? "Texte de présentation" : "Introduction copy"} value={profile.presentation} set={v => field("presentation", v)} wide textarea /><div className="form-grid"><Field label={lang === "fr" ? "Phrase de lancement" : "Launch line"} value={profile.launch} set={v => field("launch", v)} /><Field label={lang === "fr" ? "Phrase de clôture" : "Closing line"} value={profile.closing} set={v => field("closing", v)} /></div></section><section className="form-section"><h2>{t.integrations}</h2><div className="integration-grid"><Integration name="YouTube Data API v3" connected={profile.youtubeConnected} toggle={() => field("youtubeConnected", !profile.youtubeConnected)} t={t} /><Integration name="vidIQ" connected={profile.vidiqConnected} toggle={() => field("vidiqConnected", !profile.vidiqConnected)} t={t} /></div><p className="privacy-note">⌕ {lang === "fr" ? "Vos identifiants sont chiffrés, personnels et ne sont jamais réaffichés en clair." : "Your credentials are encrypted, personal and never shown again in plain text."}</p></section></div>; }
function Field({ label, value, set, wide, textarea }: { label: string; value: string; set: (v: string) => void; wide?: boolean; textarea?: boolean }) { return <label className={wide ? "wide" : ""}><span>{label}</span>{textarea ? <textarea value={value} onChange={e => set(e.target.value)} rows={4} /> : <input value={value} onChange={e => set(e.target.value)} />}</label>; }
function Integration({ name, connected, toggle, t }: { name: string; connected: boolean; toggle: () => void; t: (typeof labels)[Lang] }) { return <div className="integration"><span className="integration-icon">{name.charAt(0)}</span><div><strong>{name}</strong><small className={connected ? "connected" : ""}>● {connected ? t.connected : t.disconnected}</small></div><button onClick={toggle}>{connected ? t.disconnect : t.test}</button></div>; }
function Prompter({ script, title, close, t, copy }: { script: string; title: string; close: () => void; t: (typeof labels)[Lang]; copy: (v: string) => void }) { const [size, setSize] = useState(34); return <div className="prompter"><header><button onClick={close}>← {t.back}</button><strong>{title}</strong><div><button onClick={() => setSize(Math.max(22, size - 4))}>A−</button><button onClick={() => setSize(Math.min(58, size + 4))}>A＋</button><button onClick={() => copy(script)}>⧉ {t.copyScript}</button></div></header><article style={{ fontSize: `${size}px` }}>{script || "Le script apparaîtra ici après validation des étapes."}</article></div>; }

// Keep the original components available while persisted v1 workspaces are migrated.
void ExpressPackaging;
void ProfilePage;
