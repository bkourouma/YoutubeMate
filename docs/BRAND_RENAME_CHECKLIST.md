# Brand rename — YoutubeMate → CreatorStudio

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

## Confusion risk with the chosen name

"Creator Studio" is not distinctive. In August 2026 it is already in use by:

- Apple — <https://www.apple.com/apple-creator-studio/>
- Meta — <https://creatorstudio.facebook.com/install>
- and colloquially for YouTube Studio, which is the very association we are trying to drop.

So the rename trades a guideline violation for a crowded name. That is an improvement, not
a resolution. Expect poor search ranking on the product name alone, and expect a trademark
search to surface prior rights. **A fallback to a more distinctive name must stay on the
table** until a professional says otherwise; because every surface now reads from
`app/config/product.ts`, that fallback is a one-line change plus the external rows below.

## Matrix

| Item | Current value | Target value | Owner | Status |
|---|---|---|---|---|
| Interface (sidebar, titles, alerts) | via `app/config/product.ts` | CreatorStudio | code | **done** — enforced by test |
| HTML metadata / OpenGraph title | via `product.name` | CreatorStudio | code | **done** |
| Word export header, footer, fallback | via `productName` | CreatorStudio | code | **done** |
| OpenRouter `x-title` header | via `product.name` | CreatorStudio | code | **done** |
| npm package name (private) | `creatorstudio` | `creatorstudio` | code | **done** — never published |
| Test guarding hard-coded names | present | present | code | **done** |
| GitHub repository name | `bkourouma/YoutubeMate` | to decide | owner | **to do — external** |
| Git remote + existing clone URLs | old name | new name + redirect | owner | **to do — external** |
| `product.repositoryUrl` / `supportUrl` | old repo URL | new repo URL | owner | **blocked** by the row above |
| Domain name | none | to acquire | owner | **to do — external** |
| Support / security contact address | placeholder in `SECURITY.md` | real address | owner | **to do — external** |
| Google Cloud project + OAuth client name | old name | new name | owner | **to do — external** |
| OAuth consent screen (app name, logo, homepage, policy URLs) | old name | new name | owner | **to do — external** |
| Published screenshots and demo video | old name visible | re-capture | owner | **to do** |
| README (en + fr) | mixed | new name, historical note kept | code | **to do — this PR** |
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
