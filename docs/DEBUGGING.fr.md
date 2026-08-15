# Guide de débogage

*[English](DEBUGGING.md) · Français*

Tout ce qui suit se vérifie sans aucun identifiant de production. Les vérifications qui
exigent un vrai compte sont marquées **manuelles** et disent ce qu'elles ne prouvent pas.

## Installation

Node `>=22.13.0`, comme déclaré dans `package.json`. Vérifiez avec `node -v` : une version
inférieure échoue sur une erreur de syntaxe, pas sur un message clair.

```bash
npm ci                    # pas `npm install` — le lockfile est justement le sujet
cp .env.example .env
```

### Premier démarrage, dans cet ordre exact

```bash
npm run dev                                # 1. crée l'état D1 local
node scripts/apply-local-migrations.mjs    # 2. applique drizzle/*.sql
npm run dev                                # 3. relance, tables en place
```

L'étape 2 ne peut pas passer en premier. Le fichier D1 de Miniflare, sous
`.wrangler/state/v3/d1/miniflare-D1DatabaseObject/`, n'existe pas tant que le serveur de
développement n'a pas démarré une fois : le script n'a rien à appliquer, et toutes les
requêtes suivantes échouent sur une table absente.

### Comment la pile locale s'assemble

- **Vinext + Vite** compilent le routeur App de Next.js en Worker Cloudflare.
- **Miniflare** exécute ce worker localement. Il n'y a pas de `wrangler.toml` : les
  bindings sont déclarés dans `vite.config.ts`.
- **D1** est du SQLite. En local, un fichier sous `.wrangler/state/` ; déployé, une base
  Cloudflare. `.openai/hosting.json` déclare les bindings de l'hébergement actuel — ne le
  supprimez pas.
- **R2** stocke les miniatures de référence, la photo du présentateur et le logo, chacun
  sous son propre préfixe de clé.
- **Drizzle** possède le schéma. `npm run db:generate` écrit une migration à partir de
  `db/schema.ts` ; elle n'est jamais appliquée automatiquement.

### Commandes

```bash
npm run typecheck    # tsc --noEmit
npm run lint
npm run build        # écrit dist/, que les tests chargent
npm run test         # build + tests
npm run test:only    # tests sur le dist/ existant
npm run verify       # tout, dans l'ordre
```

### Trois environnements, pas un

| | Local | Hébergement actuel | Future version hosted |
|---|---|---|---|
| Identité | `DEV_USER_ID` | en-tête `oai-authenticated-user-id` | non construite — voir `docs/HOSTED_READINESS.fr.md` |
| D1 / R2 | fichiers Miniflare | Cloudflare | Cloudflare |
| `NODE_ENV` | development | production | production |

Un bug qui n'apparaît que dans l'un des trois est presque toujours un bug d'identité.
Lisez la section `AUTH_MODE` avant de chercher ailleurs.

## Variables d'environnement

Aucune valeur réelle ne figure dans ce document, dans `.env.example`, ni dans un test.

| Variable | Rôle | Où | Obligatoire | Absente → | Précaution |
|---|---|---|---|---|---|
| `SETTINGS_ENCRYPTION_KEY` | Clé AES-GCM chiffrant les clés API stockées | partout | **oui** | `settings_storage_unavailable` ; clés illisibles | **Ne jamais la changer une fois des clés enregistrées** : elles deviennent définitivement indéchiffrables. Irrécupérable. |
| `DEV_USER_ID` | Tient lieu de toute la couche d'authentification en local | local uniquement | non | 401 partout en local | **Refusée quand `NODE_ENV=production`.** En production, elle donnerait à tout visiteur anonyme la même identité — et ses clés. |
| `AUTH_MODE` | D'où une identité peut venir : `trusted-proxy-header`, `dev`, `hosted-session` | partout | non | vaut `trusted-proxy-header` | Ne mettez `trusted-proxy-header` que si un proxy que vous contrôlez pose l'en-tête. Ailleurs, il est falsifiable. `hosted-session` ne renvoie rien : aucun fournisseur n'existe encore. |
| `ADMIN_USER_ID` | Autorise une identité à utiliser les clés serveur | partout | non | ce repli est désactivé | Quiconque détient cette identité dépense les crédits du déploiement. |
| `ALLOWED_USER_IDS` | Liste blanche, séparée par virgules | partout | non | tout authentifié est autorisé | Le moyen le plus simple de garder un déploiement privé. |
| `PUBLIC_APP_ORIGIN` | L'origine publique réelle | production | **oui en production** | `public_origin_not_configured` ; redirection OAuth invalide | Sert à l'URI de redirection OAuth et à l'URL du média envoyée à Descript — précisément pour qu'aucune ne dérive d'un en-tête `Host` non fiable. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Client OAuth YouTube | si YouTube est utilisé | pour YouTube | `google_client_not_configured` | Changer le secret déconnecte tous les utilisateurs de ce client. |
| `OPENROUTER_API_KEY` / `OPENAI_API_KEY` / `DESCRIPT_API_TOKEN` | Repli serveur pour `ADMIN_USER_ID` uniquement | facultatif | non | l'admin n'a plus de repli | Les clés des utilisateurs normaux vivent chiffrées dans D1. Ce n'est pas un défaut général. |
| `VIDIQ_SCORE_ENDPOINT` | Relais vidIQ personnel | facultatif | non | les scores restent des estimations IA | Une estimation ne doit jamais être présentée comme une donnée vidIQ. |

## Symptôme → cause → vérification sûre → correction

| Symptôme | Cause probable | Vérification sûre | Correction |
|---|---|---|---|
| `authentication_required` (401) | Aucune identité résolue | `GET /api/usage` — un 401 confirme que c'est l'identité, pas la route | Local : posez `DEV_USER_ID` et vérifiez que `NODE_ENV` n'est pas `production`. Déployé : vérifiez que le proxy pose l'en-tête et que `AUTH_MODE=trusted-proxy-header`. |
| `user_not_allowed` (403) | Identité absente de `ALLOWED_USER_IDS` | Comparez l'identifiant à la liste — n'en journalisez aucun en entier | Ajoutez l'identifiant, ou videz la variable |
| `integration_not_configured` (503) | Aucune clé enregistrée pour ce fournisseur | Réglages → Clés & connexions affiche les 4 derniers caractères | Ressaisissez la clé ; elle est testée auprès du fournisseur avant enregistrement |
| `settings_encryption_key_missing` | `SETTINGS_ENCRYPTION_KEY` absente | Est-elle dans l'environnement ? | Posez-la. Si elle a été **changée**, les clés stockées sont perdues : supprimez-les et ressaisissez-les |
| D1 `DB binding unavailable` | Binding manquant | `vite.config.ts` en local, `.openai/hosting.json` déployé | Rétablissez le binding ; ne supprimez pas le fichier d'hébergement |
| Pas de base D1 locale | Migrations lancées avant le premier démarrage | Cherchez un `.sqlite` sous `.wrangler/state/v3/d1/` | Reprenez l'ordre de premier démarrage ci-dessus |
| Migration en échec | Ordre incorrect, ou migration destructive | `node scripts/apply-local-migrations.mjs` affiche ce qu'il applique et ce qui existait déjà | En local : supprimez le `.sqlite` et rejouez. Déployé : ne supprimez jamais — écrivez une migration corrective additive |
| Erreur de build Vinext/Vite | Node trop ancien, ou import incompatible Worker | `node -v` ; lisez la **première** erreur, pas la dernière | Alignez la version sur `engines`. Un import `cloudflare:workers` doit être dynamique, sinon le module ne charge pas hors workerd |
| `WRANGLER_LOG_PATH=… n'est pas reconnu` | Ancien script POSIX sous Windows | `npm run dev` | Corrigé avec `cross-env` ; récupérez `main` |
| `redirect_uri_mismatch` (Google) | L'URI enregistrée diffère de celle envoyée | Comparez `PUBLIC_APP_ORIGIN` + `/api/youtube/callback` avec la console Google, caractère par caractère | Rendez-les identiques : schéma, hôte, port, pas de barre finale |
| OAuth refusé ou expiré | L'utilisateur a refusé, ou l'état a expiré | Relancez la connexion depuis les Réglages | L'état est à usage unique et limité dans le temps : un lien rejoué ne peut pas fonctionner |
| `youtube_not_connected` | Aucune autorisation, ou refresh token mort | Les Réglages affichent l'état de connexion | Reconnectez-vous. Un `invalid_grant` supprime désormais la connexion stockée au lieu d'échouer indéfiniment |
| Quota YouTube épuisé | Quota quotidien du projet consommé | Console Google Cloud → quotas | Attendez la réinitialisation, ou demandez une augmentation. Un envoi coûte ~1600 unités sur 10 000 par défaut : **environ six envois par jour** |
| `composition_not_found` | La composition a été renommée dans Descript | L'erreur rappelle le titre cherché | Renommez-la exactement ainsi, ou relancez la création |
| Projet Descript introuvable | Mauvais projet, ou clé sans accès | Réglages → testez la clé Descript | Resélectionnez le projet dans la liste |
| Création de composition bloquée ou expirée | Job d'agent lent ou figé | Le polling est borné et renvoie `descript_timeout` | Relancez : une requête identique dans l'heure réutilise le même job au lieu de payer deux fois |
| Un Short échoue en cours de lot | Incident fournisseur sur cet élément | Les Shorts déjà envoyés sont conservés | Relancez le lot : il reprend au premier Short manquant et ne réenvoie rien |
| `reference_forbidden` (403) | Une clé R2 ne correspond pas à son propre préfixe | Photos sous `presenter-photo/`, styles sous `reference-thumbnails/` | C'était un vrai bug : la photo était vérifiée contre le préfixe des styles. Récupérez `main` |
| Photo de présentateur refusée | Format que le navigateur n'a pas su convertir | Le message nomme le type MIME | Le HEIC des iPhone est la cause habituelle : exportez en JPEG |
| Miniature avec le mauvais visage | Une description écrite concurrence la photo | Votre ADN visuel décrit-il le présentateur en mots ? | Retirez la description. La photographie doit être la seule source du visage |
| Texte de miniature absent ou fautif | Le concept et le composeur se contredisaient | Les deux partaient ensemble | Corrigé : l'interdiction de lettres est retirée dès qu'un titre est demandé |
| Espace de travail trop volumineux (413) | Charge utile au-dessus de la limite | L'alerte le dit explicitement | Archivez d'anciens projets ; un projet Shorts contient toute sa transcription |
| Échec de sauvegarde | D1 injoignable | L'en-tête affiche l'état de sauvegarde | Jamais silencieux : un échec est annoncé |
| Coût affiché à zéro | Le fournisseur n'a renvoyé aucun coût, ou rien n'a été enregistré | Credits Usage → Journal des appels | OpenRouter renvoie son propre coût ; les coûts d'image sont calculés depuis les jetons et restent des estimations |
| Cache partagé entre utilisateurs suspecté | **Ne doit jamais arriver** | Les clés de cache hachent l'identifiant du propriétaire | Traitez-le comme une faille et suivez `SECURITY.md` |
| Réseau coupé en pleine génération | Connexion perdue | L'alerte distingue ce cas d'une erreur fournisseur | Les requêtes réessaient seules ; les générations longues reprennent au premier élément manquant |

## Diagnostic par intégration

Ne lisez jamais une clé pour la tester. Chaque vérification ci-dessous passe par l'app.

**OpenRouter** — Réglages → Clés & connexions → Enregistrer. La clé est vérifiée auprès de
`/api/v1/key` avant stockage. Un échec de génération après cela n'est pas un problème de
clé : `openrouter_request_failed` = le fournisseur a refusé (crédits, accès au modèle),
`openrouter_timeout` = trop lent, `openrouter_invalid_response` = le modèle a renvoyé
quelque chose d'inexploitable, changez de modèle.

**OpenAI** — même écran. Un échec d'image vient généralement du modèle ou de la taille :
seuls `gpt-image-2` et `gpt-image-1.5` sont acceptés, chacun avec sa famille de tailles.

**Descript** — Shorts Studio → chargez la liste des projets. Une liste vide sans erreur
signifie que la clé fonctionne mais que le compte n'a aucun projet. Un `descript_timeout`
à la création est un agent lent, pas une mauvaise clé.

**YouTube** — les Réglages affichent la chaîne connectée. Un `youtube_not_connected` après
que ça a fonctionné signifie que l'autorisation a été révoquée ou a expiré. Reconnectez-vous ;
l'app supprime désormais un jeton mort d'elle-même.

Journaux utiles : la sortie du serveur de développement, et l'onglet Réseau du navigateur.
Les deux peuvent contenir un en-tête `Authorization` — ne les collez jamais sans masquer.

**Vérifications manuelles qu'aucun test automatique ne couvre.** Elles exigent un vrai
compte, et la suite le dit plutôt que de faire semblant :

1. Création de compositions sur un vrai projet Descript, et vérification que la composition
   source est intacte ensuite.
2. Correspondance par nom après avoir renommé une composition dans Descript — la seule
   hypothèse jamais validée en production.
3. Un vrai envoi YouTube, en utilisant *Tester avec 1 vidéo* avant tout lot.
4. Déconnexion, puis vérification que l'app a disparu de
   <https://myaccount.google.com/permissions>.

## Règles de masquage

- Ne montrez jamais une clé complète, un refresh token, un access token, un en-tête
  `Authorization`, un cookie, un code OAuth ou une URL signée. Quatre derniers caractères
  suffisent à identifier une clé.
- Retirez scripts, transcriptions, photos et titres non publiés de tout élément public.
- Les captures d'écran fuient : vérifiez l'onglet Réseau et la barre latérale avant d'en
  publier une.

### Modèle de rapport

```text
Symptôme :      <ce que vous avez vu, et ce que vous attendiez>
Code d'erreur : <verbatim, ex. composition_not_found>
Écran :         <Script Studio / Shorts Studio / …>
Étapes :        1. … 2. … 3. …
Commit :        <git rev-parse --short HEAD>
Environnement : <OS, node -v, navigateur>
Fournisseur :   <OpenRouter / OpenAI / Descript / YouTube>
Modèle :        <identifiant du modèle, si pertinent>
Clé :           <4 derniers caractères uniquement, ou « configurée »>
Déjà vérifié :  <ce que vous avez contrôlé>
Journaux :      <masqués>
```

### Rollback

1. `git revert <commit>` — préférez le revert au reset ; l'historique est partagé.
2. **Ne revenez jamais sur une migration en supprimant une table.** Les migrations
   appliquées sont additives ; écrivez-en une corrective.
3. `npm run verify` avant de redéployer.
4. Après déploiement : chargez l'app, vérifiez que l'identité se résout, que les Réglages
   affichent toujours les clés par leurs 4 derniers caractères, et lancez une génération
   bon marché.
5. Si `SETTINGS_ENCRYPTION_KEY` est en cause, arrêtez-vous. Un rollback ne récupère pas des
   clés chiffrées sous une autre clé : les utilisateurs devront les ressaisir.
