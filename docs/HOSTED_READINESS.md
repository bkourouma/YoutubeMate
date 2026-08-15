# Hosted readiness

*English · [Français](HOSTED_READINESS.fr.md)*

What exists, what does not, and what has to be true before this runs as a paid service for
people the owner has never met. The second list is longer than the first, which is normal
and worth stating plainly rather than discovering after launch.

> **Today this is not a hosted product.** It is a single-tenant application deployed for
> its author. Do not open it to the public before the P0 items below are done.

## Already in place

These are implemented and covered by `tests/rendered-html.test.mjs`.

| Capability | How |
|---|---|
| Per-user secret isolation | One encrypted row per user per provider, composite primary key |
| Encryption at rest | AES-GCM, with `${userId}:${service}` bound as additional authenticated data, so a row moved between users fails to decrypt rather than leaking |
| No key in the browser | Keys are resolved server-side; the client only ever receives the last four characters |
| Per-user AI cache | The owner id is part of the cache key hash, so identical input from two accounts cannot collide |
| Usage ledger | `usage_events` records every paid call with project, action, model, tokens and cost |
| Separate Shorts projects | Per user, with size limits |
| Descript job idempotency | A fingerprint over the request, scoped to the user, inside a one-hour window |
| Per-user YouTube OAuth | Encrypted refresh token, single-use state bound to the initiator, `youtube.upload` scope only |
| Unit upload with resume | One request per Short; an interrupted batch resumes at the first missing item |
| Token revocation | Disconnecting revokes at Google before purging locally; `invalid_grant` drops the connection |
| R2 ownership checks | Every client-supplied key is validated against the prefix of its own kind |
| Bounded outbound calls | Every external call carries an explicit deadline |
| Authentication boundary | `AUTH_MODE` names where an identity may come from; `DEV_USER_ID` is refused in production |
| D1 + R2 | Declared in `.openai/hosting.json` |

## Not built

### P0 — blocking for any public hosted version

**Verified hosted authentication.** `AUTH_MODE=hosted-session` exists and deliberately
returns nothing: no provider has been chosen. Today's default trusts a header set by the
current hosting; anywhere else that header is forgeable, and every user's encrypted keys
hang off the identity it carries. *No provider has been selected — Clerk, Auth0, Supabase
Auth, Better Auth and self-hosted options are all open, and this is an owner decision.*

**Accounts, organisations, members, roles.** There is one identity string and no concept of
an account, let alone a team. Everything below assumes this exists first.

**Google OAuth verification.** The consent screen has not been submitted. Unverified apps
are capped at a small number of test users, and the app name is reviewed — which is why
the rename has to land first. See `BRAND_RENAME_CHECKLIST.md`.

**YouTube quota audit.** The default project quota is 10,000 units per day and an upload
costs about 1,600 — roughly **six uploads a day across all users combined**. A multi-user
service needs an audit and an increase, and the audit asks for a working product and a
compliance review.
<https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits>

**Account deletion and data export.** Required by GDPR where EU residents are served, and
simply correct everywhere else. Deleting an account has to cover D1 rows, R2 objects, the
YouTube grant at Google, and the usage ledger.

### P1 — needed early, not on day one

- **Budgets, limits and credit reservations.** The ledger records what was spent; nothing
  stops it. A user can spend without bound, and a bug can spend without bound faster.
- **Rate limiting per user and per IP** on every route that costs money.
- **Durable queues for long work.** Chapter generation and Shorts batches are driven from
  the browser, one request at a time. That was the right call against Worker time limits,
  but it means a closed tab stops the work.
- **Audit log.** Who connected what, who deleted what, who spent what.
- **Structured observability** with a request id and redaction at the logging layer, so a
  token cannot reach a log through a future careless line.
- **Encryption key rotation**, or envelope encryption. Today `SETTINGS_ENCRYPTION_KEY` is
  single and permanent: it cannot be rotated without every stored key becoming unreadable.
  That is an unacceptable position for a service, and the fix is a key id per row.
- **Retention policy for D1 and R2**, with actual expiry rather than unbounded growth.
- **Private or signed media URLs.** The presenter photo and reference thumbnails are
  served through an authenticated route today; a hosted version should sign and expire.
- **Backup, restore and a tested recovery plan.** Untested backups are decoration.

### P2 — before or shortly after launch

- Subscriptions and plans.
- Terms of service, privacy policy, data processing agreement, subprocessor list.
- ARTCI compliance for Côte d'Ivoire, and GDPR where EU residents are served.
- Status page, incident process, support channel.
- A portable database and storage adapter, if leaving Cloudflare ever matters.
- Docker support — **only if a working Dockerfile exists**; today none does, and the
  README must not suggest otherwise.

## The order that actually works

1. Rename and clear the brand — everything user-facing depends on the name being settled.
2. Choose the licence — without it the repository grants nobody any rights.
3. Hosted authentication — every multi-tenant item below depends on a real account.
4. Budgets and rate limits — before strangers can spend money, not after.
5. Google OAuth verification and the quota audit — both take external time; start early.
6. Deletion, export and retention — legally required, and cheaper to design in than to
   retrofit.
7. Queues, audit log, observability, key rotation.
8. Plans, billing, legal documents, status page.

The backlog with acceptance criteria is in `HOSTED_ROADMAP.md`.
