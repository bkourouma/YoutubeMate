# Contributing

Thank you for looking. This is a small project with one maintainer, so the most useful
contribution is usually a precise bug report or a small, verified change.

> **Licensing is not settled yet.** There is no `LICENSE` file, which means the code is
> under exclusive copyright and no open-source rights are granted, whatever the repository
> being public might suggest. See `docs/LICENSING_DECISION.md`. Until the owner picks a
> licence, please do not build anything on top of this that depends on one.

## Setting up

Node `>=22.13.0` is required — see `engines` in `package.json`.

```bash
npm ci
cp .env.example .env      # then fill it in; see docs/DEBUGGING.md
npm run dev               # first start creates the local D1 state
node scripts/apply-local-migrations.mjs
npm run dev               # restart, now with the tables in place
```

That order matters: the local D1 database file does not exist until the dev server has
run once, so the migration script has nothing to apply before then. `docs/DEBUGGING.md`
explains it and every symptom that follows from getting it wrong.

## Verifying

```bash
npm run verify
```

That is typecheck, then lint, then build, then tests. Run it before opening a pull
request. If you want the tests alone against an existing build, `npm run test:only`.

**Never disable or delete an existing test to get a green run.** Several of them encode
security invariants — no client-supplied API key, no invented identity, no cross-tenant
cache, R2 ownership, the YouTube scope. If one fails, that is the test doing its job.
If you believe a test is wrong, say so in the pull request and explain why.

## Branches and commits

Branch from `main`, one topic per branch. Prefixes in use: `feat/`, `fix/`, `chore/`,
`docs/`.

Write commit messages in English, and write them about **why**, not what. The diff
already says what changed. A message that says "fixed bug" costs the next reader — often
you — the twenty minutes it takes to reconstruct the reasoning.

## French and English together

The interface and the documentation are bilingual. If you change user-facing text, change
both languages in the same commit; a half-translated interface is worse than a
consistently English one, because the user cannot tell which parts they can trust.

`README.md` and `README.fr.md` are kept equivalent in substance, as are
`docs/DEBUGGING.md` and `docs/DEBUGGING.fr.md`. Code, identifiers and internal comments
are English.

## Adding a migration

```bash
# 1. Edit db/schema.ts
npm run db:generate            # writes drizzle/NNNN_name.sql
node scripts/apply-local-migrations.mjs
```

Migrations must be **additive**. A deployed database is already carrying user data and
encrypted keys; a destructive migration cannot be undone by reverting the commit. Commit
the generated SQL together with the schema change, never one without the other.

## Testing an integration

Never put a real API key in a test, a fixture or CI. The suite runs the actual built
worker and mocks the upstream by replacing `globalThis.fetch` — see the Descript contract
test in `tests/rendered-html.test.mjs` for the pattern, including how it asserts that a
rejected input never reaches the provider at all.

Some paths cannot be reached without real credentials, notably a live YouTube grant. Do
not fake them into passing. Cover what you can, say plainly what you could not, and add
the manual check to `docs/DEBUGGING.md`.

## Routes that spend money

Anything calling OpenRouter or OpenAI is subject to extra rules, because the cost lands on
a real person's account:

- require an authenticated identity, and resolve the key server-side — never accept a key
  in a request body;
- bound the call with an explicit timeout;
- record the spend through `recordUsage` in `app/server/usage.ts`, so it appears in
  Credits Usage. Use the provider's own reported cost where it gives one;
- prefer failing before spending over spending and then failing;
- make it idempotent, or cacheable, if the same request can plausibly be replayed;
- accounting must never turn an already-billed success into a user-visible failure.

## Documenting what you changed

If a change is visible to a user, it belongs in the README. If it creates a new way for
something to fail, it belongs in the debugging guide with its symptom, its cause and its
fix. A feature nobody can diagnose generates support work forever.

## Reporting security problems

Not here. Read `SECURITY.md` and use the private channel.

## Conduct

By participating you agree to `CODE_OF_CONDUCT.md`.
