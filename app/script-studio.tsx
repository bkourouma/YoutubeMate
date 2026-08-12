"use client";

import { useEffect, useRef, useState } from "react";

type Lang = "fr" | "en";
type View = "studio" | "projects" | "profile";
type StepState = "done" | "active" | "todo";

type Profile = {
  channel: string; theme: string; primary: string; secondary: string; audience: string;
  tone: string; presentation: string; launch: string; closing: string; contacts: string;
  offer: string; duration: string; youtubeConnected: boolean; vidiqConnected: boolean;
};

type Project = {
  id: string; title: string; subject: string; status: string; updated: string; step: number;
  confirmed: boolean; completed: number[]; hook: string; promise: string; body: string;
  conclusion: string; reviewAccepted: boolean; packageAnswers: { visual: string; timecodes: string; links: string };
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
  duration: "8–12 minutes", youtubeConnected: false, vidiqConnected: false,
};

const demoProjects: Project[] = [
  { id: "ai-whatsapp", title: "Comment l’IA transforme WhatsApp Business", subject: "Comment utiliser l’IA pour mieux répondre aux clients sur WhatsApp Business", status: "Script en cours", updated: "Aujourd’hui, 14:32", step: 2, confirmed: true, completed: [1], hook: "Tu réponds encore à chaque client WhatsApp un par un ? Imagine un assistant qui prépare tes réponses, sans perdre ton ton ni promettre l’impossible. Voici la méthode.", promise: "À la fin de cette vidéo, tu sauras identifier les réponses à automatiser et celles qui doivent rester humaines. Tu repartiras avec une méthode simple à tester.", body: "", conclusion: "", reviewAccepted: false, packageAnswers: { visual: "", timecodes: "", links: "" } },
  { id: "prompts", title: "7 erreurs de prompt qui coûtent du temps", subject: "Erreurs de prompt", status: "Idée", updated: "Hier, 18:05", step: 1, confirmed: false, completed: [], hook: "", promise: "", body: "", conclusion: "", reviewAccepted: false, packageAnswers: { visual: "", timecodes: "", links: "" } },
  { id: "agents", title: "Agent IA : ce qu’il fait vraiment", subject: "Comprendre les agents IA", status: "Packagé", updated: "8 août, 09:12", step: 6, confirmed: true, completed: [1,2,3,4,5,6], hook: "", promise: "", body: "", conclusion: "", reviewAccepted: true, packageAnswers: { visual: "Créateur face à un mur de messages", timecodes: "00:00 Intro, 00:42 Problème, 03:10 Méthode, 07:25 Nuance", links: "allianceconsultants.net" } },
];

const labels = {
  fr: {
    projects: "Projets", studio: "Studio", profile: "Profil de chaîne", newVideo: "Nouvelle vidéo", pilot: "Pilote automatique", saved: "Sauvegardé à l’instant", steps: ["Recherche & angle", "Hook & intro", "Corps du script", "Conclusion & CTA", "Relecture finale", "Packaging"],
    validate: "Valider l’étape", regenerate: "Régénérer", edit: "Modifier", copy: "Copier", words: "mots", seconds: "secondes", guard: "Garde-fous actifs", facts: "Aucune donnée inventée", fixed: "Textes fixes protégés", oral: "Écriture orale", sources: "Sources vérifiées uniquement", project: "Projet", script: "Prompteur", export: "Exporter", allProjects: "Tous les projets", continue: "Continuer", recent: "Projets récents", channelProfile: "Profil de chaîne", integrations: "Intégrations personnelles", connected: "Connecté", disconnected: "Non connecté", test: "Tester la connexion", disconnect: "Déconnecter", saveProfile: "Enregistrer le profil", primaryLang: "Langue principale", secondaryLang: "Langue secondaire", fixedText: "Textes fixes — protégés mot pour mot", audience: "Audience cible", tone: "Ton & style", duration: "Durée cible", close: "Fermer", download: "Télécharger le document", copyScript: "Copier le script", fullScreen: "Plein écran", back: "Retour au studio", status: "Statut", updated: "Dernière modification", noKey: "Recherche manuelle disponible", ready: "Prêt à tourner", mandatoryStop: "Arrêt obligatoire", answerToContinue: "Votre réponse est requise pour continuer.", launch: "Lancer la génération", overview: "Vue d’ensemble", addSubject: "Quel est le sujet exact de la vidéo ?", create: "Créer le projet", cancel: "Annuler"
  },
  en: {
    projects: "Projects", studio: "Studio", profile: "Channel profile", newVideo: "New video", pilot: "Autopilot", saved: "Saved just now", steps: ["Research & angle", "Hook & intro", "Script body", "Conclusion & CTA", "Final review", "Packaging"],
    validate: "Approve step", regenerate: "Regenerate", edit: "Edit", copy: "Copy", words: "words", seconds: "seconds", guard: "Guardrails active", facts: "No invented data", fixed: "Fixed copy protected", oral: "Written for speech", sources: "Verified sources only", project: "Project", script: "Teleprompter", export: "Export", allProjects: "All projects", continue: "Continue", recent: "Recent projects", channelProfile: "Channel profile", integrations: "Personal integrations", connected: "Connected", disconnected: "Not connected", test: "Test connection", disconnect: "Disconnect", saveProfile: "Save profile", primaryLang: "Primary language", secondaryLang: "Secondary language", fixedText: "Fixed copy — protected word for word", audience: "Target audience", tone: "Tone & style", duration: "Target duration", close: "Close", download: "Download document", copyScript: "Copy script", fullScreen: "Full screen", back: "Back to studio", status: "Status", updated: "Last updated", noKey: "Manual research available", ready: "Ready to record", mandatoryStop: "Mandatory stop", answerToContinue: "Your answer is required to continue.", launch: "Start generation", overview: "Overview", addSubject: "What is the exact video topic?", create: "Create project", cancel: "Cancel"
  },
};

function wordCount(value: string) { return value.trim() ? value.trim().split(/\s+/).length : 0; }

export default function ScriptStudio() {
  const [lang, setLang] = useState<Lang>("fr");
  const [view, setView] = useState<View>("studio");
  const [profile, setProfile] = useState(profileDemo);
  const [projects, setProjects] = useState(demoProjects);
  const [activeId, setActiveId] = useState(demoProjects[0].id);
  const [auto, setAuto] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [newOpen, setNewOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [prompter, setPrompter] = useState(false);
  const [toast, setToast] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = labels[lang];
  const project = projects.find(p => p.id === activeId) ?? projects[0];

  useEffect(() => {
    const local = localStorage.getItem("script-studio-workspace");
    const localLang = localStorage.getItem("script-studio-lang") as Lang | null;
    if (localLang === "fr" || localLang === "en") setLang(localLang);
    if (local) {
      try { const parsed = JSON.parse(local); setProfile(parsed.profile ?? profileDemo); setProjects(parsed.projects ?? demoProjects); setActiveId(parsed.activeId ?? demoProjects[0].id); } catch { /* retain demo */ }
    }
    fetch("/api/workspace").then(r => r.json() as Promise<{ payload?: { profile: Profile; projects: Project[]; activeId: string } }>).then(data => {
      if (data.payload?.projects?.length) { setProfile(data.payload.profile); setProjects(data.payload.projects); setActiveId(data.payload.activeId); }
    }).catch(() => null).finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload = { profile, projects, activeId };
    localStorage.setItem("script-studio-lang", lang);
    localStorage.setItem("script-studio-workspace", JSON.stringify(payload));
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/workspace", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null).finally(() => setSaveState("saved"));
    }, 700);
  }, [profile, projects, activeId, lang, hydrated]);

  const updateProject = (patch: Partial<Project>) => setProjects(items => items.map(p => p.id === activeId ? { ...p, ...patch, updated: lang === "fr" ? "À l’instant" : "Just now" } : p));
  const showToast = (message: string) => { setToast(message); setTimeout(() => setToast(""), 1800); };
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); showToast(lang === "fr" ? "Copié dans le presse-papiers" : "Copied to clipboard"); };
  const script = [project.hook, profile.presentation, project.promise, profile.launch, project.body, project.conclusion].filter(Boolean).join("\n\n");

  const createProject = () => {
    if (!newSubject.trim()) return;
    const next: Project = { id: crypto.randomUUID(), title: newSubject.trim(), subject: newSubject.trim(), status: lang === "fr" ? "Idée" : "Idea", updated: lang === "fr" ? "À l’instant" : "Just now", step: 1, confirmed: false, completed: [], hook: "", promise: "", body: "", conclusion: "", reviewAccepted: false, packageAnswers: { visual: "", timecodes: "", links: "" } };
    setProjects(items => [next, ...items]); setActiveId(next.id); setNewSubject(""); setNewOpen(false); setView("studio");
  };

  const generateStep = () => {
    if (project.step === 1) { updateProject({ confirmed: true }); return; }
    if (project.step === 2) updateProject({
      hook: lang === "fr" ? `Tu passes encore des heures sur ${project.subject.toLowerCase()} ? Imagine une méthode qui prépare le travail sans inventer une seule réponse. Voici comment garder le contrôle.` : `Still spending hours on ${project.subject.toLowerCase()}? Imagine a method that prepares the work without making up a single answer. Here is how to stay in control.`,
      promise: lang === "fr" ? "À la fin de cette vidéo, tu sauras quoi automatiser, quoi vérifier et quoi garder humain. Tu repartiras avec une méthode simple à tester." : "By the end of this video, you will know what to automate, what to verify and what to keep human. You will leave with a simple method to test."
    });
    if (project.step === 3) updateProject({ body: lang === "fr" ? `Le vrai problème n’est pas le manque d’outils. C’est de savoir où les placer dans ton travail.\n\nImagine un maquis à l’heure du déjeuner. La commande passe de la table à la cuisine, puis revient au client. L’IA, c’est le serveur qui prépare le trajet. Elle ne choisit pas le plat à la place du client.\n\nDans ton activité, commence par repérer une tâche répétitive : classer une demande, préparer un brouillon ou retrouver une information déjà fournie. Par exemple, imagine une entrepreneure qui reçoit chaque matin les mêmes questions sur ses horaires. Un assistant peut préparer la réponse. Elle garde la validation finale.\n\nMais attention : l’outil ne connaît pas une information que tu ne lui as pas donnée. Un tarif, une date ou une promesse non vérifiée doit rester « non vérifié ».\n\nEt c’est justement cette limite qui nous mène à la règle la plus importante.` : `The real problem is not a lack of tools. It is knowing where they belong in your work.\n\nImagine a busy café at lunch. The order moves from the table to the kitchen and back to the customer. AI is the waiter preparing that journey. It does not choose the meal for the customer.\n\nStart by spotting one repetitive task: sorting a request, drafting an answer or finding information already provided. Imagine a business owner receiving the same questions every morning. An assistant can prepare the answer. She keeps final approval.\n\nBut the tool cannot know information you have not provided. An unverified price, date or promise must remain “unverified”.\n\nThat limitation leads us to the most important rule.` });
    if (project.step === 4) updateProject({ conclusion: lang === "fr" ? `Nous avons pu identifier les tâches répétitives, poser une méthode simple et voir pourquoi la validation humaine reste indispensable.\n\nQuelle tâche te prend le plus de temps aujourd’hui ? Dis-le-moi en commentaire.\n\n${profile.closing}` : `We have identified repetitive tasks, set out a simple method and seen why human approval remains essential.\n\nWhich task takes most of your time today? Tell me in the comments.\n\n${profile.closing}` });
  };

  const validate = () => {
    if (project.step === 1 && !project.confirmed) return showToast(t.answerToContinue);
    if (project.step === 2 && (!project.hook || wordCount(project.hook) > 40)) return showToast(lang === "fr" ? "Le hook doit contenir 25 à 40 mots." : "The hook must contain 25–40 words.");
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
            <section className="editor"><Stage project={project} profile={profile} t={t} lang={lang} updateProject={updateProject} generate={generateStep} copy={copy} />
              <div className="editor-actions"><button className="ghost" onClick={generateStep}>↻ {t.regenerate}</button><button className="primary" onClick={validate}>{t.validate} <span>→</span></button></div>
            </section>
            <aside className="guard-panel"><div className="guard-title"><span>◆</span><div><strong>{t.guard}</strong><small>{lang === "fr" ? "Pour cette génération" : "For this generation"}</small></div></div><Guard label={t.facts} /><Guard label={t.fixed} /><Guard label={t.oral} /><Guard label={t.sources} /><hr /><div className="context-box"><small>{lang === "fr" ? "CONTEXTE ACTIF" : "ACTIVE CONTEXT"}</small><strong>{profile.channel}</strong><p>{profile.audience}</p><button onClick={() => setView("profile")}>{lang === "fr" ? "Voir le profil" : "View profile"} →</button></div></aside>
          </div>
        </>}
        {view === "projects" && <Projects projects={projects} activeId={activeId} lang={lang} t={t} open={id => { setActiveId(id); setView("studio"); }} create={() => setNewOpen(true)} />}
        {view === "profile" && <ProfilePage profile={profile} setProfile={setProfile} lang={lang} t={t} done={() => { showToast(lang === "fr" ? "Profil enregistré" : "Profile saved"); setView("studio"); }} />}
      </main>
      {newOpen && <div className="modal-backdrop" onMouseDown={() => setNewOpen(false)}><div className="modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setNewOpen(false)}>×</button><span className="eyebrow">{lang === "fr" ? "NOUVEAU PROJET" : "NEW PROJECT"}</span><h2>{t.addSubject}</h2><p>{lang === "fr" ? "Soyez précis : le studio ne recherchera jamais une catégorie plus large." : "Be specific: the studio will never research a broader category."}</p><textarea autoFocus value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder={lang === "fr" ? "Ex. Comment utiliser l’IA pour répondre aux clients sur WhatsApp Business" : "E.g. How to use AI to answer customers on WhatsApp Business"} /><div className="modal-actions"><button className="ghost" onClick={() => setNewOpen(false)}>{t.cancel}</button><button className="primary" onClick={createProject}>{t.create} →</button></div></div></div>}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: string; label: string; count?: number; onClick: () => void }) { return <button className={active ? "active" : ""} onClick={onClick}><span>{icon}</span>{label}{count !== undefined && <i>{count}</i>}</button>; }
function Guard({ label }: { label: string }) { return <div className="guard-item"><span>✓</span>{label}</div>; }

function Stage({ project, profile, t, lang, updateProject, generate, copy }: { project: Project; profile: Profile; t: (typeof labels)[Lang]; lang: Lang; updateProject: (p: Partial<Project>) => void; generate: () => void; copy: (v: string) => void }) {
  const wc = wordCount(project.hook); const title = t.steps[project.step - 1];
  if (project.step === 1) return <><StageHead n={1} title={title} desc={lang === "fr" ? "Confirmez le cadrage avant toute recherche." : "Confirm the scope before any research."} /><div className="chat-bubble"><span className="ai-avatar">S</span><div><small>Script Studio AI</small><p>{lang === "fr" ? `Pour confirmer : tu souhaites traiter exactement « ${project.subject} », sans élargir le sujet. C’est bien ça ?` : `To confirm: you want to cover exactly “${project.subject}”, without broadening the topic. Is that correct?`}</p></div></div>{!project.confirmed ? <button className="confirm-card" onClick={generate}>✓ {lang === "fr" ? "Oui, confirmer ce cadrage" : "Yes, confirm this scope"}</button> : <div className="result-card"><div className="result-head"><span>✓</span><div><strong>{lang === "fr" ? "Cadrage confirmé" : "Scope confirmed"}</strong><small>{profile.youtubeConnected ? "YouTube Data API" : t.noKey}</small></div></div><div className="position-grid"><Position tag="SÛR" title={lang === "fr" ? "La méthode pas à pas" : "The step-by-step method"} /><Position tag="DIFFÉRENCIANT" title={lang === "fr" ? "Ce qu’il faut garder humain" : "What must stay human"} /><Position tag="LOCAL" title={lang === "fr" ? "Cas concret pour l’audience" : "A real audience use case"} /></div><p className="note">{lang === "fr" ? "Aucune donnée de marché n’a été inventée. Collez une recherche externe ou connectez votre clé YouTube pour enrichir l’analyse." : "No market data was invented. Paste external research or connect your YouTube key to enrich the analysis."}</p></div>}</>;
  if (project.step === 2) return <><StageHead n={2} title={title} desc={lang === "fr" ? "Accrochez en 10–15 secondes, puis installez une promesse tenue." : "Hook viewers in 10–15 seconds, then set a promise you can keep."} />{!project.hook ? <EmptyGenerate onClick={generate} t={t} lang={lang} /> : <><OutputBlock label="HOOK" value={project.hook} onChange={v => updateProject({ hook: v })} copy={() => copy(project.hook)} meta={<><span className={wc > 40 ? "danger" : "good"}>{wc} / 40 {t.words}</span><span>≈ {Math.max(1, Math.round(wc / 2.7))} {t.seconds}</span></>} /><div className="locked-copy"><div><span>⌕</span><strong>{lang === "fr" ? "Présentation fixe" : "Fixed introduction"}</strong><small>{lang === "fr" ? "Protégée mot pour mot" : "Protected word for word"}</small></div><p>{profile.presentation}</p></div><OutputBlock label={lang === "fr" ? "PROMESSE" : "PROMISE"} value={project.promise} onChange={v => updateProject({ promise: v })} copy={() => copy(project.promise)} /><div className="locked-line"><span>⌕</span>{profile.launch}</div></>}</>;
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

function ProfilePage({ profile, setProfile, lang, t, done }: { profile: Profile; setProfile: (p: Profile) => void; lang: Lang; t: (typeof labels)[Lang]; done: () => void }) { const field = (key: keyof Profile, value: string | boolean) => setProfile({ ...profile, [key]: value }); return <div className="page-view profile-page"><div className="page-title"><div><span className="eyebrow">{lang === "fr" ? "PERSONNALISATION" : "PERSONALIZATION"}</span><h1>{t.channelProfile}</h1><p>{lang === "fr" ? "Ce contexte guide chaque génération. Les textes fixes restent intouchables." : "This context guides every generation. Fixed copy remains untouched."}</p></div><button className="primary" onClick={done}>{t.saveProfile}</button></div><section className="form-section"><h2>{lang === "fr" ? "Identité éditoriale" : "Editorial identity"}</h2><div className="form-grid"><Field label={lang === "fr" ? "Nom de la chaîne" : "Channel name"} value={profile.channel} set={v => field("channel", v)} /><Field label={lang === "fr" ? "Thématique" : "Topic"} value={profile.theme} set={v => field("theme", v)} /><Field label={t.primaryLang} value={profile.primary} set={v => field("primary", v)} /><Field label={t.secondaryLang} value={profile.secondary} set={v => field("secondary", v)} /><Field label={t.audience} value={profile.audience} set={v => field("audience", v)} wide textarea /><Field label={t.tone} value={profile.tone} set={v => field("tone", v)} wide textarea /><Field label={t.duration} value={profile.duration} set={v => field("duration", v)} /></div></section><section className="form-section protected"><div className="section-heading"><div><h2>{t.fixedText}</h2><p>{lang === "fr" ? "Le studio les reproduit exactement, sans reformulation." : "The studio reproduces these exactly, without rewriting."}</p></div><span>⌕ {lang === "fr" ? "PROTÉGÉ" : "PROTECTED"}</span></div><Field label={lang === "fr" ? "Texte de présentation" : "Introduction copy"} value={profile.presentation} set={v => field("presentation", v)} wide textarea /><div className="form-grid"><Field label={lang === "fr" ? "Phrase de lancement" : "Launch line"} value={profile.launch} set={v => field("launch", v)} /><Field label={lang === "fr" ? "Phrase de clôture" : "Closing line"} value={profile.closing} set={v => field("closing", v)} /></div></section><section className="form-section"><h2>{t.integrations}</h2><div className="integration-grid"><Integration name="YouTube Data API v3" connected={profile.youtubeConnected} toggle={() => field("youtubeConnected", !profile.youtubeConnected)} t={t} /><Integration name="vidIQ" connected={profile.vidiqConnected} toggle={() => field("vidiqConnected", !profile.vidiqConnected)} t={t} /></div><p className="privacy-note">⌕ {lang === "fr" ? "Vos identifiants sont chiffrés, personnels et ne sont jamais réaffichés en clair." : "Your credentials are encrypted, personal and never shown again in plain text."}</p></section></div>; }
function Field({ label, value, set, wide, textarea }: { label: string; value: string; set: (v: string) => void; wide?: boolean; textarea?: boolean }) { return <label className={wide ? "wide" : ""}><span>{label}</span>{textarea ? <textarea value={value} onChange={e => set(e.target.value)} rows={4} /> : <input value={value} onChange={e => set(e.target.value)} />}</label>; }
function Integration({ name, connected, toggle, t }: { name: string; connected: boolean; toggle: () => void; t: (typeof labels)[Lang] }) { return <div className="integration"><span className="integration-icon">{name.charAt(0)}</span><div><strong>{name}</strong><small className={connected ? "connected" : ""}>● {connected ? t.connected : t.disconnected}</small></div><button onClick={toggle}>{connected ? t.disconnect : t.test}</button></div>; }
function Prompter({ script, title, close, t, copy }: { script: string; title: string; close: () => void; t: (typeof labels)[Lang]; copy: (v: string) => void }) { const [size, setSize] = useState(34); return <div className="prompter"><header><button onClick={close}>← {t.back}</button><strong>{title}</strong><div><button onClick={() => setSize(Math.max(22, size - 4))}>A−</button><button onClick={() => setSize(Math.min(58, size + 4))}>A＋</button><button onClick={() => copy(script)}>⧉ {t.copyScript}</button></div></header><article style={{ fontSize: `${size}px` }}>{script || "Le script apparaîtra ici après validation des étapes."}</article></div>; }
