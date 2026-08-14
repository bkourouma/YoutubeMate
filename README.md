# YoutubeMate

Un seul atelier pour deux formats YouTube, avec une base, un profil et un jeu de clés.

- **Script Studio** — d'un sujet à un script long prêt à tourner, puis à son packaging : recherche et angle, hook et intro, plan de chapitres, corps du script, conclusion, relecture, packaging.
- **Shorts Studio** — d'une vidéo longue à une série de shorts : transcription, extraits autonomes avec leurs timecodes source exacts, titres, fiches YouTube, miniatures verticales, production dans Descript et envoi vers YouTube.

Les deux pipelines partagent l'identité, le profil éditorial, les clés API, les modèles, les miniatures de référence et la photo du présentateur.

## Principes

**Rien n'est inventé.** Les garde-fous du studio interdisent les chiffres, sources et promesses absents du contexte fourni. Les textes fixes de la chaîne (présentation, lancement, clôture) sont reproduits mot pour mot. Les scores de titres sont annoncés comme des estimations éditoriales de l'IA, jamais comme des données vidIQ.

**Rien n'est perdu.** Chaque génération longue avance par morceaux et persiste au fur et à mesure : un chapitre, un short, un envoi. Une coupure ne coûte que l'élément en cours, et relancer reprend au premier manquant — jamais de régénération de travail déjà payé.

**Rien n'est dépensé sans intention.** Les concepts de miniature sont gratuits ; une seule image est produite après votre choix. Les résultats d'analyse, de titres et de fiches sont mis en cache par utilisateur.

## Démarrage

```bash
npm install
cp .env.example .env      # puis remplir (voir ci-dessous)
npx vinext dev --port 3100
node scripts/apply-local-migrations.mjs   # une fois, après le premier démarrage
```

Les scripts `npm run dev` / `build` utilisent une syntaxe POSIX qui échoue sous Windows ; appelez `npx vinext …` directement.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `SETTINGS_ENCRYPTION_KEY` | **Obligatoire.** Chiffre les clés API en base (AES-GCM). Ne jamais la changer après coup : les clés deviendraient illisibles. |
| `DEV_USER_ID` | Développement local uniquement — tient lieu d'en-tête d'identité. **Doit rester absente en production**, sinon tout visiteur anonyme hérite de cette identité et donc de vos clés. |
| `ADMIN_USER_ID` | Facultatif. Autorise cet utilisateur à utiliser les clés serveur en secours. |
| `ALLOWED_USER_IDS` | Facultatif. Restreint l'application à une liste d'identifiants. |
| `PUBLIC_APP_ORIGIN` | Origine publique, obligatoire en production. Sert à l'URI de redirection OAuth et à l'URL du média envoyée à Descript, sans jamais faire confiance à l'en-tête `Host`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Connexion YouTube. Client OAuth « Application Web », redirection `<origine>/api/youtube/callback`, API « YouTube Data v3 » activée. |
| `VIDIQ_SCORE_ENDPOINT` | Relais vidIQ personnel pour les scores réels de titres. |

**Les clés API (OpenRouter, OpenAI, Descript) ne se mettent pas dans `.env`** en usage normal : elles se saisissent dans l'application, sont testées auprès du fournisseur avant enregistrement, puis chiffrées côté serveur et liées à votre compte. Le navigateur n'en reçoit jamais que les quatre derniers caractères.

## Sécurité

Toute route qui dépense des crédits exige une identité authentifiée et résout la clé côté serveur ; aucune n'accepte de clé dans le corps de requête. Le refresh token YouTube est chiffré, propre à chaque utilisateur, et l'état OAuth est à usage unique et lié à celui qui a lancé le flux. Les identifiants de projet fournis par le client sont validés et encodés avant d'atteindre une URL Descript. Chaque appel sortant a une échéance.

Ces propriétés sont vérifiées par la suite de tests : une régression fait échouer le build.

## Vérification

```bash
npx tsc --noEmit
npm run lint
npx vinext build
node --test tests/rendered-html.test.mjs
```

La suite démarre le worker réel et vérifie le rendu, les contrats des routes et une série d'invariants — pas de clé dans un corps de requête, pas d'identité de repli partagée, styles Shorts confinés, ratios de miniatures corrects par format.

## Architecture

```
app/
  script-studio.tsx     shell (nav, langue, alertes, persistance, profil) + pipeline long
  shorts-studio.tsx     pipeline shorts, rendu sous .pipeline-shorts
  globals.css           styles partagés · shorts.css  styles shorts, tous portés
  server/               identity, secrets, http, poll, youtube, ai-cache, image-framing
  api/                  routes ; les routes shorts-* sont préfixées
db/schema.ts            workspaces, integration_settings, ai_cache, shorts_projects,
                        descript_jobs, youtube_auth, oauth_states
```

Les styles Shorts sont tous portés par `.pipeline-shorts` : les deux feuilles partagent dix-sept noms de classes, et cette contrainte — vérifiée par un test — rend la collision impossible plutôt qu'improbable.
