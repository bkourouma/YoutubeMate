# PRD — « Script Studio » : application de production de vidéos YouTube assistée par IA

> **Instruction pour le builder** : construis et héberge l'application web décrite ci-dessous. Interface **bilingue français/anglais** (sélecteur de langue, tout texte d'interface traduit dans les deux langues), responsive (mobile et desktop). Respecte scrupuleusement les règles métier de la section 6 — elles sont le cœur du produit.

---

## 1. Vision

Script Studio transforme un simple sujet de vidéo en un script complet prêt à tourner et un packaging YouTube prêt à publier, en suivant un pipeline éditorial en 6 étapes éprouvé sur une vraie chaîne (Envol IA).

Le produit s'adresse à **tout créateur YouTube, quel que soit son pays ou sa langue** : tout ce qui est propre à une chaîne (audience, langue, ton, textes fixes, offre) est configurable dans un « Profil de chaîne ». La méthode, elle, est fixe.

Différenciateur clé : contrairement aux générateurs de scripts génériques, l'app applique des **garde-fous éditoriaux stricts** (aucune donnée inventée, textes fixes reproduits mot pour mot, points d'arrêt obligatoires où l'IA pose une question au lieu de deviner).

## 2. Utilisateurs cibles

- **Persona principal** : créateur YouTube, solo ou petite équipe, qui publie des vidéos face caméra explicatives (IA, business, tech, éducation…). Francophone ou anglophone, partout dans le monde. Pas forcément technique.
- **Contexte d'usage** : prépare 1 à 4 vidéos par semaine, souvent sur mobile ou petit laptop, connexion parfois instable (sauvegarder le travail en continu).
- Chaque utilisateur travaille avec **ses propres intégrations** : sa clé API YouTube et son compte vidIQ (section 7).

## 3. Parcours utilisateur global

1. **Onboarding** : l'utilisateur crée son Profil de chaîne (section 5).
2. **Nouvelle vidéo** : il saisit un sujet ou mot-clé.
3. **Pipeline** : il avance à travers 6 étapes (section 6), en mode manuel (étape par étape) ou en mode **Pilote automatique** (l'app enchaîne, mais s'arrête à chaque point d'arrêt obligatoire).
4. **Livrable** : il exporte le script continu (prompteur) et le packaging (blocs à copier-coller dans YouTube Studio).

Chaque vidéo est un **projet** sauvegardé, avec un statut : Idée → Script en cours → Relu → Packagé → Publié.

## 4. Écrans

1. **Tableau de bord** : liste des projets vidéo avec statut, bouton « Nouvelle vidéo ».
2. **Vue projet / pipeline** : stepper horizontal des 6 étapes avec état (à faire / en cours / validé). Zone centrale : conversation avec l'IA de l'étape + résultat structuré. L'utilisateur peut régénérer, modifier à la main, puis « Valider l'étape » (ce qui verrouille la sortie comme entrée de l'étape suivante).
3. **Mode prompteur** : affichage plein écran du script assemblé (hook + intro + corps + conclusion) en texte continu, gros caractères, défilement, sans les en-têtes internes de travail.
4. **Profil de chaîne** (réglages) : voir section 5.
5. **Export** : voir section 8.

## 5. Profil de chaîne (configurable — c'est ce qui rend le produit vendable)

Formulaire rempli à l'onboarding, modifiable à tout moment, injecté dans toutes les générations IA :

- Nom de la chaîne, thématique.
- **Langue principale des vidéos** (FR, EN, ou autre) et langue secondaire pour le packaging traduit.
- Audience cible (métiers, zone géographique, niveau) — champ libre, aucune zone présupposée.
- Ton et style (ex. : « tutoiement, oral, zéro jargon, analogies du quotidien »).
- **Texte de présentation fixe** du créateur (lu au début de chaque vidéo) — champ libre multi-lignes.
- **Phrase de lancement fixe** (ex. : « Tu es prêt ? Let's go ! »).
- **Phrase de clôture fixe** de la conclusion (ex. : « Si tu as aimé, liker et n'oublie pas de t'abonner pour recevoir nos prochaines vidéos. »).
- Coordonnées pour la description : téléphone, site, lien de communauté (WhatsApp/Discord/Telegram).
- **Bloc offre** : ce que le créateur vend/propose, décliné par public (ex. : entreprises / indépendants).
- Durée cible par défaut des vidéos.
- **Intégrations personnelles** (voir section 7) : clé API YouTube Data v3 et connexion au compte vidIQ de l'utilisateur — chacun utilise ses propres identifiants, rien n'est partagé entre utilisateurs ni codé en dur.

Les textes fixes du profil sont **sacrés** : l'IA les reproduit mot pour mot, ne les reformule jamais, ne les « modernise » jamais.

## 6. Le pipeline en 6 étapes (règles métier — cœur du produit)

Chaque étape est une génération IA avec des instructions système propres. Règles transversales d'abord :

### 6.0 Garde-fous transversaux (non négociables)

- **Aucune donnée inventée.** Chaque fait, chiffre, citation, mécanisme technique, timecode, prix ou date doit venir : de l'utilisateur, d'une recherche réellement effectuée (étape 1), ou être clairement présenté comme exemple hypothétique (« imagine un freelance qui… »). Si une donnée manque, l'IA écrit « non vérifié » ou **pose la question à l'utilisateur** — jamais de valeur plausible.
- **Points d'arrêt.** Si le sujet, la promesse ou l'angle est ambigu, l'IA pose UNE question précise et attend la réponse avant de générer. Le mode Pilote automatique respecte ces arrêts, il ne les saute jamais.
- **Jamais de copie.** Ne jamais copier ni paraphraser un titre, un hook, une analogie ou une structure d'une vidéo concurrente identifiée en recherche. Les concurrents servent à comprendre les mécanismes, pas à fournir des formulations.
- **Écrit pour être dit à voix haute** : phrases courtes, rythme oral, jargon expliqué à sa première apparition.
- Chaque sortie validée devient l'entrée de l'étape suivante ; l'IA d'une étape a accès à tout ce qui a été validé avant.

### Étape 1 — Recherche & angle

Entrée : un sujet/mot-clé. Sortie : idée confirmée, angle, titre recommandé, promesse.

- **Cadrage strict** : rechercher exactement le sujet formulé par l'utilisateur, jamais une catégorie plus large. Reformuler le sujet en une phrase et le faire confirmer avant de lancer la recherche.
- Si la clé API YouTube est configurée : recherche réelle (section 7) sur deux marchés — **le marché international (anglais)** et **le marché dans la langue de la chaîne** (si la chaîne est en anglais, comparer plutôt marché global vs niche/région de l'utilisateur) — calcul des **vues/jour** (= vues totales ÷ jours depuis publication ; « données encore instables » si < 7 jours), deux tableaux séparés avec pour chaque vidéo : titre-lien, chaîne, date, vues, vues/jour, angle, type de titre. Si vidIQ est connecté, enrichir avec le volume de recherche des mots-clés (`keyword research`).
- Sans clé API : l'utilisateur peut coller une recherche faite ailleurs, ou passer l'étape en saisissant lui-même angle + promesse.
- Synthèse finale : tendances des deux marchés, opportunité identifiée, **3 positionnements** (SÛR — éprouvé à l'international / DIFFÉRENCIANT — angle peu traité / LOCAL — adapté à l'audience du profil), angle recommandé, 1 titre recommandé + 3 alternatives, promesse de la vidéo, brief pour la suite.

### Étape 2 — Hook & intro

Entrée : promesse + angle validés. Sortie structurée :

1. **Hook** : 10–15 secondes à l'oral, **25 à 40 mots maximum** (contrainte dure — l'app affiche le compte de mots et l'estimation en secondes ; au-delà de 40 mots, resserrer). Mécanismes autorisés : fait vérifié surprenant, citation exacte, question qui touche le quotidien du spectateur, comparaison sociale. Le dernier mot du hook annonce ce que la vidéo va livrer. Jamais de promesse que le corps ne tiendra pas.
2. **Texte de présentation fixe** du profil, mot pour mot.
3. **Promesse** : commence obligatoirement par « À la fin de cette vidéo, … » (ou l'équivalent dans la langue de la chaîne : "By the end of this video, …"), sujet de la phrase = le spectateur (« tu » / "you"), jamais « je » (bannir « Dans cette vidéo, je te montre » / "In this video, I'll show you"). Si la vidéo livre 2–3 choses, 2–3 phrases courtes. Ne promettre que ce que le corps livrera.
4. Démarcation facultative (« On ne va pas parler de… ») uniquement si la recherche a montré un terrain saturé.
5. **Phrase de lancement fixe** du profil, mot pour mot, en dernière ligne.

Si le hook installe une idée que le corps développera (une douleur, une comparaison), le signaler : le corps devra être raccourci d'autant. Si le hook utilise une analogie implicite, prévoir la phrase d'équivalence au début du corps.

### Étape 3 — Corps du script

Entrée : hook/intro + promesse + durée cible (demander la durée si absente ; défaut : 4–6 min à l'oral, ~600–900 mots). Structure imposée :

1. **Le problème, en détail** — pourquoi ça concerne le spectateur dans sa réalité.
2. **L'analogie fil rouge** — UNE seule analogie centrale, filée du début à la fin.
3. **Explication** du concept via l'analogie.
4. **Exemple concret** ancré dans le quotidien de l'audience du profil (facture, client WhatsApp, devis…) — hypothétique autorisé s'il est présenté comme tel.
5. **Nuance honnête** — ce que ça ne fait pas, ce qui reste à surveiller.
6. **Transition** — une phrase de pont vers la conclusion, sans l'écrire.

Si expliquer correctement exige un détail technique non vérifié : demander à l'utilisateur, ne pas improviser une explication plausible.

### Étape 4 — Conclusion & CTA

Entrée : le corps réellement écrit. Structure :

1. **Récapitulatif** commençant par « Nous avons pu… » (ou l'équivalent dans la langue de la chaîne) — ne récapituler QUE ce qui a vraiment été montré dans le corps, jamais plus.
2. **Question d'engagement** liée au sujet précis, pour faire réagir en commentaire.
3. **Phrase de clôture fixe** du profil, mot pour mot.

Pas de teaser de prochaine vidéo non confirmé. Ne pas répéter le CTA d'abonnement de l'intro à l'identique (la question d'engagement vient d'abord).

### Étape 5 — Relecture finale

Entrée : script assemblé (hook + intro + corps + conclusion). L'IA agit en relecteur, **elle ne réécrit pas** : elle produit un verdict par point de contrôle (✅ / ⚠️ / ❌) avec, pour chaque problème, une correction proposée que l'utilisateur accepte ou refuse.

Points de contrôle : la promesse du hook et de l'intro est-elle tenue par le corps ? L'analogie reste-t-elle cohérente de bout en bout ? Un fait/chiffre/citation non vérifié s'est-il glissé ? Du jargon non expliqué ? Les textes fixes du profil sont-ils reproduits mot pour mot ? Le CTA de conclusion est-il redondant avec celui de l'intro ? Le récap de conclusion dépasse-t-il ce qui a été montré ?

**Point d'arrêt obligatoire** : le verdict est présenté à l'utilisateur. S'il y a des ⚠️ ou ❌, l'étape 6 ne se lance pas avant sa décision — même en Pilote automatique.

### Étape 6 — Packaging

Entrée : script validé (ou une transcription collée — cette étape doit fonctionner seule, pour les vidéos déjà tournées).

**Trois questions obligatoires avant de générer** (jamais sautées, même en Pilote automatique) :

1. Le **concept visuel de la miniature** — l'IA propose des pistes, l'utilisateur tranche. Sans réponse, pas de prompt de miniature.
2. Les **timecodes** — durée totale et minutes des grands moments. Jamais inventés.
3. Liens/tarifs manquants — les demander plutôt que des placeholders.

Livrable : **3 packagings complets A/B/C**, un par registre de titre — A : bascule émotionnelle, B : résultat concret, C : vidéo de référence. Chaque option = son titre retenu + son concept de miniature + son texte overlay (1–5 mots, majuscules, qui complète le titre sans le répéter) + son prompt de génération d'image (en anglais, détaillé : position, expression, lumière, se terminant par « no text, no watermark »). Prévenir que YouTube ne teste qu'UNE variable à la fois (titres OU miniatures, pas les deux).

Commun aux 3 options :

- **Titres candidats scorés** : 6–8 candidats répartis sur les 3 registres, mot-clé principal dans les premiers mots, < 70 caractères, tableau avec statut (retenu/alternative/réserve/écarté). **Scoring : si le compte vidIQ de l'utilisateur est connecté, utiliser le score de titre vidIQ réel** (et le volume de recherche du mot-clé principal — un volume nul signifie que c'est un angle, pas une requête : le titre doit alors combiner un mot-clé qui a du volume et cet angle). Sinon, repli sur une heuristique IA (clarté, curiosité, mot-clé, longueur) sur 100, clairement étiquetée « score estimé ». Le titre retenu n'est pas forcément le mieux scoré : arbitrer aussi sur le mot-clé en début de titre et la fidélité à la promesse réelle.
- **Description** dans cet ordre : première ligne (titre reformulé + ce qu'on va voir — seule partie visible sans « plus »), contexte factuel vérifié, cas concret en une phrase, « CE QUE TU VAS VOIR » (4 puces réellement montrées), « À NOTER » (la nuance honnête), chapitres depuis les timecodes (premier = 00:00 obligatoire), bloc offre du profil adapté au sujet de la vidéo (l'appel à l'action est une question du type « Dis-moi quelle tâche te prend le plus de temps », pas un « contacte-nous »), coordonnées du profil, appel à l'abonnement, 5 hashtags max. **Pas de section « Qui suis-je »** (le créateur se présente déjà à l'oral).
- **~20 tags** du plus précis au plus large.
- **Commentaire épinglé** (un seul) : nuance honnête à la première personne + question d'engagement + lien communauté.
- **Version dans la langue secondaire du profil** (ex. : packaging anglais pour une chaîne en français, ou l'inverse) : packaging complet réécrit naturellement, pas traduit mot à mot. Avec 3 avertissements systématiques : elle se colle dans Studio → Sous-titres/Langues (pas de deuxième vidéo) ; la vidéo étant parlée dans la langue principale, ajouter en tête la mention « vidéo en [langue], activez les sous-titres » — sans piste de sous-titres réelle, un spectateur attiré par ce titre partira et abîmera la rétention ; la miniature ne se traduit pas (YouTube n'en accepte qu'une). Rappeler qu'un bon score de titre ne compense pas l'absence d'audience construite dans cette langue.
- **Checklist de publication** cochable : miniature vérifiée réduite à 120 px, titre, description (liens cliqués), tags, chapitres, playlist, sous-titres, écran de fin, publication, commentaire épinglé, partage communauté, quel test A/B lancer en premier, contrôle CTR à 24–48 h et rétention à 48–72 h.
- **Note de vérification** : liste des éléments factuels et leur source, et ce qui n'a pas été inventé.

## 7. Intégrations personnelles (chaque utilisateur connecte SES comptes)

Principe : l'app ne contient aucune clé ni compte partagé. Chaque utilisateur saisit ses propres identifiants dans les réglages ; ils sont stockés pour lui seul, jamais affichés en clair après saisie, avec un bouton « Tester la connexion » et « Déconnecter » pour chaque intégration.

### 7a. YouTube Data API v3 (recherche de marché)

- La clé API est saisie par l'utilisateur (jamais codée en dur dans l'app). Afficher un mini-guide « Obtenir une clé gratuite dans Google Cloud Console » et le rappel du quota (10 000 unités/jour ; une recherche complète ≈ 400–500 unités).
- Endpoints utilisés :
  - `search.list` (`part=snippet`, `q=`, `type=video`, `maxResults=25`, `order=viewCount` pour les références historiques ; + `publishedAfter` = 3–12 mois pour les tendances récentes ; `relevanceLanguage=en` puis `fr` ; `videoDuration=long` de préférence pour la passe historique).
  - `videos.list` (`part=snippet,statistics,contentDetails`, jusqu'à 50 ID regroupés par appel).
- Calculer vues/jour côté app avec la date du jour. Étiqueter la métrique « moyenne de vues par jour depuis la publication ».
- Si une vidéo échoue (privée, supprimée) : afficher « non vérifié », jamais une estimation.
- Gestion d'erreurs : clé invalide, quota dépassé → message clair + bascule proposée vers le mode manuel (coller sa recherche).

### 7b. vidIQ (volume de mots-clés et scoring de titres)

- L'utilisateur connecte **son propre compte vidIQ** (connexion au compte ou clé/token API selon ce que vidIQ permet). Aucun compte vidIQ mutualisé.
- Usages dans le pipeline : à l'étape 1, volume de recherche des mots-clés confirmés ; à l'étape 6, score réel des 6–8 titres candidats (dans la langue principale et la langue secondaire).
- Si vidIQ n'est pas connecté ou renvoie une erreur : l'app fonctionne quand même, avec le scoring heuristique IA étiqueté « score estimé » — jamais présenté comme un score vidIQ.
- Rapporter les scores réels tels quels, sans les arrondir ni présumer qu'une langue score mieux qu'une autre.

## 8. Exports

- **Script prompteur** : texte continu (hook → intro → corps → conclusion), sans en-têtes de travail — copie en un clic + mode plein écran.
- **Document complet** : fichier téléchargeable (Markdown et/ou Word) structuré : page de titre (titre retenu, date) → idée & angle → script complet continu → verdict de relecture → packaging FR (3 options) → packaging EN → checklist → note de vérification.
- **Blocs copiables** : chaque élément du packaging (titre, description, tags, commentaire épinglé, prompt miniature) a son bouton « Copier » individuel, affiché en police à chasse fixe.

## 9. Données & technique

- **Persistance** : projets et profil sauvegardés automatiquement et en continu (l'utilisateur ne doit jamais perdre un script sur un rafraîchissement). Si l'hébergement propose des comptes utilisateurs, chaque utilisateur ne voit que ses projets.
- **Génération IA** : chaque étape appelle l'IA avec ses instructions système (règles de la section 6) + le Profil de chaîne + les sorties validées des étapes précédentes. Les réponses de l'IA qui posent une question s'affichent comme un chat ; les sorties finales s'affichent dans le format structuré de l'étape.
- **Langues** : interface FR/EN au choix de l'utilisateur (sélecteur persistant) ; contenu généré dans la **langue principale du profil de chaîne**, packaging aussi dans la langue secondaire. La langue de l'interface est indépendante de la langue du contenu.
- Ne jamais afficher une clé ou un token en clair après saisie.

## 10. Hors périmètre (V1)

Upload/publication directe sur YouTube, analytics de la chaîne, génération d'images de miniatures dans l'app (on livre le prompt), montage vidéo, paiement/abonnement in-app, langues d'interface au-delà de FR/EN.

## 11. Critères d'acceptation

1. Un utilisateur part d'un sujet et obtient un script complet + packaging 3 options sans quitter l'app.
2. Les textes fixes du profil apparaissent mot pour mot dans chaque script généré.
3. Un hook généré ne dépasse jamais 40 mots ; l'app affiche le compte.
4. La promesse générée commence toujours par « À la fin de cette vidéo, … » (ou son équivalent dans la langue de la chaîne).
5. En Pilote automatique, l'app s'arrête : si le sujet est ambigu (étape 1), au verdict de relecture (étape 5), et aux 3 questions du packaging (étape 6).
6. Aucun chiffre, timecode ou fait non fourni/vérifié n'apparaît dans une sortie ; les manques sont marqués « non vérifié » ou demandés.
7. Sans clé YouTube ni compte vidIQ connectés, le pipeline reste utilisable de bout en bout (recherche manuelle, scores étiquetés « estimés »).
8. Un projet en cours survit à une fermeture du navigateur.
9. L'interface bascule intégralement entre français et anglais ; le choix persiste.
10. Chaque utilisateur n'utilise que ses propres clé YouTube et compte vidIQ ; un score affiché comme « vidIQ » provient toujours d'un appel réel à son compte.

---

## Annexe — Profil de chaîne exemple : Envol IA (valeurs de pré-remplissage pour la démo)

- **Chaîne** : Envol IA — vulgarisation de l'IA en français pour un public africain (Abidjan, Douala, Dakar, Cotonou…) : freelances, entrepreneurs, créateurs de contenu. Zéro jargon, tutoiement, analogies du quotidien.
- **Texte de présentation fixe** : « Je m'appelle Baba Kourouma. Je suis titulaire d'un master en génie logiciel à Atlanta, aux États-Unis. Je suis expert en IA et automatisation. Je suis revenu en Afrique pour contribuer à la révolution de l'intelligence artificielle. L'Afrique a raté l'industrialisation, mais la révolution de l'IA, cette révolution-là, on peut et on doit la prendre. Cette chaîne est là pour ça. Chaque semaine, je te montre des contenus qui vont te permettre de maîtriser l'IA, des contenus qui vont te permettre de réellement te faire avancer dans le travail au quotidien. N'oublie pas de t'abonner et d'activer la cloche de notification pour que tu puisses recevoir nos vidéos et aussi pour nous encourager. » (Orthographe : **Kourouma**, jamais « Kuruma ».)
- **Phrase de lancement** : « Tu es prêt ? Let's go ! »
- **Phrase de clôture** : « Si tu as aimé, liker et n'oublie pas de t'abonner pour recevoir nos prochaines vidéos. »
- **Coordonnées** : consultance +225 07 07 66 41 05 · allianceconsultants.net · groupe WhatsApp : https://chat.whatsapp.com/JPmF6GBrDAEB1ETlq3pWYh
- **Bloc offre** : entreprises → diagnostic IA, agents IA sur mesure (service client WhatsApp/site, suivi commandes), automatisation des tâches répétitives, développement logiciel, formation des équipes ; indépendants/freelances/créateurs → accompagnement individuel pour intégrer l'IA dans leur métier, assistant IA sur les tâches chronophages.
- **Durée cible par défaut** : 8–12 minutes (corps 4–6 min).
