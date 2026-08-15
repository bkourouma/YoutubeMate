# YoutubeMate — Différenciateurs et proposition de valeur

Les intégrations Descript et YouTube doivent apparaître parmi les tout premiers différenciateurs. Elles permettent un véritable flux de production, et pas seulement un export de métadonnées.

## Vos meilleurs différenciateurs

- **Pipeline intégré Descript → YouTube** : passage de l’analyse d’une vidéo longue à la création des Shorts, puis à leur publication, sans reconstruire manuellement le workflow entre plusieurs outils.
- **Intégration avancée avec Descript** : lecture des projets disponibles, sélection d’un projet source et création automatique d’une composition verticale pour chaque Short.
- **Préservation du projet Descript original** : la composition source n’est pas modifiée ; de nouvelles compositions sont créées et nommées avec les titres retenus.
- **Construction précise des compositions** : transmission à Descript du texte, des séquences source, des timecodes, de la durée cible et, en option, de la vidéo CTA.
- **Publication directe sur YouTube** : connexion OAuth par utilisateur, ajout automatique du titre, de la description et des tags, puis envoi des vidéos en privé pour vérification.
- **Publication sécurisée par étapes** : bouton permettant de tester le workflow avec une seule vidéo avant de publier tout le lot.
- **Reprise intelligente des publications** : chaque Short est envoyé séparément ; après une interruption, les vidéos déjà publiées sont conservées et le traitement reprend au premier Short manquant.
- **Validation humaine aux moments critiques** : sélection des extraits, titres, concepts de miniature et vérification des compositions Descript avant publication.
- **Continuité entre vidéo longue, Shorts et packaging** dans un espace de travail unique.
- **Personnalisation par profil éditorial et ADN visuel**, avec photo du présentateur et références de miniatures.
- **BYOK sécurisé** pour OpenRouter, OpenAI et Descript, avec clés chiffrées et isolées par utilisateur.
- **Deux routes de production complémentaires** : automatisation avancée avec Descript ou kit de montage structuré pour CapCut.
- **Français et anglais dès le départ.**
- **Export de livrables réellement réutilisables** : Word, CSV, SRT, ZIP CapCut, fiches de publication et ressources de production.

Ces capacités sont visibles directement dans le workflow [`shorts-studio.tsx`](https://github.com/bkourouma/CreatorMate/blob/main/app/shorts-studio.tsx), notamment le chargement des projets Descript, la création des compositions et la publication individuelle vers YouTube.

## Proposition de valeur

> Un cockpit de production éditoriale qui relie l’IA, Descript et YouTube : il transforme une vidéo longue en Shorts, crée directement les compositions dans Descript, puis prépare et pilote leur publication sur YouTube avec validation humaine.

Le différenciateur central du produit est que YoutubeMate ne génère pas seulement des recommandations ou des fichiers à copier-coller. Il agit directement dans la chaîne de production du créateur.
