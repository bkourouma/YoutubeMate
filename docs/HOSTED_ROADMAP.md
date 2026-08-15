# Backlog — open source and hosted

Each item is written so it could be opened as a GitHub issue unchanged. Priority,
dependencies and acceptance criteria are stated; anything that cannot be verified is not
an acceptance criterion.

Suggested labels: `priority:P0` `priority:P1` `priority:P2` `security` `oauth` `descript`
`youtube` `hosted` `documentation` `good first issue`.

---

## P0-1 — Complete the CreatorStudio rename and clear the name

`priority:P0` `documentation`
**Depends on:** nothing. **Blocks:** P0-5, and every public communication.

The code rename is done and centralised in `app/config/product.ts`. What remains is
outside this repository.

**Done when:** a trademark search has been run in the targeted territories and read by a
qualified professional; the domain, social handles, npm name and GitHub organisation have
been checked together; the GitHub repository is renamed with redirects in place;
`product.repositoryUrl` and `supportUrl` point at the new location; the Google OAuth
client and consent screen carry the new name; screenshots are re-captured; and every row
of `BRAND_RENAME_CHECKLIST.md` is green **or** the fallback name has been chosen and
applied by editing that one module.

---

## P0-2 — Select and apply the open-source licence

`priority:P0`
**Depends on:** nothing. **Blocks:** any external contribution, any "open source" claim.

Without `LICENSE`, the code is under exclusive copyright. See `LICENSING_DECISION.md` —
the recommendation is AGPL-3.0 with a separate commercial licence.

**Done when:** the owner has chosen; `LICENSE` contains the full text; CLA or DCO is
decided and documented **before** the first external pull request is merged; dependency
licences have been checked for compatibility; and both READMEs state the licence.

---

## P0-3 — Integrate a verified hosted authentication provider

`priority:P0` `security` `hosted`
**Depends on:** P0-2 (a provider choice may have licence implications).
**Blocks:** P0-6, P1-1, P1-2, P1-3.

`AUTH_MODE=hosted-session` exists and returns nothing. Pick a provider and implement that
adapter. Do not widen trust in the proxy header to work around it.

**Done when:** a session issued by the provider resolves to a stable user id; the
trusted-proxy header is refused in that mode; `DEV_USER_ID` stays refused in production;
existing rows keep working through a documented migration of identifiers; and a test
proves a forged session or header yields 401 on a route that spends money.

---

## P0-4 — Account deletion and data export

`priority:P0` `security` `hosted`
**Depends on:** P0-3.

**Done when:** a user can export their workspace, projects and usage ledger; deletion
removes D1 rows, R2 objects under all three prefixes, the Descript job ledger and the
usage ledger; the YouTube grant is revoked at Google as part of deletion; the retention
policy is written down in both languages; and a test proves deletion leaves nothing
behind for that user.

---

## P0-5 — Google OAuth verification and YouTube quota audit

`priority:P0` `oauth` `youtube`
**Depends on:** P0-1 (the app name is reviewed), P1-6 (privacy policy required).

Default quota is 10,000 units per day; an upload costs about 1,600 — roughly six uploads
a day across all users.

**Done when:** the consent screen is submitted with the final name, logo, homepage and
privacy policy; the scope justification for `youtube.upload` is written; the quota audit
is submitted; and `YOUTUBE_COMPLIANCE.md` records the obligations, the retention policy
for authorised data, and the current quota position.

---

## P1-1 — Budgets, limits and credit reservations

`priority:P1` `hosted`
**Depends on:** P0-3.

`usage_events` records spending; nothing caps it. A user, or a bug, can spend without
bound.

**Done when:** a per-user budget exists; a route reserves before spending and settles
after; exceeding the budget fails **before** the provider is called; the reservation is
released when a call fails; and a test proves a runaway loop stops at the limit.

---

## P1-2 — Rate limits per user and per IP on paid routes

`priority:P1` `security` `hosted`
**Depends on:** P0-3.

**Done when:** every route calling OpenRouter or OpenAI is limited; limits are per user
and per IP; the response is a clear 429 with a retry hint; and a test proves the limit
holds and the response leaks nothing about other users.

---

## P1-3 — Move long-running work to a durable queue

`priority:P1` `hosted`
**Depends on:** P0-3.

Chapter generation and Shorts batches are driven from the browser, one request at a time.
That avoids Worker time limits but stops when the tab closes.

**Done when:** a batch survives the tab closing; progress is readable on return; retries
are bounded and idempotent; and the existing resume-at-first-missing behaviour is
preserved rather than replaced.

---

## P1-4 — Encryption key rotation and audit logging

`priority:P1` `security`
**Depends on:** nothing.

`SETTINGS_ENCRYPTION_KEY` is single and permanent: rotating it makes every stored key
unreadable. That is untenable for a service.

**Done when:** each encrypted row carries a key id; two keys can coexist during rotation;
a documented procedure re-encrypts without downtime; an audit log records connections,
disconnections, deletions and spending; and a test proves a row encrypted under the old
key still decrypts after rotation.

---

## P1-5 — Structured observability with redaction

`priority:P1` `security`
**Depends on:** nothing.

**Done when:** every request carries an id that appears in errors; logging redacts
authorization headers, tokens, keys and signed URLs at the logging layer rather than at
each call site; and a test proves a deliberately logged token comes out masked.

---

## P1-6 — Retention, terms, privacy and subprocessors

`priority:P1` `documentation` `hosted`
**Depends on:** P0-4.

**Done when:** terms of service, a privacy policy and a subprocessor list exist in both
languages; retention periods for D1 and R2 are stated and enforced; and ARTCI and GDPR
positions are recorded with what each requires.

---

## P1-7 — Reproducible Cloudflare self-host guide

`priority:P1` `documentation`
**Depends on:** P0-2.

**Done when:** someone who has never seen this repository can deploy it to their own
Cloudflare account from the guide alone: D1, R2, bindings, environment variables,
migrations, OAuth client setup and a first-run check — and someone other than the author
has actually followed it end to end.

---

## P2-1 — Portable database and storage adapter

`priority:P2`

Only worth doing if leaving Cloudflare becomes a real requirement. Drizzle already
abstracts most of D1; R2 is the harder half.

---

## P2-2 — Evaluate Docker support

`priority:P2`

**Done when:** either a working Dockerfile exists and is tested in CI, **or** an issue
records why it does not fit a Workers-targeted build. Until then neither README may
mention Docker.

---

## P2-3 — Launch assets and first release

`priority:P2` `documentation`
**Depends on:** P0-1, P0-2.

**Done when:** screenshots show the renamed product; a demo recording exists with no real
credential or private content visible; a changelog and a tagged release exist; and no
claim is made about a hosted version, a Docker image or a licence that is not yet true.

---

## P1-8 — Restore `npm ci` in CI by regenerating the lockfile on Linux

`priority:P1`
**Depends on:** nothing. **Effort:** minutes, on a Linux machine.

CI runs `npm install` rather than `npm ci`, which gives up the reproducibility that a
lockfile exists for. The cause is not this repository's dependencies: npm hoists the
optional wasm fallbacks of `@tailwindcss/oxide` and `@rolldown/binding` differently on
Linux than on Windows, where the lockfile was generated. `npm ci` on Linux therefore
rejects a lockfile that installs cleanly on both platforms.

**Done when:** `npm install` has been run once on Linux — a container, a CI job with a
commit step, or any Linux checkout — the resulting `package-lock.json` is committed, the
workflow is back to `npm ci`, and CI is green. Verify a Windows `npm ci` still succeeds
afterwards, or the problem has simply moved.
