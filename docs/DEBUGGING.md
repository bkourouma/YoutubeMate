# Debugging guide

*English · [Français](DEBUGGING.fr.md)*

Everything here can be run without a production credential. Where a check needs a real
account, it is marked **manual** and says what it does not prove.

## Setup

Node `>=22.13.0`, as declared in `package.json`. Check with `node -v`; a lower version
fails on syntax rather than on a clear message.

```bash
npm ci                    # not `npm install` — the lockfile is the point
cp .env.example .env
```

### First run, in this exact order

```bash
npm run dev                                # 1. creates the local D1 state
node scripts/apply-local-migrations.mjs    # 2. applies drizzle/*.sql to it
npm run dev                                # 3. restart, tables now in place
```

Step 2 cannot come first. The Miniflare D1 file under
`.wrangler/state/v3/d1/miniflare-D1DatabaseObject/` does not exist until the dev server
has started once, so the script has nothing to apply and every later request fails on a
missing table.

### How the local stack fits together

- **Vinext + Vite** compile the Next.js App Router into a Cloudflare Worker.
- **Miniflare** runs that worker locally. There is no `wrangler.toml`; the bindings are
  declared inline in `vite.config.ts`.
- **D1** is SQLite. Locally it is a file under `.wrangler/state/`; deployed it is a
  Cloudflare database. `.openai/hosting.json` declares the bindings for the current
  hosting — do not delete it.
- **R2** stores reference thumbnails, the presenter photo and the brand logo, each under
  its own key prefix.
- **Drizzle** owns the schema. `npm run db:generate` writes a migration from
  `db/schema.ts`; it is never applied automatically.

### Commands

```bash
npm run typecheck    # tsc --noEmit
npm run lint
npm run build        # writes dist/, which the tests load
npm run test         # build + tests
npm run test:only    # tests against the existing dist/
npm run verify       # all of the above, in order
```

### Three environments, not one

| | Local | Current hosting | Future hosted version |
|---|---|---|---|
| Identity | `DEV_USER_ID` | `oai-authenticated-user-id` header | not built — see `docs/HOSTED_READINESS.md` |
| D1 / R2 | Miniflare files | Cloudflare | Cloudflare |
| `NODE_ENV` | development | production | production |

A bug that only appears in one of these is usually an identity bug. Read the `AUTH_MODE`
section below before assuming otherwise.

## Environment variables

No real value appears in this document, in `.env.example`, or in any test.

| Variable | Role | Where | Required | Missing → | Care |
|---|---|---|---|---|---|
| `SETTINGS_ENCRYPTION_KEY` | AES-GCM key encrypting stored API keys | all | **yes** | `settings_storage_unavailable`; keys unreadable | **Never change it after keys are stored** — they become permanently undecryptable. Not recoverable. |
| `DEV_USER_ID` | Stands in for the whole auth layer locally | local only | no | 401 everywhere locally | **Refused when `NODE_ENV=production`.** In production it would give every anonymous visitor the same identity, and that identity's keys. |
| `AUTH_MODE` | Where an identity may come from: `trusted-proxy-header`, `dev`, `hosted-session` | all | no | defaults to `trusted-proxy-header` | Only set `trusted-proxy-header` when a proxy you control sets the header. Anywhere else it is forgeable. `hosted-session` returns nothing — no provider exists yet. |
| `ADMIN_USER_ID` | Lets one id fall back to server-side keys | all | no | that fallback is off | Anyone holding this id spends the deployment's own credits. |
| `ALLOWED_USER_IDS` | Comma-separated allowlist | all | no | everyone authenticated is allowed | The cheapest way to keep a deployment private. |
| `PUBLIC_APP_ORIGIN` | The app's real public origin | production | **yes in production** | `public_origin_not_configured`; OAuth redirect mismatch | Used for the OAuth redirect URI and the media URL handed to Descript, precisely so neither is derived from an untrusted `Host` header. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | YouTube OAuth client | where YouTube is used | for YouTube | `google_client_not_configured` | Rotating the secret disconnects every user of that client. |
| `OPENROUTER_API_KEY` / `OPENAI_API_KEY` / `DESCRIPT_API_TOKEN` | Server-side fallback for `ADMIN_USER_ID` only | optional | no | admin falls back to nothing | Normal users' keys live encrypted in D1. These are not a general default. |
| `VIDIQ_SCORE_ENDPOINT` | Personal vidIQ relay | optional | no | scores stay AI estimates | Estimates must never be presented as vidIQ data. |

## Symptom → cause → safe check → fix

| Symptom | Probable cause | Safe check | Fix |
|---|---|---|---|
| `authentication_required` (401) | No identity resolved | `GET /api/usage` — 401 confirms it is identity, not the route | Local: set `DEV_USER_ID` and confirm `NODE_ENV` is not `production`. Deployed: confirm the proxy sets the header and `AUTH_MODE=trusted-proxy-header`. |
| `user_not_allowed` (403) | Identity is not in `ALLOWED_USER_IDS` | Compare the id with the list — log neither in full | Add the id, or clear the variable |
| `integration_not_configured` (503) | No key stored for that provider | Settings → Keys & connections shows the last four characters | Re-enter the key; it is tested with the provider before being saved |
| `settings_encryption_key_missing` | `SETTINGS_ENCRYPTION_KEY` unset | Is it in the environment? | Set it. If it was **changed**, stored keys are gone: delete and re-enter them |
| D1 `DB binding unavailable` | Binding missing | Check `vite.config.ts` locally, `.openai/hosting.json` deployed | Restore the binding; do not delete the hosting file |
| No local D1 database | Migrations run before the first dev start | Look for a `.sqlite` under `.wrangler/state/v3/d1/` | Run the three-step first-run order above |
| Migration fails | Applied out of order, or non-additive | `node scripts/apply-local-migrations.mjs` prints what it applied and what was already there | Locally: delete the `.sqlite` and replay. Deployed: never delete — write a corrective additive migration |
| Vinext / Vite build error | Node too old, or a Worker-incompatible import | `node -v`; read the first error, not the last | Match the version in `engines`. A `cloudflare:workers` import must be dynamic, or the module fails to load outside workerd |
| `WRANGLER_LOG_PATH=… is not recognized` | Old POSIX-only script on Windows | `npm run dev` | Already fixed with `cross-env`; pull `main` |
| `redirect_uri_mismatch` (Google) | Registered URI differs from the one sent | Compare `PUBLIC_APP_ORIGIN` + `/api/youtube/callback` with the Google console, character for character | Make them identical — scheme, host, port, no trailing slash |
| OAuth refused or expired | The user declined, or the state expired | Restart the connection from Settings | The state is single-use and time-limited by design; a replayed link cannot work |
| `youtube_not_connected` | No grant, or the refresh token is dead | Settings shows the connection state | Reconnect. An `invalid_grant` now drops the stored connection automatically instead of failing forever |
| YouTube quota exhausted | Daily project quota spent | Google Cloud console → quotas | Wait for the reset, or request an increase. An upload costs ~1600 units of a 10,000 default: **about six uploads a day** |
| `composition_not_found` | The composition was renamed in Descript | The error echoes the title it looked for | Rename it back to exactly that title, or re-run creation |
| Descript project not found | Wrong project, or a key without access | Settings → test the Descript key | Reselect the project from the list |
| Composition creation stuck or timing out | The agent job is slow or stalled | Polling is bounded and returns `descript_timeout` | Re-run: an identical request inside the hour reuses the same job instead of paying twice |
| One Short fails mid-batch | Provider hiccup on that item | Already-uploaded Shorts are kept | Re-run the batch: it resumes at the first missing Short, and re-uploads nothing |
| `reference_forbidden` (403) | An R2 key that does not match its own prefix | Presenter photos live under `presenter-photo/`, style references under `reference-thumbnails/` | Was a real bug once: the presenter photo was checked against the style prefix. Pull `main` |
| Presenter photo refused | Format the browser could not convert | The message names the MIME type | iPhone HEIC is the usual cause: export as JPEG |
| Thumbnail shows the wrong face | A written description competing with the photo | Does the editorial system prompt describe the presenter in words? | Remove the description. The photograph must be the only source of the face — see `docs/BRAND_RENAME_CHECKLIST.md` for where prompts live |
| Thumbnail text wrong or missing | Concept prompt and composer contradicting each other | Both used to be sent | Fixed: the ban on lettering is stripped when a headline is requested |
| Workspace too large to save (413) | Payload above the limit | The alert says so explicitly | Archive old projects; a Shorts project holds its full transcript |
| Save failure | D1 unreachable | The header shows the save state | Never silent — a failed save is announced |
| Cost showing zero | Provider returned no cost, or nothing was recorded | Credits Usage → Call log | OpenRouter reports its own cost; image costs are computed from tokens and are estimates |
| Suspected cross-user cache | **Must never happen** | Cache keys hash the owner id | Treat as a security bug and follow `SECURITY.md` |
| Network dropped mid-generation | Connection lost | The alert distinguishes this from a provider error | Requests retry themselves; long generations resume at the first missing item |

## Checking each integration

Never read a key to test it. Every check below uses the app's own path.

**OpenRouter** — Settings → Keys & connections → Save. The key is verified against
`/api/v1/key` before being stored. A generation failure after that is not a key problem:
`openrouter_request_failed` means the provider refused (credits, model access),
`openrouter_timeout` means it was too slow, `openrouter_invalid_response` means the model
returned something unusable — try another model.

**OpenAI** — same screen. Image failures are usually the model or the size: only
`gpt-image-2` and `gpt-image-1.5` are accepted, each with its own size family.

**Descript** — Shorts Studio → load the project list. An empty list with no error means
the key works but the account has no project. `descript_timeout` on creation is the agent
being slow, not a bad key.

**YouTube** — Settings shows the connected channel. `youtube_not_connected` after it
worked means the grant was revoked or expired. Reconnecting is the fix; the app now drops
a dead token by itself.

Useful logs: the dev server's own output, and the browser Network tab. Both can contain
an `Authorization` header — never paste either without redacting.

**Manual checks that no automated test covers.** These need a real account, and the
suite says so rather than faking them:

1. Descript composition creation against a real project, and that the source composition
   is untouched afterwards.
2. Composition-name matching after renaming one in Descript — the one hypothesis never
   validated in production.
3. A real YouTube upload, using *Test with 1 video* before any batch.
4. Disconnecting and confirming the app is gone from
   <https://myaccount.google.com/permissions>.

## Redaction rules

- Never show a full key, refresh token, access token, `Authorization` header, cookie,
  OAuth code or signed URL. Four last characters are enough to identify a key.
- Remove private scripts, transcripts, presenter photos and unpublished titles from
  anything public.
- Screenshots leak: check the Network tab and the sidebar before posting one.

### Report template

```text
Symptom:        <what you saw, and what you expected>
Error code:     <verbatim, e.g. composition_not_found>
Screen:         <Script Studio / Shorts Studio / …>
Steps:          1. … 2. … 3. …
Commit:         <git rev-parse --short HEAD>
Environment:    <OS, node -v, browser>
Provider:       <OpenRouter / OpenAI / Descript / YouTube>
Model:          <model id, if relevant>
Key:            <last four characters only, or "configured">
Already tried:  <what you checked>
Logs:           <redacted>
```

### Rollback

1. `git revert <commit>` — prefer reverting to resetting; the history is shared.
2. **Never revert a migration by deleting a table.** Applied migrations are additive;
   write a corrective one.
3. `npm run verify` before redeploying.
4. After deploying: load the app, confirm the identity resolves, confirm Settings still
   shows the stored keys by their last four characters, and run one cheap generation.
5. If `SETTINGS_ENCRYPTION_KEY` was involved, stop. A rollback cannot recover keys
   encrypted under a different one; users must re-enter them.
