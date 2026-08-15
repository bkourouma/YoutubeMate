# CreatorMate

*[English](README.md) · Français*

[![CI](https://github.com/bkourouma/YoutubeMate/actions/workflows/ci.yml/badge.svg)](https://github.com/bkourouma/YoutubeMate/actions/workflows/ci.yml)

**Un cockpit de production éditoriale qui agit dans votre chaîne de production.** Il transforme une vidéo longue en Shorts, crée directement les compositions dans Descript, puis prépare et pilote leur publication sur YouTube — avec une validation humaine à chaque étape qui compte.

Il ne se contente pas de recommander, ni de vous remettre des fichiers à copier-coller. C'est la différence qu'il faut connaître avant de lire la suite.

Un seul atelier pour deux formats YouTube, avec une base, un profil et un jeu de clés. L'interface elle-même s'utilise en français ou en anglais.

> **Anciennement YoutubeMate.** Les règles de marque de Google interdisent « YouTube » dans le nom d'une application : le produit est donc renommé. Le nouveau nom **n'est pas encore validé juridiquement** — voir [docs/BRAND_RENAME_CHECKLIST.md](docs/BRAND_RENAME_CHECKLIST.md).
>
> **Sous [licence MIT](LICENSE).** Utilisez-le, modifiez-le, auto-hébergez-le, construisez un produit dessus — commercial ou non. **Les contributions sont bienvenues** : voir [CONTRIBUTING.md](CONTRIBUTING.md), et [docs/LICENSING_DECISION.md](docs/LICENSING_DECISION.md) pour le choix de MIT.
>
> **Il n'existe ni version hosted ni image Docker.** L'auto-hébergement est le seul moyen de l'utiliser aujourd'hui, en mono-locataire — voir [docs/HOSTED_READINESS.fr.md](docs/HOSTED_READINESS.fr.md).

## Le pipeline Descript → YouTube

C'est là que les autres outils s'arrêtent. À partir d'une transcription, l'application découpe des extraits autonomes avec leurs timecodes source, propose des titres notés, écrit les descriptions, tags et concepts de miniature — puis :

1. **lit vos projets Descript** et vous laisse choisir la source ;
2. **crée une composition verticale par Short dans ce projet**, nommée avec le titre retenu, portant le texte, les séquences source, les timecodes, la durée cible et, en option, votre vidéo CTA ;
3. **laisse la composition source intacte** — il ajoute, il ne réécrit jamais votre montage ;
4. **envoie sur YouTube une vidéo à la fois**, en privé, avec titre, description et tags, derrière un bouton *Tester avec 1 vidéo* qui prouve le chemin avant d'engager un lot ;
5. **reprend au premier Short manquant** après une interruption, sans rien réenvoyer.

La correspondance entre un Short et sa composition se fait par nom exact : renommer une composition dans Descript produit une erreur claire au lieu de publier la mauvaise vidéo.

### Intégration Descript ou kit CapCut

Deux routes, et la différence n'est pas une préférence :

- **Descript** est une vraie intégration. L'application dialogue avec votre compte, crée les compositions et pilote l'envoi.
- **CapCut** n'expose aucune API publique permettant de construire une timeline. Le kit n'est pas une intégration au rabais, c'est le substitut honnête : un ZIP contenant le plan de montage en CSV — une ligne par séquence à couper — le texte de chaque Short, les sous-titres SRT, la fiche de publication, la vidéo CTA optionnelle et un mode d'emploi. Tout ce qui peut être préparé à l'avance l'est ; la coupe vous revient.

## Communauté / auto-hébergé

Tout tourne sur votre propre compte Cloudflare avec vos propres clés API, chiffrées au repos et liées à votre identité. C'est **mono-locataire aujourd'hui** : un déploiement, un propriétaire. Lisez [docs/HOSTED_READINESS.fr.md](docs/HOSTED_READINESS.fr.md) avant de l'ouvrir à quiconque — il n'y a pas encore de fournisseur d'authentification vérifié, pas de limitation de débit et pas de procédure de suppression de compte.

## Hosted — prévu

Indisponible. Rien ne tourne, rien n'accepte d'inscription, rien n'est payable. L'écart entre ici et là est écrit dans [docs/HOSTED_READINESS.fr.md](docs/HOSTED_READINESS.fr.md), avec le backlog dans [docs/HOSTED_ROADMAP.md](docs/HOSTED_ROADMAP.md).

## Documentation

| | |
|---|---|
| [Débogage](docs/DEBUGGING.fr.md) · [en](docs/DEBUGGING.md) | Installation, variables, symptôme → correction, diagnostic des intégrations |
| [Contribution](CONTRIBUTING.md) | Branches, migrations, tests d'intégration, règles des routes qui dépensent |
| [Sécurité](SECURITY.md) | Signalement privé, ce qui est protégé et ce qui ne l'est pas |
| [Préparation hosted](docs/HOSTED_READINESS.fr.md) · [en](docs/HOSTED_READINESS.md) | Ce qui existe, ce qui n'existe pas |
| [Feuille de route](docs/HOSTED_ROADMAP.md) | Backlog priorisé avec critères d'acceptation |
| [Licence](docs/LICENSING_DECISION.md) | Pourquoi MIT, et ce que cela coûte |
| [Renommage](docs/BRAND_RENAME_CHECKLIST.md) | Ce qui est fait, ce que seul le propriétaire peut faire |
| [Décisions](docs/adr/) | Registre des décisions d'architecture |

<!-- Captures d'écran et démonstration à ajouter une fois le renommage appliqué aux
     captures. Aucun placeholder n'est committé : une capture fausse ou cassée est pire
     que rien. -->

## Les quatre entrées

Le menu ne classe pas par outil mais par **ce que vous avez déjà en main** : un sujet, une vidéo longue à découper, une vidéo déjà tournée, un short déjà monté. Chaque entrée porte un sous-titre qui dit à qui elle s'adresse, pour qu'aucun choix ne demande d'ouvrir l'écran pour comprendre.

| Menu | Sous-titre | Vous avez… | Vous obtenez… |
|---|---|---|---|
| ✍ **Script Studio** | Écrire une vidéo longue | un sujet | un script complet + son packaging |
| ✂ **Shorts Studio** | Découper une vidéo en Shorts | une vidéo longue | des shorts montés et publiés |
| 🎬 **Package vidéo** | Vidéo longue déjà tournée | un script tourné | titres, description, tags, miniatures |
| ⚡ **Package Short** | Short déjà monté | un ou plusieurs shorts | titres, descriptions, miniatures verticales |
| ▤ **Mes projets** | | | l'historique, avec le compteur |
| ◉ **Ma chaîne & réglages** | | | profil, clés, photo, ADN visuel |

Les deux premières entrées **produisent la vidéo**, les deux suivantes **habillent une vidéo déjà faite**. « Package » les rapproche volontairement : c'est la même étape du métier, appliquée à deux formats.

## Les parcours

**Script Studio — 7 étapes.** Recherche & angle · Hook & intro · Validation des chapitres · Corps du script · Conclusion & CTA · Relecture finale · Packaging. Le corps est écrit **un chapitre à la fois** : chaque chapitre part en requête séparée et est enregistré dès son retour. Une coupure ne coûte que le chapitre en cours, et relancer reprend au premier manquant.

**Shorts Studio — 4 étapes.** Source · Extraits · Titres · Fiches. À partir d'une transcription, l'IA découpe des extraits autonomes avec leurs timecodes source, propose des titres notés, puis les descriptions, tags et concepts de miniature. Deux routes de production ensuite, au choix :

- **Descript** — création des compositions puis envoi vers YouTube, **une vidéo à la fois**, avec un bouton *Tester avec 1 vidéo* avant de lancer la série. La correspondance se fait par nom de composition : renommer dans Descript casse le lien, et le message d'erreur le dit.
- **Kit CapCut** — CapCut n'expose aucune connexion publique permettant de construire une timeline. Le kit remplace cette étape : un ZIP contenant le plan de montage en CSV (chaque ligne = une séquence à couper), le texte de chaque short, les sous-titres SRT, la fiche de publication, la vidéo CTA optionnelle et un mode d'emploi. Les horaires estimés — issus d'une transcription sans horodatage — sont signalés comme tels.

**Package vidéo.** Trois vérifications obligatoires, pré-remplies depuis votre profil et votre script (les timecodes de chapitres sont calculés à partir du script réel) ; le concept visuel est facultatif, l'IA en propose sinon. Puis le vrai moteur de packaging démarre seul.

**Package Short.** Un short à la fois, ou jusqu'à **10 titres collés d'un coup** — en mode bulk le meilleur titre est retenu automatiquement.

## Le packaging : A/B/C, et comment l'orienter

Chaque packaging produit **trois options complètes** — titre, description, concepts de miniature — pensées pour un test A/B YouTube (qui ne teste qu'une variable à la fois : titres **ou** miniatures).

Un champ **« Orienter les trois options »** est posé au-dessus. Vous y écrivez la direction éditoriale voulue, ou partez d'une suggestion (*Plus provocant*, *Plus concret et chiffré*, *Angle débutant*, *Insister sur la gratuité*, *Ton plus calme*), et les trois options sont réécrites pour la suivre.

Deux détails font la différence entre une orientation suivie et une variante déguisée :

- **Les titres refusés partent avec la demande.** Sans cela un modèle renvoie des reformulations très proches de ce que vous venez d'écarter. Il lui est explicitement demandé de ne pas les reproposer.
- **Une régénération orientée passe sur le modèle de rédaction**, avec réflexion élevée et température abaissée. Tenir un cahier des charges sur trois options cohérentes *et réellement distinctes* est un travail de raisonnement, pas de reformulation. La première génération reste sur le modèle rapide : le surcoût n'arrive que quand il achète quelque chose, et le bloc annonce quel modèle sera utilisé.

## Les miniatures

**Les concepts sont gratuits, l'image est payante.** L'IA propose trois concepts par option ; une seule image est produite, après votre choix.

- **Prompt modifiable.** Le prompt de chaque concept s'édite à la main, ou se réécrit par l'IA à partir d'une consigne (« fond plus sombre, gros plan sur le téléphone »).
- **Aperçu sans téléchargement.** Un clic ouvre la miniature en grand ; le téléchargement reste un geste séparé.
- **Format respecté.** Les dimensions sont transposées selon le pipeline : paysage pour le long, portrait pour les shorts — jamais une image 16:9 recadrée en 9:16.
- **Votre photo.** Si une photo de présentateur est enregistrée, elle est envoyée avec la demande et l'instruction d'identité prime sur le reste du prompt : le visage doit être **le vôtre**, pas une interprétation. Les miniatures de référence servent au style récurrent de la chaîne, jamais à recopier une composition.

## Ma chaîne & réglages

Un seul écran pour les deux pipelines : **Clés & connexions** (OpenRouter, OpenAI, Descript, YouTube, modèles et qualité d'image) · **Votre photo dans les miniatures** · **ADN visuel des miniatures** (le système éditorial, déduit de vos miniatures de référence et affinable par consigne) · le profil éditorial et le bloc automatique de description.

## Principes

**Rien n'est inventé.** Les garde-fous interdisent les chiffres, sources et promesses absents du contexte fourni. Les textes fixes de la chaîne (présentation, lancement, clôture) sont reproduits mot pour mot. Les scores de titres sont annoncés comme des estimations éditoriales de l'IA, jamais comme des données vidIQ.

**Rien n'est perdu.** Chaque génération longue avance par morceaux et persiste au fur et à mesure : un chapitre, un short, un envoi. Les requêtes réessaient d'elles-mêmes avant d'abandonner. Ce que vous tapez l'emporte toujours sur ce que le serveur renvoie : une réponse tardive ne peut pas écraser un projet commencé entre-temps, et un échec d'enregistrement est annoncé au lieu d'être avalé.

**Rien n'est dépensé sans intention.** Une seule image après votre choix, un modèle de raisonnement seulement quand il sert, et les résultats d'analyse, de titres et de fiches mis en cache par utilisateur.

**Rien n'est perdu de vue.** Les messages s'empilent en haut à droite au lieu de se remplacer, comptent les répétitions, se figent au survol et se ferment à l'échappement — une erreur ne peut plus être effacée par le succès suivant.

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

La suite démarre le worker réel et vérifie le rendu, les contrats des routes et une série d'invariants — pas de clé dans un corps de requête, pas d'identité de repli partagée, styles Shorts confinés, ratios de miniatures corrects par format, réponse serveur tardive incapable d'écraser une édition locale.

## Architecture

```
app/
  script-studio.tsx     shell (nav, langue, alertes, persistance, profil) + pipeline long
  shorts-studio.tsx     pipeline shorts, rendu sous .pipeline-shorts
  shorts-express.tsx    packaging d'un short déjà monté, à l'unité ou en bulk
  globals.css           styles partagés · shorts.css  styles shorts, tous portés
  lib/capcut-kit.ts     construction du ZIP CapCut, chargée à la demande
  server/               identity, secrets, http, poll, youtube, ai-cache, image-framing
  api/                  routes ; les routes shorts-* sont préfixées
db/schema.ts            workspaces, integration_settings, ai_cache, shorts_projects,
                        descript_jobs, youtube_auth, oauth_states
```

Les styles Shorts sont tous portés par `.pipeline-shorts` : les deux feuilles partagent dix-sept noms de classes, et cette contrainte — vérifiée par un test — rend la collision impossible plutôt qu'improbable.

Aucun texte de l'interface ne descend sous 9 px : l'échelle typographique basse a été relevée de façon monotone, en gardant la hiérarchie relative intacte et en agrandissant les blocs à hauteur fixe, sinon un texte plus lisible n'aurait fait qu'afficher moins de lignes.
