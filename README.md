# CreatorMate

*English · [Français](README.fr.md)*

[![CI](https://github.com/bkourouma/YoutubeMate/actions/workflows/ci.yml/badge.svg)](https://github.com/bkourouma/YoutubeMate/actions/workflows/ci.yml)

**An editorial production cockpit that acts inside your production chain.** It turns a long video into Shorts, creates the compositions directly in Descript, then prepares and drives their upload to YouTube — with a human check at every step that matters.

It does not only recommend, and it does not only hand you files to copy and paste. That is the difference worth knowing before reading further.

One workshop for two YouTube formats, with one database, one profile and one set of keys. The interface itself runs in French or English.

> **Formerly YoutubeMate.** Google's branding guidelines forbid "YouTube" in an application's name, so the product is being renamed. The new name is **not legally cleared yet** — see [docs/BRAND_RENAME_CHECKLIST.md](docs/BRAND_RENAME_CHECKLIST.md).
>
> **Licensed under [AGPL-3.0-or-later](LICENSE).** You may use, modify and self-host this freely; if you offer a modified version as a network service, your modifications must be published under the same licence. A separate commercial licence is available from the copyright holder — see [docs/LICENSING_DECISION.md](docs/LICENSING_DECISION.md).
>
> **There is no hosted version and no Docker image.** Self-hosting is the only way to run this today, and it is single-tenant — see [docs/HOSTED_READINESS.md](docs/HOSTED_READINESS.md).

## The Descript → YouTube pipeline

This is where other tools stop. From a transcript, the app cuts self-contained excerpts with their source timecodes, proposes scored titles, writes the descriptions, tags and thumbnail concepts — then:

1. **reads your Descript projects** and lets you pick the source;
2. **creates one vertical composition per Short inside it**, named with the title you chose, carrying the text, the source sequences, the timecodes, the target duration and optionally your CTA clip;
3. **leaves the source composition untouched** — it adds, it never rewrites your edit;
4. **uploads to YouTube one video at a time**, private, with title, description and tags, behind a *Test with 1 video* button that proves the path before you commit a batch;
5. **resumes at the first missing Short** after an interruption, re-uploading nothing.

Matching between a Short and its composition is by exact name, so renaming one in Descript surfaces as a clear error instead of publishing the wrong video.

### Descript integration or CapCut kit

Two routes, and the difference is not a preference:

- **Descript** is a real integration. The app talks to your account, creates the compositions and drives the upload.
- **CapCut** exposes no public API for building a timeline. The kit is not a lesser integration, it is the honest substitute: a ZIP holding the edit plan as CSV — one row per sequence to cut — each Short's text, SRT subtitles, the publishing sheet, the optional CTA clip and a read-me. Everything that can be prepared in advance is; the cutting is yours.

## Community / self-hosted

Everything here runs on your own Cloudflare account with your own API keys, encrypted at rest and bound to your identity. It is **single-tenant today**: one deployment, one owner. Read [docs/HOSTED_READINESS.md](docs/HOSTED_READINESS.md) before exposing it to anyone else — there is no verified authentication provider, no rate limiting and no account deletion workflow yet.

## Hosted — planned

Not available. Nothing is running, nothing accepts sign-ups, nothing can be paid for. The gap between here and there is written down in [docs/HOSTED_READINESS.md](docs/HOSTED_READINESS.md), with the backlog in [docs/HOSTED_ROADMAP.md](docs/HOSTED_ROADMAP.md).

## Documentation

| | |
|---|---|
| [Debugging](docs/DEBUGGING.md) · [fr](docs/DEBUGGING.fr.md) | Setup, environment variables, symptom → fix, integration checks |
| [Contributing](CONTRIBUTING.md) | Branches, migrations, testing integrations, rules for routes that spend money |
| [Security](SECURITY.md) | Private reporting, what is protected and what is not |
| [Hosted readiness](docs/HOSTED_READINESS.md) · [fr](docs/HOSTED_READINESS.fr.md) | What exists, what does not |
| [Roadmap](docs/HOSTED_ROADMAP.md) | Prioritised backlog with acceptance criteria |
| [Licensing](docs/LICENSING_DECISION.md) | Why AGPL-3.0, and what it commits the project to |
| [Brand rename](docs/BRAND_RENAME_CHECKLIST.md) | What is done, what only the owner can do |
| [Decisions](docs/adr/) | Architecture decision records |

<!-- Screenshots and a demo recording go here once the rename reaches the interface
     captures. No placeholder is committed: a fake or broken screenshot is worse than none. -->

## The four entry points

The menu is organised not by tool but by **what you already have in hand**: a subject, a long video to cut up, a video already recorded, a short already edited. Each entry carries a subtitle naming who it is for, so no choice requires opening the screen to understand it.

| Menu | Subtitle | You have… | You get… |
|---|---|---|---|
| ✍ **Script Studio** | Write a long video | a subject | a full script and its packaging |
| ✂ **Shorts Studio** | Cut a video into Shorts | a long video | edited, published shorts |
| 🎬 **Video package** | Long video already recorded | a recorded script | titles, description, tags, thumbnails |
| ⚡ **Short package** | Short already edited | one or more shorts | titles, descriptions, vertical thumbnails |
| ▤ **My projects** | | | the history, with its counter |
| ◉ **My channel & settings** | | | profile, keys, photo, visual DNA |

The first two entries **produce the video**; the next two **dress a video that already exists**. "Package" deliberately brings them together: it is the same step of the craft, applied to two formats.

## The pipelines

**Script Studio — 7 steps.** Research & angle · Hook & intro · Chapter validation · Script body · Conclusion & CTA · Final review · Packaging. The body is written **one chapter at a time**: each chapter goes out as its own request and is saved the moment it returns. An interruption costs only the chapter in flight, and restarting resumes at the first missing one.

**Shorts Studio — 4 stages.** Source · Excerpts · Titles · Metadata. From a transcript, the AI cuts self-contained excerpts with their source timecodes, proposes scored titles, then the descriptions, tags and thumbnail concepts. Two production routes follow, your choice:

- **Descript** — build the compositions, then upload to YouTube **one video at a time**, with a *Test with 1 video* button before committing to the batch. Matching is by composition name: renaming inside Descript breaks the link, and the error message says so.
- **CapCut kit** — CapCut exposes no public API for building a timeline. The kit replaces that step: a ZIP holding the edit plan as CSV (one row per sequence to cut), each short's text, SRT subtitles, the publishing sheet, an optional CTA video and a read-me. Timings marked as estimated — derived from a transcript without timestamps — are flagged as such.

**Video package.** Three mandatory checks, pre-filled from your profile and your script (chapter timecodes are computed from the real script); the visual concept is optional, and the AI proposes one otherwise. Then the real packaging engine starts on its own.

**Short package.** One short at a time, or up to **10 titles pasted at once** — in bulk mode the best title is selected automatically.

## Packaging: A/B/C, and how to steer it

Every packaging run produces **three complete options** — title, description, thumbnail concepts — built for a YouTube A/B test (which only ever tests one variable at a time: titles **or** thumbnails).

A **"Steer the three options"** field sits above them. Write the editorial direction you want, or start from a suggestion (*More provocative*, *More concrete*, *Beginner angle*, *Stress that it is free*, *Calmer tone*), and all three options are rewritten to follow it.

Two details separate a direction that is actually followed from a variant in disguise:

- **The rejected titles travel with the request.** Without them a model returns rephrasings very close to what you just discarded. It is explicitly told not to offer them again.
- **A steered regeneration switches to the writing model**, with high reasoning effort and a lowered temperature. Holding a brief across three coherent *and genuinely distinct* options is a reasoning task, not a rephrasing one. The first generation stays on the fast model: the cost only rises when it buys something, and the block states which model will be used.

## Thumbnails

**Concepts are free, the image is not.** The AI proposes three concepts per option; a single image is produced, after you choose.

- **Editable prompt.** Each concept's prompt can be edited by hand, or rewritten by the AI from an instruction ("darker background, close-up on the phone").
- **View without downloading.** One click opens the thumbnail full size; downloading stays a separate gesture.
- **Format respected.** Dimensions are transposed per pipeline: landscape for long form, portrait for shorts — never a 16:9 image cropped to 9:16.
- **Your photo.** If a presenter photo is saved, it is sent with the request and the identity instruction overrides the rest of the prompt: the face must be **yours**, not an interpretation. Reference thumbnails serve the channel's recurring style, never to copy one composition.

## My channel & settings

One screen for both pipelines: **Keys & connections** (OpenRouter, OpenAI, Descript, YouTube, models and image quality) · **Your photo in thumbnails** · **Thumbnail visual DNA** (the editorial system, inferred from your reference thumbnails and refinable by instruction) · the editorial profile and the automatic description block.

## Principles

**Nothing is invented.** The guardrails forbid figures, sources and promises absent from the supplied context. The channel's fixed copy (introduction, opening, closing) is reproduced word for word. Title scores are announced as the AI's editorial estimates, never as vidIQ data.

**Nothing is lost.** Every long generation advances in pieces and persists as it goes: one chapter, one short, one upload. Requests retry on their own before giving up. What you type always outranks what the server returns: a late response cannot overwrite a project started in the meantime, and a failed save is announced rather than swallowed.

**Nothing is spent without intent.** A single image after your choice, a reasoning model only where it earns its place, and analysis, title and metadata results cached per user.

**Nothing is lost from view.** Messages stack in the top-right corner instead of replacing one another, count their repetitions, freeze on hover and close on Escape — an error can no longer be wiped out by the success that follows it.

## Getting started

```bash
npm install
cp .env.example .env      # then fill it in (see below)
npx vinext dev --port 3100
node scripts/apply-local-migrations.mjs   # once, after the first start
```

The `npm run dev` / `build` scripts use POSIX syntax that fails on Windows; call `npx vinext …` directly.

### Environment variables

| Variable | Role |
|---|---|
| `SETTINGS_ENCRYPTION_KEY` | **Required.** Encrypts API keys at rest (AES-GCM). Never change it afterwards: the stored keys would become unreadable. |
| `DEV_USER_ID` | Local development only — stands in for the identity header. **Must be absent in production**, otherwise every anonymous visitor inherits that identity, and therefore your keys. |
| `ADMIN_USER_ID` | Optional. Lets this user fall back to the server-side keys. |
| `ALLOWED_USER_IDS` | Optional. Restricts the application to a list of identifiers. |
| `PUBLIC_APP_ORIGIN` | Public origin, required in production. Used for the OAuth redirect URI and for the media URL sent to Descript, without ever trusting the `Host` header. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | YouTube connection. OAuth "Web application" client, redirect `<origin>/api/youtube/callback`, "YouTube Data v3" API enabled. |
| `VIDIQ_SCORE_ENDPOINT` | Personal vidIQ relay for real title scores. |

**API keys (OpenRouter, OpenAI, Descript) do not belong in `.env`** in normal use: you enter them in the application, they are tested against the provider before being saved, then encrypted server-side and bound to your account. The browser only ever receives their last four characters.

## Security

Every route that spends credits requires an authenticated identity and resolves the key server-side; none accepts a key in the request body. The YouTube refresh token is encrypted, per-user, and the OAuth state is single-use and bound to whoever started the flow. Client-supplied project identifiers are validated and encoded before reaching a Descript URL. Every outbound call has a deadline.

These properties are covered by the test suite: a regression fails the build.

## Verification

```bash
npx tsc --noEmit
npm run lint
npx vinext build
node --test tests/rendered-html.test.mjs
```

The suite boots the real worker and checks the rendering, the route contracts and a set of invariants — no key in a request body, no shared fallback identity, Shorts styles confined, thumbnail ratios correct per format, a late server response unable to overwrite a local edit.

## Architecture

```
app/
  script-studio.tsx     shell (nav, language, alerts, persistence, profile) + long-form pipeline
  shorts-studio.tsx     shorts pipeline, rendered under .pipeline-shorts
  shorts-express.tsx    packaging for an already-edited short, single or bulk
  globals.css           shared styles · shorts.css  shorts styles, all scoped
  lib/capcut-kit.ts     CapCut ZIP construction, loaded on demand
  server/               identity, secrets, http, poll, youtube, ai-cache, image-framing
  api/                  routes; the shorts-* routes are prefixed
db/schema.ts            workspaces, integration_settings, ai_cache, shorts_projects,
                        descript_jobs, youtube_auth, oauth_states
```

Every Shorts style is scoped by `.pipeline-shorts`: the two stylesheets share seventeen class names, and this constraint — enforced by a test — makes the collision impossible rather than unlikely.

No interface text falls below 9px: the low end of the type scale was raised monotonically, keeping the relative hierarchy intact and growing the fixed-height blocks with it, since otherwise more readable text would simply have shown fewer lines.
