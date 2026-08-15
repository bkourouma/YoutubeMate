# Préparation à une version hosted

*[English](HOSTED_READINESS.md) · Français*

Ce qui existe, ce qui n'existe pas, et ce qui doit être vrai avant que ceci tourne comme
service payant pour des gens que le propriétaire n'a jamais rencontrés. La seconde liste
est plus longue que la première — c'est normal, et il vaut mieux le dire que de le
découvrir après le lancement.

> **Aujourd'hui, ce n'est pas un produit hosted.** C'est une application mono-locataire
> déployée pour son auteur. Ne l'ouvrez pas au public avant d'avoir traité les P0.

## Déjà en place

Implémenté et couvert par `tests/rendered-html.test.mjs`.

| Capacité | Comment |
|---|---|
| Isolation des secrets par utilisateur | Une ligne chiffrée par utilisateur et par fournisseur, clé primaire composite |
| Chiffrement au repos | AES-GCM, avec `${userId}:${service}` lié comme donnée authentifiée additionnelle : une ligne déplacée d'un utilisateur à l'autre échoue au déchiffrement au lieu de fuir |
| Aucune clé dans le navigateur | Les clés sont résolues côté serveur ; le client ne reçoit que les 4 derniers caractères |
| Cache IA par utilisateur | L'identifiant du propriétaire fait partie du hachage : deux comptes avec la même entrée ne peuvent pas se croiser |
| Registre d'usage | `usage_events` enregistre chaque appel payant avec projet, action, modèle, jetons et coût |
| Projets Shorts séparés | Par utilisateur, avec limites de taille |
| Idempotence des jobs Descript | Empreinte de la requête, portée à l'utilisateur, sur une fenêtre d'une heure |
| OAuth YouTube par utilisateur | Refresh token chiffré, état à usage unique lié à l'initiateur, scope `youtube.upload` uniquement |
| Envoi unitaire avec reprise | Une requête par Short ; un lot interrompu reprend au premier manquant |
| Révocation des jetons | La déconnexion révoque chez Google avant la purge locale ; un `invalid_grant` supprime la connexion |
| Contrôles de propriété R2 | Toute clé fournie par le client est vérifiée contre le préfixe de son espèce |
| Appels sortants bornés | Chaque appel externe porte une échéance explicite |
| Frontière d'authentification | `AUTH_MODE` nomme d'où une identité peut venir ; `DEV_USER_ID` est refusée en production |
| D1 + R2 | Déclarés dans `.openai/hosting.json` |

## À construire

### P0 — bloquant pour toute version hosted publique

**Authentification hosted vérifiée.** `AUTH_MODE=hosted-session` existe et ne renvoie
délibérément rien : aucun fournisseur n'a été choisi. Le défaut actuel fait confiance à un
en-tête posé par l'hébergement ; ailleurs, cet en-tête est falsifiable, et les clés
chiffrées de chaque utilisateur pendent à l'identité qu'il porte. *Aucun fournisseur n'est
sélectionné — Clerk, Auth0, Supabase Auth, Better Auth et l'auto-hébergement restent
ouverts : c'est une décision du propriétaire.*

**Comptes, organisations, membres, rôles.** Il n'y a qu'une chaîne d'identité, aucune
notion de compte et encore moins d'équipe. Tout ce qui suit le suppose.

**Vérification OAuth Google.** L'écran de consentement n'a pas été soumis. Une application
non vérifiée est plafonnée à quelques utilisateurs de test, et le nom de l'application est
examiné — d'où la nécessité que le renommage atterrisse d'abord. Voir
`BRAND_RENAME_CHECKLIST.md`.

**Audit de quota YouTube.** Le quota par défaut est de 10 000 unités par jour et un envoi
coûte environ 1 600 — soit à peu près **six envois par jour, tous utilisateurs confondus**.
Un service multi-utilisateurs exige un audit et une augmentation, et l'audit réclame un
produit fonctionnel et une revue de conformité.
<https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits>

**Suppression de compte et export des données.** Exigé par le RGPD dès que des résidents
de l'UE sont servis, et simplement correct partout ailleurs. Supprimer un compte doit
couvrir les lignes D1, les objets R2, l'autorisation YouTube chez Google et le registre
d'usage.

### P1 — nécessaire tôt, pas le premier jour

- **Budgets, limites et réservations de crédits.** Le registre enregistre ce qui a été
  dépensé ; rien ne l'arrête. Un utilisateur peut dépenser sans borne, et un bug plus vite.
- **Limitation de débit par utilisateur et par IP** sur chaque route qui coûte de l'argent.
- **Files d'attente durables.** La génération des chapitres et les lots de Shorts sont
  pilotés depuis le navigateur, une requête à la fois. C'était le bon choix face aux
  limites de temps des Workers, mais un onglet fermé arrête le travail.
- **Journal d'audit.** Qui a connecté quoi, supprimé quoi, dépensé quoi.
- **Observabilité structurée** avec identifiant de requête et masquage au niveau de la
  journalisation, pour qu'un jeton ne puisse pas atteindre un log via une ligne future.
- **Rotation des clés de chiffrement**, ou chiffrement par enveloppe. Aujourd'hui
  `SETTINGS_ENCRYPTION_KEY` est unique et permanente : impossible à faire tourner sans
  rendre toutes les clés stockées illisibles. Position intenable pour un service ; le
  correctif est un identifiant de clé par ligne.
- **Politique de rétention D1 et R2**, avec expiration réelle plutôt que croissance infinie.
- **URLs de médias privées ou signées.** La photo et les miniatures de référence passent
  aujourd'hui par une route authentifiée ; une version hosted devrait signer et expirer.
- **Sauvegarde, restauration et plan de reprise testé.** Une sauvegarde non testée est un
  ornement.

### P2 — avant ou peu après le lancement

- Abonnements et plans.
- CGU, politique de confidentialité, accord de traitement, liste des sous-traitants.
- Conformité ARTCI pour la Côte d'Ivoire, et RGPD dès que des résidents de l'UE sont servis.
- Page de statut, processus d'incident, canal de support.
- Adaptateur portable de base de données et de stockage, si quitter Cloudflare compte un jour.
- Support Docker — **uniquement si un Dockerfile fonctionnel existe** ; il n'y en a aucun
  aujourd'hui, et le README ne doit pas laisser croire le contraire.

## L'ordre qui fonctionne vraiment

1. Renommer et sécuriser la marque — tout ce qui est visible dépend d'un nom arrêté.
2. Choisir la licence — sans elle, le dépôt n'accorde aucun droit à personne.
3. Authentification hosted — tout le multi-locataire en dépend.
4. Budgets et limites de débit — avant que des inconnus puissent dépenser, pas après.
5. Vérification OAuth Google et audit de quota — les deux prennent du temps externe :
   commencez tôt.
6. Suppression, export et rétention — exigés légalement, et moins coûteux à concevoir
   qu'à rattraper.
7. Files d'attente, journal d'audit, observabilité, rotation des clés.
8. Plans, facturation, documents juridiques, page de statut.

Le backlog avec critères d'acceptation est dans `HOSTED_ROADMAP.md`.
