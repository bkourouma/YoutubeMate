# Brand rename — YoutubeMate → CreatorMate

**Status: not cleared.** The code rename is done and reversible. The name itself has not
been checked by anyone qualified to check it, and the sections below say so item by item.
Do not announce the name publicly until the clearance rows are green.

## Why the rename

Google's branding guidelines state that an application must not use "YouTube", "YT" or a
confusable variant in its overall name:
<https://developers.google.com/youtube/terms/branding-guidelines>

`YoutubeMate` does. That is a launch blocker independent of any trademark question, and it
also has to be resolved before the OAuth consent screen is submitted for verification —
Google reviews the application name at that point.

## Why not "CreatorStudio"

That was the first candidate and it was dropped. "Creator Studio" is not distinctive: in
August 2026 it is already used by Apple (<https://www.apple.com/apple-creator-studio/>),
by Meta (<https://creatorstudio.facebook.com/install>), and colloquially for YouTube
Studio — the exact association the rename exists to drop. It would have traded a guideline
violation for a crowded name, with poor search ranking and a trademark search near-certain
to surface prior rights.

**CreatorMate** is materially more distinctive, and it keeps continuity with the former
name, which matters for anyone who already knows the project.

## Still not cleared

More distinctive is not the same as available. None of this has been checked:

- trademark registers in the target territories;
- the domain, the social handles, the npm name, the GitHub organisation;
- how the name ranks in a search against existing products.

Do not announce it publicly until those are done. If any of them fails, the fallback is a
one-line change in `app/config/product.ts` plus the external rows below — an escape route
this rename has now exercised once, from CreatorStudio to CreatorMate, with no source file
outside that module touched.

## Matrix

| Item | Current value | Target value | Owner | Status |
|---|---|---|---|---|
| Interface (sidebar, titles, alerts) | via `app/config/product.ts` | CreatorMate | code | **done** — enforced by test |
| HTML metadata / OpenGraph title | via `product.name` | CreatorMate | code | **done** |
| Word export header, footer, fallback | via `productName` | CreatorMate | code | **done** |
| OpenRouter `x-title` header | via `product.name` | CreatorMate | code | **done** |
| npm package name (private) | `creatormate` | `creatormate` | code | **done** — never published |
| Test guarding hard-coded names | present | present | code | **done** |
| GitHub repository name | `bkourouma/YoutubeMate` | to decide | owner | **to do — external** |
| Git remote + existing clone URLs | old name | new name + redirect | owner | **to do — external** |
| `product.repositoryUrl` / `supportUrl` | old repo URL | new repo URL | owner | **blocked** by the row above |
| Domain name | none | to acquire | owner | **to do — external** |
| Support / security contact address | placeholder in `SECURITY.md` | real address | owner | **to do — external** |
| Google Cloud project + OAuth client name | old name | new name | owner | **to do — external** |
| OAuth consent screen (app name, logo, homepage, policy URLs) | old name | new name | owner | **to do — external** |
| Published screenshots and demo video | old name visible | re-capture | owner | **to do** |
| README (en + fr) | CreatorMate | CreatorMate, historical note kept | code | **done** |
| Legal notices, terms, privacy policy | none | to draft | owner | **to do** |
| Trademark clearance in target territories | not done | cleared or fallback | professional | **to do — blocking** |
| Domain / social handles / npm / GitHub org availability | not checked | checked | owner | **to do — blocking** |

## What a code change cannot do

Renaming the GitHub repository, acquiring the domain, setting up redirects and updating
the Google OAuth client are **operations outside this repository**. Editing a string here
does not perform them, and must not be reported as if it had. Until the repository is
renamed, `product.repositoryUrl` deliberately still points at the old URL: a link that
404s is worse than a link that names the past.

Existing identifiers stay as they are on purpose:

- applied D1 migrations and table names;
- R2 key prefixes (`presenter-photo/`, `reference-thumbnails/`, `brand-logo/`);
- Git history and past commit messages;
- `product.formerName`, kept so migration notes can say what the product used to be
  called.

Renaming any of those would break stored data or rewrite history for no benefit.

## Before any public launch

1. Commission a trademark availability search in the territories actually targeted —
   at minimum Côte d'Ivoire / OAPI, the EU and the US — and have a qualified professional
   read the result. Do not self-assess.
2. Check availability of the domain, the social handles, the npm name and the GitHub
   organisation together: taking the name on one and losing it on another is the common
   failure.
3. Search the name as a user would, and record whether the product is findable at all
   against Apple and Meta.
4. If any of that fails, pick a more distinctive name and change `app/config/product.ts`
   plus the external rows. Nothing else in the codebase should need touching — and if it
   does, that is a bug in the centralisation.
5. Keep descriptive uses of "YouTube" wherever they refer to the platform, its API, its
   rules or its quota. Those are accurate and permitted; the guideline is about the
   product's own name.
