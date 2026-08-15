# Security policy

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's private advisory form:

<https://github.com/bkourouma/YoutubeMate/security/advisories/new>

> **Owner to complete:** add a monitored security contact address here, and in
> `app/config/product.ts`. Until then the advisory form above is the only private channel.
> No address is invented in this file on purpose — a wrong one silently drops reports.

Please include what you can reproduce, the impact you believe it has, and the commit you
tested. A working proof of concept helps, but a clear description is enough to start.

Expect an acknowledgement within a few days. This is a small project with a single
maintainer; there is no paid bounty.

## Never put these in a report, an issue, a pull request or a screenshot

- API keys — OpenRouter, OpenAI, Descript. The last four characters are enough to
  identify which key you mean.
- OAuth refresh tokens, access tokens, authorization codes, `Authorization` headers,
  cookies, or signed URLs.
- `SETTINGS_ENCRYPTION_KEY`, or any value derived from it.
- Private content: scripts, transcripts, presenter photos, unpublished titles, channel
  analytics.

If you have already exposed a credential, rotate it first and report second. Rotating an
OpenRouter or OpenAI key is immediate; a Google OAuth client secret is rotated in the
Google Cloud console, and doing so disconnects every user of that client.

## What this project already does

- API keys are encrypted at rest with AES-GCM, bound to the owner's id as additional
  authenticated data, and never returned to the browser beyond their last four characters.
- Routes that spend money require an authenticated identity and resolve the key
  server-side. None accepts a key in a request body.
- The YouTube refresh token is encrypted per user; the OAuth state is single-use and
  bound to whoever started the flow; the requested scope is `youtube.upload` only.
- Uploads are private by default and require a human to publish.
- R2 keys supplied by a client are validated against the owner's prefix and the expected
  object kind before anything is fetched.
- Outbound calls are bounded by an explicit deadline.

These are covered by `tests/rendered-html.test.mjs`. A regression fails the build.

## What is not done yet

Stated plainly so nobody assumes otherwise:

- There is no verified hosted authentication provider. `AUTH_MODE` defaults to trusting a
  header set by the current hosting; deployed anywhere else without changing it, that
  header is forgeable. See `docs/HOSTED_READINESS.md`.
- There is no rate limiting, no audit log and no encryption-key rotation.
- There is no data retention or account deletion workflow.
- The OAuth client has not been through Google verification, and the YouTube quota has
  not been audited for multi-user use.

Do not run this as a public multi-tenant service until those are addressed.

## Supported versions

`main` only. There are no released versions yet, so there is nothing to backport to.
