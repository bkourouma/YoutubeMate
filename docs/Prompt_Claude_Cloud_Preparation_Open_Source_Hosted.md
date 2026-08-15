# Prompt maître pour Claude Cloud — CreatorStudio, open source et version hosted

> Donne ce document à Claude Cloud avec accès au dépôt GitHub `bkourouma/YoutubeMate`. Il doit travailler dans une branche dédiée et ouvrir une draft pull request. Le dépôt réel reste toujours la source de vérité : si le code a évolué depuis la rédaction de ce prompt, Claude doit adapter le plan et expliquer les écarts.

## Rôle

Tu es un Staff Software Engineer, architecte SaaS, responsable sécurité applicative et mainteneur open source expérimenté. Tu dois préparer le dépôt suivant pour une publication open source sérieuse et pour une future version hosted :

- Dépôt : `https://github.com/bkourouma/YoutubeMate`
- Branche principale : `main`
- Stack observée : TypeScript, React 19, Vinext, Vite, Cloudflare Workers, D1, R2, Drizzle ORM.
- Runtime minimal : Node.js `>=22.13.0`.
- Langues du produit et de la documentation : français et anglais.

Tu dois effectuer des modifications réelles dans le dépôt, ajouter les tests nécessaires, exécuter les validations et ouvrir une **draft pull request**. Ne pousse jamais directement sur `main`.

## Objectif produit

Le produit est un cockpit de production éditoriale assistée par IA. Il relie la recherche, l’écriture de scripts longs, le découpage en Shorts, le packaging, Descript, CapCut et YouTube, tout en maintenant une validation humaine aux étapes importantes.

Ses différenciateurs doivent rester visibles dans le produit et la documentation :

- pipeline intégré Descript → YouTube ;
- lecture des projets Descript et création de compositions directement dans Descript ;
- préservation de la composition source ;
- transmission à Descript des textes, séquences, timecodes, durées et CTA éventuel ;
- publication privée sur YouTube avec titre, description et tags ;
- test avec une vidéo avant un traitement en lot ;
- une requête par Short et reprise au premier élément manquant après interruption ;
- validation humaine des extraits, titres, miniatures et compositions ;
- continuité entre vidéo longue, Shorts et packaging ;
- personnalisation par profil éditorial, ADN visuel et photo du présentateur ;
- BYOK pour OpenRouter, OpenAI et Descript ;
- parcours alternatif CapCut avec ZIP, CSV, SRT et ressources de publication ;
- interface et documentation en français et en anglais ;
- exports Word et autres livrables directement réutilisables.

Ne repositionne jamais l’application comme une « usine automatique à contenu », une promesse de revenus passifs ou un outil qui remplace le jugement du créateur. Le positionnement doit rester : automatiser les tâches répétitives et les transferts entre outils, pas le goût, la responsabilité éditoriale ou la vérification humaine.

## État déjà vérifié du dépôt

Avant de modifier quoi que ce soit, confirme cet état dans la version actuelle du dépôt :

- `README.md` et `README.fr.md` existent et décrivent les quatre points d’entrée.
- `app/shorts-studio.tsx` charge les projets Descript, demande la création de compositions et pilote l’envoi individuel vers YouTube.
- `app/server/identity.ts` dépend actuellement de l’en-tête `oai-authenticated-user-id`, avec `DEV_USER_ID` comme repli de développement.
- `app/server/secrets.ts` chiffre les clés utilisateur avec AES-GCM.
- `app/server/youtube.ts` utilise le scope minimal `youtube.upload`, chiffre le refresh token et protège l’état OAuth par une ligne à usage unique.
- `disconnectYoutube()` supprime actuellement la ligne locale sans révoquer explicitement le token chez Google.
- `db/schema.ts` contient déjà `usage_events`. Ne recrée pas un second registre de consommation IA.
- Les coûts OpenRouter et OpenAI sont déjà enregistrés et testés. Étends l’existant au lieu de le remplacer.
- Le projet dépend de Cloudflare D1 et R2 via `.openai/hosting.json`. Ne supprime pas ce fichier et ne casse pas le déploiement actuel.
- Les scripts `dev`, `build` et `start` de `package.json` utilisent une syntaxe POSIX qui ne fonctionne pas correctement sous Windows.
- Il n’existe pas encore de workflow `.github/workflows/ci.yml`.
- Il n’existe pas encore de `SECURITY.md`, `CONTRIBUTING.md` ni de `LICENSE`.
- La suite principale se trouve dans `tests/rendered-html.test.mjs` et couvre déjà plusieurs invariants de sécurité, d’interface et de facturation.

Ne duplique pas une fonctionnalité existante. Recherche toujours l’implémentation et les tests actuels avant d’ajouter une table, un service, une route ou un composant.

## Décisions du propriétaire et points encore bloquants

Le propriétaire a choisi **CreatorStudio** comme nouveau nom de travail du produit. Ce choix doit être appliqué dans le code et la documentation de cette PR, sans réintroduire « YouTube » dans le nom global du produit.

Le nom reste cependant soumis à une vérification juridique et commerciale avant le lancement public. En août 2026, « Creator Studio » est déjà utilisé officiellement par Apple et Facebook et reste fortement associé à YouTube. Le risque de confusion, de mauvais référencement et de conflit de marque est donc élevé :

- `https://www.apple.com/apple-creator-studio/`
- `https://creatorstudio.facebook.com/install`
- `https://developers.google.com/youtube/terms/branding-guidelines`

Ne prétends pas que le nom est juridiquement disponible. Ne bloque pas pour autant les modifications techniques réversibles demandées ci-dessous.

### 1. Renommage confirmé vers CreatorStudio

Le nom actuel contient la marque YouTube. Les règles officielles indiquent qu’une application ne doit pas utiliser « YouTube », « YT » ou une variante dans son nom global :

`https://developers.google.com/youtube/terms/branding-guidelines`

Tu dois immédiatement :

1. créer un module de configuration centralisé du produit, par exemple `app/config/product.ts`, contenant au minimum `productName: "CreatorStudio"`, la description courte, l’URL du dépôt et les informations de support ;
2. remplacer les occurrences produit codées en dur de `YoutubeMate` et `YouTubeMate` par cette configuration ou par **CreatorStudio** dans l’interface, les métadonnées, les exports, les README, le titre OpenRouter et les textes utilisateur ;
3. mettre à jour le nom privé du paquet dans `package.json` vers une forme npm valide telle que `creatorstudio`, sans publier de paquet ;
4. ne pas modifier les identifiants historiques, les migrations déjà exécutées, l’historique Git ni les textes qui doivent explicitement expliquer que le dépôt s’appelait auparavant YoutubeMate ;
5. créer `docs/BRAND_RENAME_CHECKLIST.md` avec une matrice `élément / valeur actuelle / valeur cible / responsable / état`. Inclure au minimum : interface, métadonnées, nom npm, dépôt GitHub, URLs, domaine, adresses de support, OAuth Google, écran de consentement, OpenRouter `x-title`, documentation, captures, mentions légales et politique de marque ;
6. indiquer dans cette checklist que le renommage du dépôt GitHub, le domaine, les redirections et la configuration OAuth sont des opérations externes qui ne doivent pas être simulées par une simple modification du code ;
7. ajouter avant lancement une tâche explicite de recherche d’antériorité et de validation par un professionnel compétent dans les territoires visés, ainsi qu’une vérification des domaines, handles sociaux, dépôts et paquets ;
8. documenter le risque de confusion avec Apple Creator Studio, Facebook Creator Studio et YouTube Creator Studio, et prévoir un plan de repli vers un nom plus distinctif si la validation échoue ;
9. conserver les références descriptives à **YouTube** lorsqu’elles désignent réellement la plateforme, son API, ses fonctionnalités ou ses règles. Ne renomme jamais une API tierce pour donner l’impression qu’elle appartient au produit ;
10. ajouter des tests ciblés vérifiant que le nom affiché provient de la configuration centralisée et que les surfaces principales n’affichent plus l’ancien nom par inadvertance.

### 2. Licence open source — décision encore requise

L’absence de `LICENSE` signifie que le dépôt public n’accorde pas encore les droits nécessaires à un véritable usage open source.

La recommandation stratégique est **AGPL-3.0**, éventuellement avec une licence commerciale séparée. Toutefois, l’application d’une licence publique est une décision du titulaire des droits.

Tu dois :

1. créer `docs/LICENSING_DECISION.md` comparant brièvement AGPL-3.0, Apache-2.0 et MIT pour ce projet ;
2. recommander AGPL-3.0 en expliquant son intérêt pour un modèle open source + SaaS hosted ;
3. documenter les conséquences sur les contributions externes, la double licence et l’éventuel besoin d’un CLA ou d’un DCO ;
4. **ne pas ajouter de fichier `LICENSE` avant confirmation explicite du propriétaire** ;
5. rendre la draft PR clairement bloquée sur cette décision pour le lancement open source, mais pas pour les autres améliorations techniques.

## Règles de travail Git et GitHub

1. Lis d’abord `AGENTS.md`, les instructions du dépôt et l’état Git.
2. Préserve toutes les modifications existantes qui ne t’appartiennent pas.
3. Crée une branche dédiée, par exemple `chore/oss-hosted-foundation`.
4. N’écris jamais de secret, token, identifiant client, clé de chiffrement ou média privé dans Git, les logs, les tests ou la PR.
5. Fais des commits petits et cohérents, avec des messages en anglais décrivant la raison du changement.
6. Maintiens `README.md` et `README.fr.md` synchronisés sur le fond.
7. Utilise l’anglais pour le code, les noms techniques et les commentaires internes. Fournis les documents utilisateur importants en anglais et en français.
8. Ne reformate pas massivement les fichiers sans nécessité.
9. Ne désactive pas un test existant pour faire passer la CI.
10. Si une modification risquée exige un choix non fourni, implémente la préparation réversible, documente le blocage et poursuis les autres tâches.
11. Ouvre une **draft PR**, jamais une PR finale prête à fusionner tant que la licence et la validation juridique finale de la marque ne sont pas réglées.

## Plan d’exécution obligatoire

Commence par un audit court, puis exécute les travaux ci-dessous par lots cohérents. Ne tente pas de construire toute la plateforme SaaS dans une seule PR.

### Lot 1 — Guide de débogage opérationnel

Crée :

- `docs/DEBUGGING.md` en anglais ;
- `docs/DEBUGGING.fr.md` en français.

Les deux fichiers doivent rester équivalents sur le fond et contenir :

#### Installation et environnement

- versions requises de Node et npm ;
- installation avec `npm ci` lorsque le lockfile existe ;
- copie de `.env.example` ;
- démarrage local ;
- création de l’état D1 local ;
- ordre exact : démarrer une première fois, exécuter `scripts/apply-local-migrations.mjs`, puis relancer ;
- fonctionnement de D1, R2, Miniflare et des migrations ;
- commandes de typecheck, lint, build et tests ;
- avertissement sur les différences entre développement local, hébergement OpenAI actuel et future version hosted autonome.

#### Variables d’environnement

Documente sans jamais fournir de valeurs réelles :

- `SETTINGS_ENCRYPTION_KEY` ;
- `DEV_USER_ID` ;
- `ADMIN_USER_ID` ;
- `ALLOWED_USER_IDS` ;
- `PUBLIC_APP_ORIGIN` ;
- `GOOGLE_CLIENT_ID` ;
- `GOOGLE_CLIENT_SECRET` ;
- `OPENROUTER_API_KEY` et `OPENAI_API_KEY` uniquement comme replis administrateur si cela correspond toujours au code ;
- tout nouveau réglage d’authentification ajouté dans cette PR.

Pour chaque variable, indique : rôle, environnements autorisés, caractère obligatoire ou facultatif, symptômes en cas d’absence et précautions de sécurité.

#### Matrice de diagnostic

Ajoute un tableau « Symptôme → cause probable → vérification sûre → correction » couvrant au minimum :

- `authentication_required` ;
- `user_not_allowed` ;
- `integration_not_configured` ;
- `settings_encryption_key_missing` ;
- D1 `DB binding unavailable` ;
- absence de base D1 locale ;
- échec de migration ;
- erreur de build Vinext/Vite ;
- problème de syntaxe des scripts sous Windows ;
- `PUBLIC_APP_ORIGIN` absent ou incorrect ;
- `redirect_uri_mismatch` Google ;
- refus ou expiration OAuth ;
- `youtube_not_connected` ;
- quota YouTube épuisé ;
- `composition_not_found` après renommage dans Descript ;
- projet Descript introuvable ;
- création de composition Descript bloquée ou expirée ;
- échec d’upload d’un Short et reprise du lot ;
- erreur de propriété R2 `reference_forbidden` ;
- photo du présentateur refusée ;
- miniature sans le bon visage ou avec un texte incorrect ;
- dépassement de taille du workspace ou d’un projet Shorts ;
- échec de sauvegarde D1 ;
- coût IA affiché à zéro ou usage manquant ;
- cache interutilisateur, en précisant que cela ne doit jamais arriver ;
- réponse réseau tardive ou interrompue.

#### Diagnostic des intégrations

Pour OpenRouter, OpenAI, Descript et YouTube, indique :

- comment tester la connexion sans exposer la clé ;
- quelle route interne ou action UI utiliser ;
- quels journaux sont utiles ;
- quelles données doivent être systématiquement masquées ;
- comment distinguer erreur de configuration, erreur de quota, timeout et contrat fournisseur modifié.

#### Règles de sécurité pendant le débogage

- ne jamais afficher les clés complètes, refresh tokens, en-têtes Authorization, cookies, codes OAuth ou URLs signées ;
- utiliser uniquement les quatre derniers caractères lorsque nécessaire ;
- supprimer ou masquer scripts, transcriptions, photos et titres privés dans les rapports publics ;
- fournir un modèle de rapport de bug expurgé ;
- inclure une procédure de rollback et de vérification après déploiement.

Ajoute des liens vers ces guides dans les deux README.

### Lot 2 — Santé du dépôt open source

Ajoute les fichiers suivants :

- `CONTRIBUTING.md` ;
- `SECURITY.md` ;
- `CODE_OF_CONDUCT.md`, en utilisant un standard reconnu avec attribution correcte ;
- `.github/PULL_REQUEST_TEMPLATE.md` ;
- modèles d’issues dans `.github/ISSUE_TEMPLATE/` pour bug, demande de fonctionnalité et problème d’intégration ;
- `.github/ISSUE_TEMPLATE/config.yml` si utile ;
- `.github/dependabot.yml` pour npm et GitHub Actions ;
- `.github/workflows/ci.yml`.

Le guide de contribution doit préciser :

- installation et migrations locales ;
- conventions de branche et de commit ;
- synchronisation anglais/français ;
- commandes de validation ;
- interdiction des secrets et médias clients ;
- méthode pour ajouter une migration Drizzle ;
- méthode pour tester une intégration avec mocks ;
- obligation de documenter les changements visibles ;
- règles spécifiques aux routes qui dépensent des crédits.

`SECURITY.md` doit fournir une procédure de signalement privé et demander de ne jamais ouvrir une issue publique contenant une vulnérabilité, une clé, un token, une transcription ou une photo privée. Utilise un contact configurable ou un placeholder explicitement marqué à compléter par le propriétaire ; n’invente pas d’adresse.

Le template de PR doit demander :

- résumé ;
- raison du changement ;
- captures si UI ;
- tests exécutés ;
- impacts sécurité, données, coût IA et OAuth ;
- migrations ;
- mise à jour des deux langues ;
- checklist « aucun secret ajouté ».

### Lot 3 — CI et scripts reproductibles

Dans `package.json` :

1. ajoute un script explicite `typecheck` pour `tsc --noEmit` ;
2. rends `dev`, `build` et `start` portables entre Linux, macOS et Windows ;
3. utilise la solution la plus petite et maintenable, par exemple `cross-env` si nécessaire ;
4. mets à jour le lockfile ;
5. ne modifie pas les versions applicatives sans raison démontrée.

Le workflow CI doit :

- se déclencher sur pull request et push vers `main` ;
- utiliser la version Node définie par le projet ;
- activer le cache npm ;
- exécuter `npm ci` ;
- exécuter typecheck, lint, build et tests ;
- éviter tout secret réel ;
- fonctionner avec les mocks et bindings de test existants ;
- utiliser des permissions GitHub minimales ;
- avoir un `concurrency` qui annule les exécutions devenues obsolètes ;
- publier des erreurs lisibles sans exposer de données sensibles.

Si les tests actuels reconstruisent déjà l’application, évite les builds inutiles tout en gardant des commandes locales simples. Documente clairement l’ordre retenu.

### Lot 4 — Clarification du README et de la proposition de valeur

Améliore le haut de `README.md` et `README.fr.md` sans supprimer la documentation détaillée existante.

Ajoute :

- une proposition de valeur courte ;
- les quatre points d’entrée ;
- un bloc clair sur le pipeline Descript → YouTube ;
- une explication de la différence entre intégration Descript et kit CapCut ;
- une section « Community/self-hosted » et une section « Hosted — planned » ;
- un avertissement honnête : la version hosted n’est pas encore disponible si c’est toujours le cas ;
- un démarrage rapide réellement testable ;
- liens vers debugging, contribution, sécurité, architecture et roadmap ;
- badges CI seulement après création effective du workflow ;
- emplacements explicites pour captures et démonstration, sans créer de faux liens ni de faux témoignages.

Ne promets pas :

- une automatisation totale de chaîne ;
- des résultats viraux ;
- des scores vidIQ lorsque les scores sont des estimations IA ;
- une compatibilité Descript non vérifiée ;
- une version hosted déjà active ;
- un déploiement Docker si aucun Dockerfile fonctionnel n’existe.

### Lot 5 — Frontière d’authentification sécurisée

Le code actuel dépend directement de `oai-authenticated-user-id`. Cette identité peut être légitime derrière l’infrastructure actuelle, mais elle ne doit pas devenir une confiance implicite dans un SaaS public.

Refactorise l’authentification sans intégrer arbitrairement un fournisseur commercial :

1. introduis une abstraction `AuthProvider` ou équivalente ;
2. conserve un adaptateur pour l’identité de l’hébergement OpenAI actuel ;
3. conserve un adaptateur de développement local ;
4. prépare l’injection d’un futur fournisseur de sessions hosted ;
5. ajoute un réglage explicite indiquant que l’en-tête OAI est fourni par un proxy de confiance ;
6. refuse cet en-tête lorsque le mode correspondant n’est pas activé ;
7. refuse `DEV_USER_ID` en production au lieu de dépendre uniquement d’un commentaire ;
8. conserve l’allowlist et les réponses 401/403 existantes ;
9. évite de casser le déploiement actuel : documente la variable de transition et le plan de déploiement ;
10. ajoute des tests prouvant que l’identité ne peut pas être inventée par une requête publique.

Ne choisis pas Clerk, Auth0, Supabase Auth, Better Auth ou un autre fournisseur sans décision du propriétaire. Crée un point de décision documenté pour la prochaine phase.

### Lot 6 — Durcissement YouTube immédiat

Conserve les protections existantes : scope minimal, état OAuth lié à l’utilisateur, état à usage unique, TTL, refresh token chiffré, origine publique configurée et upload privé.

Ajoute ou prépare les améliorations suivantes :

1. lors d’une déconnexion, tente de révoquer le token chez Google avant de supprimer les données locales ;
2. même si la révocation distante échoue, garantis la suppression locale et retourne un statut compréhensible sans révéler le token ;
3. lorsqu’un refresh token répond durablement `invalid_grant`, supprime ou invalide proprement la connexion locale et demande une reconnexion ;
4. ajoute des tests avec `fetch` mocké pour la révocation, l’échec distant et `invalid_grant` ;
5. documente la suppression des données autorisées et la politique de conservation ;
6. crée `docs/YOUTUBE_COMPLIANCE.md` et sa version française si le temps le permet ;
7. explique le quota par défaut et la nécessité d’un audit avant un usage hosted multi-utilisateur ;
8. n’élargis pas les scopes OAuth sans justification fonctionnelle, documentation et validation du propriétaire.

Références officielles à vérifier :

- politiques développeur : `https://developers.google.com/youtube/terms/developer-policies` ;
- conformité OAuth : `https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance` ;
- audits et quota : `https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits` ;
- coût des méthodes : `https://developers.google.com/youtube/v3/determine_quota_cost` ;
- politique des données Google : `https://developers.google.com/terms/api-services-user-data-policy`.

Ne copie pas de longs passages de ces pages. Résume les obligations et lie les sources.

### Lot 7 — Tests de contrat Descript

La création de compositions et l’upload sont des différenciateurs centraux. Ils doivent être couverts par des tests de contrat locaux contre des réponses simulées.

Ajoute des tests qui couvrent au minimum :

- lecture de la liste des projets Descript ;
- validation et encodage de `projectId` ;
- création d’une composition par Short ;
- conservation de la composition source ;
- nommage avec le titre sélectionné ;
- transmission de plusieurs séquences non consécutives ;
- timecodes estimés ou exacts ;
- ajout optionnel du CTA ;
- idempotence et déduplication par utilisateur ;
- polling borné par une durée réelle et timeout lisible ;
- `composition_not_found` après renommage dans Descript ;
- correspondance exacte entre composition et titre ;
- aucune fuite du token Descript dans les logs ou réponses ;
- upload YouTube d’un seul Short par requête ;
- reprise après une défaillance partielle.

N’utilise aucune clé Descript réelle dans la CI. Si un test avec le vrai service reste nécessaire, crée une procédure manuelle opt-in dans le guide de débogage et marque clairement ce qui n’a pas été vérifié en production.

### Lot 8 — Architecture hosted et roadmap, sans surconstruire

Crée `docs/HOSTED_READINESS.md` et `docs/HOSTED_READINESS.fr.md` avec une architecture cible et une roadmap priorisée.

Documente comme **déjà présent** :

- séparation des secrets par utilisateur ;
- chiffrement AES-GCM ;
- cache IA par utilisateur ;
- registre `usage_events` ;
- projets Shorts séparés ;
- idempotence des jobs Descript ;
- OAuth YouTube par utilisateur ;
- upload unitaire et reprise ;
- D1 et R2.

Documente comme **à construire** :

- authentification hosted vérifiée ;
- comptes, organisations, membres et rôles ;
- abonnements et plans ;
- budgets, limites, réservations et crédits gérés ;
- rate limiting par utilisateur et IP ;
- files d’attente et workers asynchrones pour les traitements longs ;
- journal d’audit ;
- observabilité structurée avec request ID et redaction ;
- rotation/versionnement des clés de chiffrement ou chiffrement par enveloppe ;
- export et suppression de compte ;
- politique de rétention D1/R2 ;
- URLs privées ou signées pour les médias ;
- liste des sous-traitants ;
- CGU, confidentialité et accord de traitement ;
- conformité ARTCI pour la Côte d’Ivoire et RGPD lorsque le service cible des personnes dans l’UE ;
- vérification OAuth Google ;
- extension de quota YouTube ;
- sauvegarde, restauration et plan de reprise ;
- support, incidents et statut du service.

Ne crée pas dès maintenant toutes ces tables et tous ces services. Pour les éléments non nécessaires à cette PR, crée des issues GitHub si tu as les permissions. Sinon, ajoute un backlog exploitable dans `docs/HOSTED_ROADMAP.md`.

## Backlog GitHub demandé

Crée ou propose les issues suivantes, avec priorité, dépendances et critères d’acceptation :

1. **P0 — Complete the CreatorStudio rename and perform trademark, domain and search-confusion clearance**.
2. **P0 — Select and apply the open-source license**.
3. **P0 — Integrate a verified hosted authentication provider**.
4. **P0 — Implement Google token revocation and user-data deletion**.
5. **P0 — Prepare OAuth verification and YouTube quota audit**.
6. **P1 — Move long-running jobs to a durable queue**.
7. **P1 — Add per-user/IP rate limits to credit-spending routes**.
8. **P1 — Add hosted plans, budgets and credit reservations**.
9. **P1 — Add encryption key rotation and audit logging**.
10. **P1 — Define D1/R2 retention, export and deletion workflows**.
11. **P1 — Add structured observability with secret redaction**.
12. **P1 — Provide a reproducible Cloudflare self-host deployment guide**.
13. **P2 — Evaluate a portable database/storage adapter**.
14. **P2 — Evaluate Docker support without falsely advertising it today**.
15. **P2 — Prepare launch assets, screenshots, demo and first release**.

Utilise des labels cohérents tels que `priority:P0`, `priority:P1`, `priority:P2`, `security`, `oauth`, `descript`, `youtube`, `hosted`, `documentation`, `good first issue` lorsque ces labels existent ou peuvent être créés sans conflit.

## Exigences de tests et critères d’acceptation

La PR ne peut être proposée à la revue que si :

- `npm ci` réussit ;
- le typecheck réussit ;
- le lint réussit ;
- le build réussit ;
- la suite de tests réussit ;
- la CI GitHub exécute les mêmes invariants principaux ;
- aucun secret réel n’est présent dans le diff ;
- `DEV_USER_ID` est refusé en production ;
- l’en-tête OAI n’est accepté que dans le mode de confiance documenté ;
- les routes sensibles restent en échec fermé sans identité ;
- les clés API ne sont jamais acceptées dans le corps des routes de génération ;
- la déconnexion YouTube tente une révocation distante et garantit la purge locale ;
- `invalid_grant` entraîne une reconnexion propre ;
- les tests Descript simulés couvrent liste, création, idempotence, timeout et composition introuvable ;
- l’upload unitaire et la reprise après échec restent fonctionnels ;
- les deux README décrivent correctement Descript, CapCut et YouTube ;
- le nom produit affiché est **CreatorStudio**, provient de la configuration centralisée et l’ancien nom ne subsiste que dans les mentions historiques ou de migration nécessaires ;
- les guides de débogage anglais et français sont synchronisés ;
- la documentation ne prétend pas qu’une version hosted, une image Docker ou une licence existe avant que ce soit vrai.

Si un test échoue pour une raison préexistante, ne le masque pas. Isole la cause, indique si elle est antérieure à tes changements et ouvre la draft PR avec un compte rendu exact seulement si le propriétaire peut encore examiner utilement le travail.

## Contraintes de sécurité supplémentaires

- N’enregistre jamais un token complet dans un message d’erreur.
- N’expose jamais les clés côté navigateur ; seuls les quatre derniers caractères peuvent être affichés.
- Ne partage jamais le cache, les jobs, projets, photos ou fichiers entre utilisateurs.
- Toute clé R2 fournie par le client doit être validée contre le préfixe du propriétaire et le type d’objet attendu.
- Toute route qui dépense de l’argent doit exiger une identité, appliquer les limites disponibles, enregistrer l’usage dans le mécanisme existant et rester idempotente lorsque l’action peut être rejouée.
- Les erreurs de journalisation ou de comptabilité ne doivent pas transformer une génération déjà facturée et réussie en échec utilisateur, mais elles doivent être observables.
- Les timeouts externes doivent être bornés.
- Les redirections OAuth doivent utiliser `PUBLIC_APP_ORIGIN`, jamais un `Host` non fiable.
- Toute nouvelle migration doit être additive, testée localement et documentée.

## Livrables attendus

À la fin, fournis :

1. une synthèse de l’audit initial ;
2. le plan réellement exécuté ;
3. la liste des fichiers créés et modifiés ;
4. les décisions non appliquées faute de validation : licence, fournisseur d’auth hosted et validation juridique/commerciale finale de CreatorStudio ;
5. les commandes exécutées et leurs résultats exacts ;
6. les risques encore ouverts ;
7. la liste des issues créées ou le chemin du backlog ;
8. le lien de la draft PR ;
9. une procédure courte permettant au propriétaire de tester manuellement : démarrage local, Descript, YouTube, reprise d’upload et révocation ;
10. les éventuels réglages de déploiement à appliquer avant fusion.

## Ordre de priorité

Si le temps ou la taille de la PR impose de réduire le périmètre, respecte cet ordre :

1. guide de débogage ;
2. CI et scripts reproductibles ;
3. fichiers communautaires GitHub ;
4. abstraction d’authentification et échec fermé ;
5. révocation YouTube et gestion de `invalid_grant` ;
6. tests de contrat Descript ;
7. README et configuration centralisée de la marque ;
8. documentation hosted et backlog.

Ne sacrifie jamais la sécurité ou les tests pour augmenter le nombre de fichiers modifiés. Si nécessaire, ouvre plusieurs draft PR dépendantes plutôt qu’une PR géante.

## Réponse de départ attendue de Claude

Avant la première modification, réponds brièvement avec :

- l’état du dépôt et de la branche ;
- les changements non liés déjà présents que tu préserveras ;
- les écarts entre ce prompt et le code actuel ;
- le découpage proposé en une ou plusieurs draft PR ;
- la décision de licence encore bloquée, le choix du fournisseur d’auth hosted et le risque de marque restant malgré le choix de CreatorStudio ;
- les premiers fichiers que tu vas modifier.

Ensuite, commence immédiatement les tâches non bloquées.
