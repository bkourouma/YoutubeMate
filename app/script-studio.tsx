/* eslint-disable @next/next/no-img-element, jsx-a11y/label-has-associated-control */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Lang = "fr" | "en";
type View = "studio" | "express" | "projects" | "profile";
type StepState = "done" | "active" | "todo";
type HookIterationTarget = "hook" | "promise" | "both";

type Profile = {
  channel: string; theme: string; primary: string; secondary: string; audience: string;
  tone: string; presentation: string; launch: string; closing: string; contacts: string;
  offer: string; duration: string; youtubeConnected: boolean; vidiqConnected: boolean;
  thumbnailSystemPrompt?: string;
  descriptionFooter?: string;
};

type Project = {
  id: string; title: string; subject: string; status: string; updated: string; step: number;
  confirmed: boolean; completed: number[]; hook: string; promise: string; body: string;
  conclusion: string; reviewAccepted: boolean; hookGeneratedByAi?: boolean; packageAnswers: { visual: string; timecodes: string; links: string };
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
};
type ReferenceThumbnail = { key: string; name: string; contentType: string; size: number; uploadedAt: string; url: string };
type AiSettings = {
  openaiKey: string; openrouterKey: string; openrouterModel: string; visionModel: string;
  imageModel: "gpt-image-2" | "gpt-image-1.5"; imageQuality: "low" | "medium" | "high";
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
  { id: "ai-whatsapp", title: "Comment l’IA transforme WhatsApp Business", subject: "Comment utiliser l’IA pour mieux répondre aux clients sur WhatsApp Business", status: "Script en cours", updated: "Aujourd’hui, 14:32", step: 2, confirmed: true, completed: [1], hook: "Tu réponds encore à chaque client WhatsApp un par un ? Imagine un assistant qui prépare tes réponses, sans perdre ton ton ni promettre l’impossible. Voici la méthode.", promise: "À la fin de cette vidéo, tu sauras identifier les réponses à automatiser et celles qui doivent rester humaines. Tu repartiras avec une méthode simple à tester.", body: "", conclusion: "", reviewAccepted: false, packageAnswers: { visual: "", timecodes: "", links: "" } },
  { id: "prompts", title: "7 erreurs de prompt qui coûtent du temps", subject: "Erreurs de prompt", status: "Idée", updated: "Hier, 18:05", step: 1, confirmed: false, completed: [], hook: "", promise: "", body: "", conclusion: "", reviewAccepted: false, packageAnswers: { visual: "", timecodes: "", links: "" } },
  { id: "agents", title: "Agent IA : ce qu’il fait vraiment", subject: "Comprendre les agents IA", status: "Packagé", updated: "8 août, 09:12", step: 6, confirmed: true, completed: [1,2,3,4,5,6], hook: "", promise: "", body: "", conclusion: "", reviewAccepted: true, packageAnswers: { visual: "Créateur face à un mur de messages", timecodes: "00:00 Intro, 00:42 Problème, 03:10 Méthode, 07:25 Nuance", links: "allianceconsultants.net" } },
];

const labels = {
  fr: {
    projects: "Projets", studio: "Studio", express: "Packaging express", profile: "Profil de chaîne", newVideo: "Nouvelle vidéo", pilot: "Pilote automatique", saved: "Sauvegardé à l’instant", steps: ["Recherche & angle", "Hook & intro", "Corps du script", "Conclusion & CTA", "Relecture finale", "Packaging"],
    validate: "Valider l’étape", regenerate: "Régénérer", edit: "Modifier", copy: "Copier", words: "mots", seconds: "secondes", guard: "Garde-fous actifs", facts: "Aucune donnée inventée", fixed: "Textes fixes protégés", oral: "Écriture orale", sources: "Sources vérifiées uniquement", project: "Projet", script: "Prompteur", export: "Exporter", allProjects: "Tous les projets", continue: "Continuer", recent: "Projets récents", channelProfile: "Profil de chaîne", integrations: "Intégrations personnelles", connected: "Connecté", disconnected: "Non connecté", test: "Tester la connexion", disconnect: "Déconnecter", saveProfile: "Enregistrer le profil", primaryLang: "Langue principale", secondaryLang: "Langue secondaire", fixedText: "Textes fixes — protégés mot pour mot", audience: "Audience cible", tone: "Ton & style", duration: "Durée cible", close: "Fermer", download: "Télécharger le document", copyScript: "Copier le script", fullScreen: "Plein écran", back: "Retour au studio", status: "Statut", updated: "Dernière modification", noKey: "Recherche manuelle disponible", ready: "Prêt à tourner", mandatoryStop: "Arrêt obligatoire", answerToContinue: "Votre réponse est requise pour continuer.", launch: "Lancer la génération", overview: "Vue d’ensemble", addSubject: "Quel est le sujet exact de la vidéo ?", create: "Créer le projet", cancel: "Annuler"
  },
  en: {
    projects: "Projects", studio: "Studio", express: "Express packaging", profile: "Channel profile", newVideo: "New video", pilot: "Autopilot", saved: "Saved just now", steps: ["Research & angle", "Hook & intro", "Script body", "Conclusion & CTA", "Final review", "Packaging"],
    validate: "Approve step", regenerate: "Regenerate", edit: "Edit", copy: "Copy", words: "words", seconds: "seconds", guard: "Guardrails active", facts: "No invented data", fixed: "Fixed copy protected", oral: "Written for speech", sources: "Verified sources only", project: "Project", script: "Teleprompter", export: "Export", allProjects: "All projects", continue: "Continue", recent: "Recent projects", channelProfile: "Channel profile", integrations: "Personal integrations", connected: "Connected", disconnected: "Not connected", test: "Test connection", disconnect: "Disconnect", saveProfile: "Save profile", primaryLang: "Primary language", secondaryLang: "Secondary language", fixedText: "Fixed copy — protected word for word", audience: "Target audience", tone: "Tone & style", duration: "Target duration", close: "Close", download: "Download document", copyScript: "Copy script", fullScreen: "Full screen", back: "Back to studio", status: "Status", updated: "Last updated", noKey: "Manual research available", ready: "Ready to record", mandatoryStop: "Mandatory stop", answerToContinue: "Your answer is required to continue.", launch: "Start generation", overview: "Overview", addSubject: "What is the exact video topic?", create: "Create project", cancel: "Cancel"
  },
};

function wordCount(value: string) { return value.trim() ? value.trim().split(/\s+/).length : 0; }

export default function ScriptStudio() {
  const [lang, setLang] = useState<Lang>("fr");
  const [view, setView] = useState<View>("studio");
  const [profile, setProfile] = useState(profileDemo);
  const [projects, setProjects] = useState(demoProjects);
  const [express, setExpress] = useState<ExpressState>(expressDefault);
  const [aiSettings, setAiSettings] = useState<AiSettings>({ openaiKey: "", openrouterKey: "", openrouterModel: "", visionModel: "", imageModel: "gpt-image-2", imageQuality: "medium" });
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
  const [referenceThumbnails, setReferenceThumbnails] = useState<ReferenceThumbnail[]>([]);
  const [activeId, setActiveId] = useState(demoProjects[0].id);
  const [auto, setAuto] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [newOpen, setNewOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [prompter, setPrompter] = useState(false);
  const [toast, setToast] = useState("");
  const [studioAiLoading, setStudioAiLoading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = labels[lang];
  const project = projects.find(p => p.id === activeId) ?? projects[0];
  const loadReferenceThumbnails = useCallback(() => {
    fetch("/api/reference-thumbnails").then(response => response.json() as Promise<{ references?: ReferenceThumbnail[] }>).then(data => setReferenceThumbnails(data.references ?? [])).catch(() => null);
  }, []);

  useEffect(() => {
    const local = localStorage.getItem("script-studio-workspace");
    const localLang = localStorage.getItem("script-studio-lang") as Lang | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localLang === "fr" || localLang === "en") setLang(localLang);
    if (local) {
      try { const parsed = JSON.parse(local); setProfile({ ...profileDemo, ...(parsed.profile ?? {}) }); setProjects(parsed.projects ?? demoProjects); setActiveId(parsed.activeId ?? demoProjects[0].id); setExpress(parsed.express ?? expressDefault); } catch { /* retain demo */ }
    }
    fetch("/api/workspace").then(r => r.json() as Promise<{ payload?: { profile: Profile; projects: Project[]; activeId: string; express?: ExpressState } }>).then(data => {
      if (data.payload?.projects?.length) { setProfile({ ...profileDemo, ...data.payload.profile }); setProjects(data.payload.projects); setActiveId(data.payload.activeId); setExpress(data.payload.express ?? expressDefault); }
    }).catch(() => null).finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    fetch("/api/openrouter-models").then(response => response.json() as Promise<{ models?: OpenRouterModel[] }>).then(data => {
      const models = data.models ?? [];
      setOpenRouterModels(models);
      setAiSettings(current => ({
        ...current,
        openrouterModel: current.openrouterModel || models[0]?.id || "",
        visionModel: current.visionModel || models.find(model => model.supportsImages)?.id || "",
      }));
    }).catch(() => null);
  }, []);

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
  const showToast = (message: string) => { setToast(message); setTimeout(() => setToast(""), 1800); };
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); showToast(lang === "fr" ? "Copié dans le presse-papiers" : "Copied to clipboard"); };
  const script = [project.hook, profile.presentation, project.promise, profile.launch, project.body, project.conclusion].filter(Boolean).join("\n\n");

  const createProject = () => {
    if (!newSubject.trim()) return;
    const next: Project = { id: crypto.randomUUID(), title: newSubject.trim(), subject: newSubject.trim(), status: lang === "fr" ? "Idée" : "Idea", updated: lang === "fr" ? "À l’instant" : "Just now", step: 1, confirmed: false, completed: [], hook: "", promise: "", body: "", conclusion: "", reviewAccepted: false, packageAnswers: { visual: "", timecodes: "", links: "" } };
    setProjects(items => [next, ...items]); setActiveId(next.id); setNewSubject(""); setNewOpen(false); setView("studio");
  };

  const runHookAi = async (action: "generate" | "iterate", target: HookIterationTarget = "both", direction = "") => {
    if (studioAiLoading) return false;
    if (!aiSettings.openrouterKey || !aiSettings.openrouterModel) {
      showToast(lang === "fr" ? "Ajoutez votre clé OpenRouter et choisissez un modèle dans le profil." : "Add your OpenRouter key and choose a model in the profile.");
      return false;
    }
    setStudioAiLoading(true);
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
      const data = await response.json() as { result?: { hook?: string; promise?: string }; error?: string; detail?: string };
      if (!response.ok || !data.result?.hook || !data.result.promise) throw new Error(data.detail || data.error || "generation_failed");
      updateProject({
        hook: target === "promise" ? project.hook : data.result.hook,
        promise: target === "hook" ? project.promise : data.result.promise,
        hookGeneratedByAi: true,
      });
      showToast(action === "iterate" ? (lang === "fr" ? "Orientations appliquées par l’IA" : "AI applied your directions") : (lang === "fr" ? "Hook et promesse générés par l’IA" : "Hook and promise generated by AI"));
      return true;
    } catch (error) {
      showToast(lang === "fr" ? `OpenRouter : ${error instanceof Error ? error.message : "génération impossible"}` : `OpenRouter: ${error instanceof Error ? error.message : "generation failed"}`);
      return false;
    } finally { setStudioAiLoading(false); }
  };

  const generateStep = async () => {
    if (project.step === 1) { updateProject({ confirmed: true }); return; }
    if (project.step === 2) { await runHookAi("generate"); return; }
    if (project.step === 3) updateProject({ body: lang === "fr" ? `Le vrai problème n’est pas le manque d’outils. C’est de savoir où les placer dans ton travail.\n\nImagine un maquis à l’heure du déjeuner. La commande passe de la table à la cuisine, puis revient au client. L’IA, c’est le serveur qui prépare le trajet. Elle ne choisit pas le plat à la place du client.\n\nDans ton activité, commence par repérer une tâche répétitive : classer une demande, préparer un brouillon ou retrouver une information déjà fournie. Par exemple, imagine une entrepreneure qui reçoit chaque matin les mêmes questions sur ses horaires. Un assistant peut préparer la réponse. Elle garde la validation finale.\n\nMais attention : l’outil ne connaît pas une information que tu ne lui as pas donnée. Un tarif, une date ou une promesse non vérifiée doit rester « non vérifié ».\n\nEt c’est justement cette limite qui nous mène à la règle la plus importante.` : `The real problem is not a lack of tools. It is knowing where they belong in your work.\n\nImagine a busy café at lunch. The order moves from the table to the kitchen and back to the customer. AI is the waiter preparing that journey. It does not choose the meal for the customer.\n\nStart by spotting one repetitive task: sorting a request, drafting an answer or finding information already provided. Imagine a business owner receiving the same questions every morning. An assistant can prepare the answer. She keeps final approval.\n\nBut the tool cannot know information you have not provided. An unverified price, date or promise must remain “unverified”.\n\nThat limitation leads us to the most important rule.` });
    if (project.step === 4) updateProject({ conclusion: lang === "fr" ? `Nous avons pu identifier les tâches répétitives, poser une méthode simple et voir pourquoi la validation humaine reste indispensable.\n\nQuelle tâche te prend le plus de temps aujourd’hui ? Dis-le-moi en commentaire.\n\n${profile.closing}` : `We have identified repetitive tasks, set out a simple method and seen why human approval remains essential.\n\nWhich task takes most of your time today? Tell me in the comments.\n\n${profile.closing}` });
  };

  const validate = () => {
    if (project.step === 1 && !project.confirmed) return showToast(t.answerToContinue);
    if (project.step === 2 && (wordCount(project.hook) < 25 || wordCount(project.hook) > 40)) return showToast(lang === "fr" ? "Le hook doit contenir 25 à 40 mots." : "The hook must contain 25–40 words.");
    if (project.step === 3 && !project.body) return showToast(t.answerToContinue);
    if (project.step === 4 && !project.conclusion) return showToast(t.answerToContinue);
    if (project.step === 5 && !project.reviewAccepted) return showToast(t.answerToContinue);
    if (project.step === 6 && (!project.packageAnswers.visual || !project.packageAnswers.timecodes || !project.packageAnswers.links)) return showToast(t.answerToContinue);
    const completed = Array.from(new Set([...project.completed, project.step]));
    const nextStep = Math.min(6, project.step + 1);
    updateProject({ completed, step: nextStep, status: nextStep >= 6 ? (lang === "fr" ? "Packagé" : "Packaged") : (lang === "fr" ? "Script en cours" : "Script in progress") });
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
            {t.steps.map((label, index) => { const number = index + 1; const state: StepState = project.step === number ? "active" : project.completed.includes(number) ? "done" : "todo"; return <button key={label} className={`step ${state}`} onClick={() => updateProject({ step: number })}><span>{state === "done" ? "✓" : number}</span><small>{label}</small></button>; })}
          </section>
          <div className="workspace">
            <section className="editor"><Stage project={project} profile={profile} t={t} lang={lang} updateProject={updateProject} generate={generateStep} copy={copy} aiLoading={studioAiLoading} aiModel={aiSettings.openrouterModel} iterateHook={(target, direction) => runHookAi("iterate", target, direction)} />
              <div className="editor-actions"><button className="ghost" onClick={generateStep} disabled={studioAiLoading}>{studioAiLoading && project.step === 2 ? (lang === "fr" ? "L’IA travaille…" : "AI is working…") : `↻ ${t.regenerate}`}</button><button className="primary" onClick={validate} disabled={studioAiLoading}>{t.validate} <span>→</span></button></div>
            </section>
            <aside className="guard-panel"><div className="guard-title"><span>◆</span><div><strong>{t.guard}</strong><small>{lang === "fr" ? "Pour cette génération" : "For this generation"}</small></div></div><Guard label={t.facts} /><Guard label={t.fixed} /><Guard label={t.oral} /><Guard label={t.sources} /><hr /><div className="context-box"><small>{lang === "fr" ? "CONTEXTE ACTIF" : "ACTIVE CONTEXT"}</small><strong>{profile.channel}</strong><p>{profile.audience}</p><button onClick={() => setView("profile")}>{lang === "fr" ? "Voir le profil" : "View profile"} →</button></div></aside>
          </div>
        </>}
        {view === "projects" && <Projects projects={projects} activeId={activeId} lang={lang} t={t} open={id => { setActiveId(id); setView("studio"); }} create={() => setNewOpen(true)} />}
        {view === "express" && <ExpressPackagingAI value={express} setValue={setExpress} profile={profile} lang={lang} copy={copy} showToast={showToast} aiSettings={aiSettings} referenceThumbnails={referenceThumbnails} openAiSettings={() => setView("profile")} />}
        {view === "profile" && <ProfilePageAI profile={profile} setProfile={setProfile} lang={lang} t={t} aiSettings={aiSettings} setAiSettings={setAiSettings} openRouterModels={openRouterModels} referenceThumbnails={referenceThumbnails} reloadReferences={loadReferenceThumbnails} showToast={showToast} done={() => { showToast(lang === "fr" ? "Profil enregistré" : "Profile saved"); setView("studio"); }} />}
      </main>
      {newOpen && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title"><button className="modal-close" onClick={() => setNewOpen(false)}>×</button><span className="eyebrow">{lang === "fr" ? "NOUVEAU PROJET" : "NEW PROJECT"}</span><h2 id="new-project-title">{t.addSubject}</h2><p>{lang === "fr" ? "Soyez précis : le studio ne recherchera jamais une catégorie plus large." : "Be specific: the studio will never research a broader category."}</p><textarea value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder={lang === "fr" ? "Ex. Comment utiliser l’IA pour répondre aux clients sur WhatsApp Business" : "E.g. How to use AI to answer customers on WhatsApp Business"} /><div className="modal-actions"><button className="ghost" onClick={() => setNewOpen(false)}>{t.cancel}</button><button className="primary" onClick={createProject}>{t.create} →</button></div></div></div>}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: string; label: string; count?: number; onClick: () => void }) { return <button className={active ? "active" : ""} onClick={onClick}><span>{icon}</span>{label}{count !== undefined && <i>{count}</i>}</button>; }
function Guard({ label }: { label: string }) { return <div className="guard-item"><span>✓</span>{label}</div>; }

function Stage({ project, profile, t, lang, updateProject, generate, copy, aiLoading, aiModel, iterateHook }: { project: Project; profile: Profile; t: (typeof labels)[Lang]; lang: Lang; updateProject: (p: Partial<Project>) => void; generate: () => void; copy: (v: string) => void; aiLoading: boolean; aiModel: string; iterateHook: (target: HookIterationTarget, direction: string) => Promise<boolean> }) {
  const wc = wordCount(project.hook); const title = t.steps[project.step - 1];
  const [iterationTarget, setIterationTarget] = useState<HookIterationTarget>("both");
  const [hookDirection, setHookDirection] = useState("");
  const suggestions = lang === "fr" ? ["Plus direct", "Plus émotionnel", "Plus court", "Créer plus de curiosité"] : ["More direct", "More emotional", "Shorter", "Build more curiosity"];
  const applyHookDirection = async () => {
    if (!hookDirection.trim()) return;
    if (await iterateHook(iterationTarget, hookDirection.trim())) setHookDirection("");
  };
  if (project.step === 1) return <><StageHead n={1} title={title} desc={lang === "fr" ? "Confirmez le cadrage avant toute recherche." : "Confirm the scope before any research."} /><div className="chat-bubble"><span className="ai-avatar">S</span><div><small>Script Studio AI</small><p>{lang === "fr" ? `Pour confirmer : tu souhaites traiter exactement « ${project.subject} », sans élargir le sujet. C’est bien ça ?` : `To confirm: you want to cover exactly “${project.subject}”, without broadening the topic. Is that correct?`}</p></div></div>{!project.confirmed ? <button className="confirm-card" onClick={generate}>✓ {lang === "fr" ? "Oui, confirmer ce cadrage" : "Yes, confirm this scope"}</button> : <div className="result-card"><div className="result-head"><span>✓</span><div><strong>{lang === "fr" ? "Cadrage confirmé" : "Scope confirmed"}</strong><small>{profile.youtubeConnected ? "YouTube Data API" : t.noKey}</small></div></div><div className="position-grid"><Position tag="SÛR" title={lang === "fr" ? "La méthode pas à pas" : "The step-by-step method"} /><Position tag="DIFFÉRENCIANT" title={lang === "fr" ? "Ce qu’il faut garder humain" : "What must stay human"} /><Position tag="LOCAL" title={lang === "fr" ? "Cas concret pour l’audience" : "A real audience use case"} /></div><p className="note">{lang === "fr" ? "Aucune donnée de marché n’a été inventée. Collez une recherche externe ou connectez votre clé YouTube pour enrichir l’analyse." : "No market data was invented. Paste external research or connect your YouTube key to enrich the analysis."}</p></div>}</>;
  if (project.step === 2) return <><StageHead n={2} title={title} desc={lang === "fr" ? "Accrochez en 10–15 secondes, puis installez une promesse tenue." : "Hook viewers in 10–15 seconds, then set a promise you can keep."} />{!project.hook ? <EmptyGenerate onClick={generate} t={t} lang={lang} /> : <><div className={`ai-generated-note ${project.hookGeneratedByAi ? "verified" : "manual"}`}><span>{project.hookGeneratedByAi ? "✦" : "✎"}</span><div><strong>{project.hookGeneratedByAi ? (lang === "fr" ? "Contenu généré avec l’IA" : "AI-generated content") : (lang === "fr" ? "Version existante ou modifiée manuellement" : "Existing or manually edited version")}</strong><small>{project.hookGeneratedByAi ? `${aiModel || "OpenRouter"} · ${lang === "fr" ? "modifiable manuellement ou avec vos orientations" : "editable manually or with your directions"}` : (lang === "fr" ? "Régénérez ou utilisez vos orientations pour créer une nouvelle version avec OpenRouter." : "Regenerate or use your directions to create a new version with OpenRouter.")}</small></div></div><OutputBlock label="HOOK" value={project.hook} onChange={v => updateProject({ hook: v, hookGeneratedByAi: false })} copy={() => copy(project.hook)} meta={<><span className={wc > 40 ? "danger" : "good"}>{wc} / 40 {t.words}</span><span>≈ {Math.max(1, Math.round(wc / 2.7))} {t.seconds}</span></>} /><div className="locked-copy"><div><span>⌕</span><strong>{lang === "fr" ? "Présentation fixe" : "Fixed introduction"}</strong><small>{lang === "fr" ? "Protégée mot pour mot" : "Protected word for word"}</small></div><p>{profile.presentation}</p></div><OutputBlock label={lang === "fr" ? "PROMESSE" : "PROMISE"} value={project.promise} onChange={v => updateProject({ promise: v, hookGeneratedByAi: false })} copy={() => copy(project.promise)} /><div className="locked-line"><span>⌕</span>{profile.launch}</div><section className="hook-iteration"><div className="hook-iteration-head"><span>✦</span><div><h3>{lang === "fr" ? "Affiner avec l’IA" : "Refine with AI"}</h3><p>{lang === "fr" ? "Proposez une modification ou donnez une orientation précise. Les textes fixes resteront intacts." : "Suggest a change or give a precise direction. Fixed copy will remain unchanged."}</p></div></div><div className="iteration-targets" aria-label={lang === "fr" ? "Élément à modifier" : "Content to edit"}><button className={iterationTarget === "hook" ? "active" : ""} onClick={() => setIterationTarget("hook")}>Hook</button><button className={iterationTarget === "promise" ? "active" : ""} onClick={() => setIterationTarget("promise")}>{lang === "fr" ? "Promesse" : "Promise"}</button><button className={iterationTarget === "both" ? "active" : ""} onClick={() => setIterationTarget("both")}>{lang === "fr" ? "Les deux" : "Both"}</button></div><div className="direction-suggestions">{suggestions.map(suggestion => <button key={suggestion} onClick={() => setHookDirection(suggestion)}>＋ {suggestion}</button>)}</div><label><span>{lang === "fr" ? "Vos orientations" : "Your directions"}</span><textarea value={hookDirection} onChange={event => setHookDirection(event.target.value)} rows={3} placeholder={lang === "fr" ? "Ex. Commence par une question plus provocante, garde un ton simple et évite le mot automatiser…" : "E.g. Start with a more provocative question, keep it simple, and avoid the word automate…"} /></label><div className="hook-iteration-action"><small>{lang === "fr" ? "L’IA réécrit uniquement la partie sélectionnée." : "AI rewrites only the selected part."}</small><button className="primary" onClick={applyHookDirection} disabled={aiLoading || !hookDirection.trim()}>{aiLoading ? (lang === "fr" ? "Application…" : "Applying…") : (lang === "fr" ? "Appliquer mes orientations" : "Apply my directions")} →</button></div></section></>}</>;
  if (project.step === 3) return <><StageHead n={3} title={title} desc={lang === "fr" ? `Durée cible : ${profile.duration}. Une analogie centrale, une nuance honnête.` : `Target length: ${profile.duration}. One central analogy, one honest nuance.`} />{!project.body ? <EmptyGenerate onClick={generate} t={t} lang={lang} /> : <OutputBlock label={lang === "fr" ? "CORPS DU SCRIPT" : "SCRIPT BODY"} value={project.body} onChange={v => updateProject({ body: v })} copy={() => copy(project.body)} rows={17} meta={<span>{wordCount(project.body)} {t.words}</span>} />}</>;
  if (project.step === 4) return <><StageHead n={4} title={title} desc={lang === "fr" ? "Récapitulez uniquement ce qui a réellement été montré." : "Only recap what was actually shown."} />{!project.conclusion ? <EmptyGenerate onClick={generate} t={t} lang={lang} /> : <><OutputBlock label={lang === "fr" ? "CONCLUSION" : "CONCLUSION"} value={project.conclusion} onChange={v => updateProject({ conclusion: v })} copy={() => copy(project.conclusion)} rows={10} /><div className="locked-line"><span>⌕</span>{profile.closing}</div></>}</>;
  if (project.step === 5) return <><StageHead n={5} title={title} desc={lang === "fr" ? "Le relecteur signale les problèmes. Il ne réécrit rien sans votre accord." : "The reviewer flags issues. It rewrites nothing without your approval."} /><div className="stop-banner"><span>Ⅱ</span><div><strong>{t.mandatoryStop}</strong><p>{lang === "fr" ? "Même en Pilote automatique, vous décidez avant le packaging." : "Even in Autopilot, you decide before packaging."}</p></div></div><div className="review-list"><Review status="ok" label={lang === "fr" ? "Promesse tenue par le corps" : "Promise supported by the body"} /><Review status="ok" label={lang === "fr" ? "Analogie cohérente de bout en bout" : "Consistent analogy throughout"} /><Review status="ok" label={lang === "fr" ? "Aucun fait non vérifié ajouté" : "No unverified fact added"} /><Review status="warn" label={lang === "fr" ? "Le CTA pourrait être raccourci" : "The CTA could be shorter"} detail={lang === "fr" ? "Suggestion : conserver la question, puis la phrase fixe." : "Suggestion: keep the question, then the fixed closing."} /></div><label className="decision"><input type="checkbox" checked={project.reviewAccepted} onChange={e => updateProject({ reviewAccepted: e.target.checked })} /><span><strong>{lang === "fr" ? "J’accepte le verdict et la suggestion" : "I accept the verdict and suggestion"}</strong><small>{lang === "fr" ? "Cette décision déverrouille l’étape 6." : "This decision unlocks step 6."}</small></span></label></>;
  return <Packaging project={project} updateProject={updateProject} lang={lang} t={t} copy={copy} />;
}

function StageHead({ n, title, desc }: { n: number; title: string; desc: string }) { return <div className="stage-head"><span>ÉTAPE {n} / 6</span><h1>{title}</h1><p>{desc}</p></div>; }
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
      <div className={`ai-ready-strip ${configured && aiSettings.openaiKey ? "ready" : ""}`}><span>{configured && aiSettings.openaiKey ? "✓" : "!"}</span><div><strong>{configured && aiSettings.openaiKey ? (lang === "fr" ? "IA configurée pour cette session" : "AI configured for this session") : (lang === "fr" ? "Configuration IA requise" : "AI setup required")}</strong><small>{configured ? aiSettings.openrouterModel : (lang === "fr" ? "Clé OpenRouter + modèle requis" : "OpenRouter key + model required")} · {aiSettings.openaiKey ? aiSettings.imageModel : (lang === "fr" ? "clé OpenAI manquante" : "OpenAI key missing")}</small></div><button onClick={openAiSettings}>{lang === "fr" ? "Configurer" : "Configure"}</button></div>
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
  return <><StageHead n={6} title={t.steps[5]} desc={lang === "fr" ? "Trois options complètes, prêtes à tester dans YouTube Studio." : "Three complete options, ready to test in YouTube Studio."} />{!complete ? <><div className="stop-banner"><span>Ⅱ</span><div><strong>{lang === "fr" ? "3 réponses obligatoires" : "3 required answers"}</strong><p>{lang === "fr" ? "Aucun concept, timecode, lien ou tarif ne sera inventé." : "No concept, timecode, link or price will be invented."}</p></div></div><div className="question-grid"><Question n="1" label={lang === "fr" ? "Concept visuel retenu" : "Chosen visual concept"} value={a.visual} set={v => setAnswer("visual", v)} placeholder={lang === "fr" ? "Ex. visage surpris à gauche, téléphone à droite" : "E.g. surprised face left, phone right"} /><Question n="2" label={lang === "fr" ? "Timecodes réels" : "Real timecodes"} value={a.timecodes} set={v => setAnswer("timecodes", v)} placeholder="00:00 Intro · 01:15 …" /><Question n="3" label={lang === "fr" ? "Liens et tarifs confirmés" : "Confirmed links and prices"} value={a.links} set={v => setAnswer("links", v)} placeholder={lang === "fr" ? "Collez uniquement les informations confirmées" : "Paste confirmed information only"} /></div></> : <><div className="ab-note">ⓘ {lang === "fr" ? "YouTube ne teste qu’une variable à la fois : titres OU miniatures." : "YouTube tests one variable at a time: titles OR thumbnails."}</div><div className="pack-grid">{packs.map(pack => <div className="pack-card" key={pack.letter}><div className="pack-top"><span>OPTION {pack.letter}</span><small>{pack.reg}</small></div><h3>{pack.title}</h3><div className="score"><span style={{ width: `${pack.score}%` }} /><b>{pack.score}/100</b><small>{lang === "fr" ? "score estimé" : "estimated score"}</small></div><div className="overlay"><small>OVERLAY</small><strong>{pack.overlay}</strong></div><button onClick={() => copy(`${pack.title}\n${pack.overlay}\n${a.visual}\nno text, no watermark`)}>⧉ {t.copy}</button></div>)}</div><div className="publish-section"><h3>{lang === "fr" ? "Checklist de publication" : "Publishing checklist"}</h3>{["Titre", "Description & liens", "Miniature à 120 px", "Chapitres", "Sous-titres", "Commentaire épinglé", "Test A/B", "CTR à 24–48 h"].map(x => <label key={x}><input type="checkbox" />{x}</label>)}</div></>}</>;
}
function Question({ n, label, value, set, placeholder }: { n: string; label: string; value: string; set: (v: string) => void; placeholder: string }) { return <label className="question"><span>{n}</span><strong>{label}</strong><textarea value={value} onChange={e => set(e.target.value)} placeholder={placeholder} rows={3} /></label>; }

function Projects({ projects, activeId, lang, t, open, create }: { projects: Project[]; activeId: string; lang: Lang; t: (typeof labels)[Lang]; open: (id: string) => void; create: () => void }) { return <div className="page-view"><div className="page-title"><div><span className="eyebrow">{t.overview}</span><h1>{t.projects}</h1><p>{lang === "fr" ? "Toutes vos vidéos, de l’idée à la publication." : "All your videos, from idea to publication."}</p></div><button className="primary" onClick={create}>＋ {t.newVideo}</button></div><div className="stats"><div><strong>{projects.length}</strong><span>{lang === "fr" ? "projets actifs" : "active projects"}</span></div><div><strong>{projects.filter(p => p.completed.length >= 5).length}</strong><span>{lang === "fr" ? "prêts à publier" : "ready to publish"}</span></div><div><strong>{projects.filter(p => p.status.includes("cours") || p.status.includes("progress")).length}</strong><span>{lang === "fr" ? "scripts en cours" : "scripts in progress"}</span></div></div><div className="project-table"><div className="table-head"><span>{t.project}</span><span>{t.status}</span><span>{t.updated}</span><span /></div>{projects.map(p => <button key={p.id} onClick={() => open(p.id)} className={p.id === activeId ? "current" : ""}><span className="project-name"><i>{p.title.charAt(0)}</i><span><strong>{p.title}</strong><small>{p.subject}</small></span></span><span><b className="status-pill">{p.status}</b></span><span>{p.updated}</span><span>→</span></button>)}</div></div>; }

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
  const visionModels = openRouterModels.filter(model => model.supportsImages);
  const selectedVisionModel = visionModels.find(model => model.id === aiSettings.visionModel);
  const [styleLoading, setStyleLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [iteration, setIteration] = useState("");
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
  return <div className="page-view profile-page"><div className="page-title"><div><span className="eyebrow">{lang === "fr" ? "PERSONNALISATION & IA" : "PERSONALIZATION & AI"}</span><h1>{t.channelProfile}</h1><p>{lang === "fr" ? "Configurez les modèles utilisés pour le packaging et les miniatures." : "Configure the models used for packaging and thumbnails."}</p></div><button className="primary" onClick={done}>{t.saveProfile}</button></div>
    <section className="form-section ai-settings-section"><div className="section-heading"><div><h2>{lang === "fr" ? "Clés IA & modèles" : "AI keys & models"}</h2><p>{lang === "fr" ? "Les prix OpenRouter sont récupérés en direct et affichés par million de jetons." : "OpenRouter prices are fetched live and shown per million tokens."}</p></div><span className="session-badge">⌕ {lang === "fr" ? "SESSION UNIQUEMENT" : "SESSION ONLY"}</span></div>
      <div className="credential-grid">
        <label className="credential-card"><span className="provider-mark openrouter-mark">OR</span><strong>OpenRouter</strong><small>{lang === "fr" ? "Titres, descriptions, tags, prompts et quiz" : "Titles, descriptions, tags, prompts and quizzes"}</small><span className="field-label">API KEY</span><input type="password" autoComplete="off" spellCheck={false} value={aiSettings.openrouterKey} onChange={event => setAiSettings({ ...aiSettings, openrouterKey: event.target.value })} placeholder="sk-or-v1-••••••••" /><em className={aiSettings.openrouterKey ? "present" : ""}>● {aiSettings.openrouterKey ? (lang === "fr" ? "Clé présente en mémoire" : "Key held in memory") : (lang === "fr" ? "Clé requise" : "Key required")}</em></label>
        <label className="credential-card"><span className="provider-mark openai-mark">AI</span><strong>OpenAI Images</strong><small>{lang === "fr" ? "Génération réelle des miniatures PNG" : "Real PNG thumbnail generation"}</small><span className="field-label">API KEY</span><input type="password" autoComplete="off" spellCheck={false} value={aiSettings.openaiKey} onChange={event => setAiSettings({ ...aiSettings, openaiKey: event.target.value })} placeholder="sk-proj-••••••••" /><em className={aiSettings.openaiKey ? "present" : ""}>● {aiSettings.openaiKey ? (lang === "fr" ? "Clé présente en mémoire" : "Key held in memory") : (lang === "fr" ? "Clé requise pour les images" : "Key required for images")}</em></label>
      </div>
      <div className="model-grid">
        <label><span>{lang === "fr" ? "Modèle de texte OpenRouter" : "OpenRouter text model"}</span><select value={aiSettings.openrouterModel} onChange={event => setAiSettings({ ...aiSettings, openrouterModel: event.target.value })}><option value="">{openRouterModels.length ? (lang === "fr" ? "Choisir un modèle" : "Choose a model") : (lang === "fr" ? "Chargement du catalogue…" : "Loading catalog…")}</option>{openRouterModels.map(model => <option key={model.id} value={model.id}>{model.name} · in {formatTokenPrice(model.inputPerToken)}/M · out {formatTokenPrice(model.outputPerToken)}/M</option>)}</select>{selectedModel && <small>{selectedModel.id} · {selectedModel.contextLength ? `${Math.round(selectedModel.contextLength / 1000)}k context` : "context n/a"} · {lang === "fr" ? "tarifs OpenRouter en direct" : "live OpenRouter pricing"}</small>}</label>
        <label><span>{lang === "fr" ? "Modèle d’image OpenAI" : "OpenAI image model"}</span><select value={aiSettings.imageModel} onChange={event => setAiSettings({ ...aiSettings, imageModel: event.target.value as AiSettings["imageModel"] })}><option value="gpt-image-2">GPT Image 2 · texte in $5/M · image in $8/M · out $30/M</option><option value="gpt-image-1.5">GPT Image 1.5 (ancien) · texte in $5/M · image in $8/M · out $32/M</option></select><small>{lang === "fr" ? "GPT Image 2 est recommandé pour les nouvelles miniatures." : "GPT Image 2 is recommended for new thumbnails."}</small></label>
        <label><span>{lang === "fr" ? "Qualité de génération" : "Generation quality"}</span><select value={aiSettings.imageQuality} onChange={event => setAiSettings({ ...aiSettings, imageQuality: event.target.value as AiSettings["imageQuality"] })}><option value="low">Low · {lang === "fr" ? "économique" : "economy"}</option><option value="medium">Medium · {lang === "fr" ? "recommandé" : "recommended"}</option><option value="high">High · {lang === "fr" ? "qualité maximale" : "maximum quality"}</option></select><small>{lang === "fr" ? "Le coût réel dépend aussi de la résolution et du nombre de jetons image." : "Actual cost also depends on resolution and image-token usage."}</small></label>
      </div>
      <p className="privacy-note strong-privacy">⌕ {lang === "fr" ? "Vos clés ne sont pas sauvegardées dans le navigateur, les projets ou la base. Elles sont transmises uniquement au fournisseur choisi pendant l’appel et disparaissent au rechargement." : "Your keys are not saved in the browser, projects, or database. They are only forwarded to the selected provider during a request and disappear on reload."}</p>
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
