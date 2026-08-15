# ADR 0001 — Better Auth for hosted authentication

**Status:** accepted, not yet implemented
**Date:** 2026-08-15
**Decides:** P0-3 in `../HOSTED_ROADMAP.md`

## Context

`AUTH_MODE=hosted-session` exists and returns nothing on purpose: no provider had been
chosen, and returning an identity there would hand out whoever's encrypted API keys the id
happened to match. The default mode trusts a header set by the current hosting, which is
safe there and forgeable anywhere else.

The constraints are unusual enough that the popular answer is not the right one:

- **Cloudflare Workers.** Edge runtime, no Node APIs. Anything assuming a Node server or
  long-lived process is out.
- **The project is AGPL.** Self-hosters are a first-class audience. A provider that
  requires every self-hoster to create an account with a third-party SaaS, and to pay per
  monthly active user, makes self-hosting conditional on someone else's business.
- **Drizzle over D1 is already here**, with a working migration flow.
- **Solo maintainer**, and the hosted version has no revenue yet. Per-MAU pricing before
  the first paying user is a bad shape.
- **Identity is load-bearing.** Encrypted API keys, the YouTube grant and the usage ledger
  all hang off the user id. A migration of identifiers has to be possible.

## Decision

**Better Auth**, with its Drizzle adapter over D1.

## Why not the others

**Clerk.** The best developer experience of the group, and genuinely good on Workers. But
it is proprietary and priced per monthly active user. Every self-hoster of an AGPL project
would need their own Clerk account and would hit that pricing — which converts an
open-source project into a funnel for someone else's SaaS. That is the wrong default for
the audience this licence chooses.

**Auth0.** Mature and heavyweight. Same objection as Clerk, with worse pricing at scale and
more configuration than a single-product app needs.

**Supabase Auth.** Solid, but it arrives attached to Supabase. Adopting it means running
Postgres alongside D1, or migrating to it — a database decision made by an authentication
choice, which is backwards.

**Roll our own.** Sessions, password hashing, email verification, OAuth flows, CSRF,
rotation. Every one of those is a place to get it subtly wrong, and this codebase already
carries enough security surface that is genuinely its own — key encryption, R2 ownership,
OAuth state. Authentication is the wrong place to be original.

**Cloudflare Access.** Fits the infrastructure and is the right answer for a private
deployment — worth documenting as an option for self-hosters. But it authenticates against
an organisation's identity provider, not against public sign-ups, so it cannot serve the
hosted version.

## Consequences

**Good.** MIT-licensed and self-hostable, so a self-hoster needs no third-party account.
It runs on Workers. It uses the Drizzle setup that already exists, so sessions live in the
same D1 database as everything else — one backup, one migration story. No per-user cost.
Providers (email, Google, GitHub) are configuration rather than rewrites.

**Bad.** It is younger than Auth0 or Clerk, so there is less written about it and fewer
worked examples for edge runtimes. Running it means owning session tables, cookie
configuration and rotation ourselves — a managed service would have absorbed that. If it
turns out not to fit, the escape is the `AuthProvider` interface in `app/server/auth.ts`,
which is exactly why that interface exists.

**Identifier migration.** Existing rows are keyed by the value of
`oai-authenticated-user-id`. Adopting Better Auth introduces new user ids, so the cutover
needs a mapping table, or a linking step at first sign-in, before the trusted-proxy mode is
turned off. Doing that carelessly orphans every encrypted API key and every YouTube grant.
This is the risky part of the work, not the sign-in screen.

## Not decided here

Which sign-in methods to enable, whether email/password is offered at all, and how the
cutover is staged. Those belong in the implementation pull request.
