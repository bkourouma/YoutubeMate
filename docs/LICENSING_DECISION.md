# Licensing decision — settled: AGPL-3.0

> **Decided on 2026-08-15 by the copyright holder: AGPL-3.0-or-later.** `LICENSE` now
> contains the full text. The reasoning below is kept because it explains what the choice
> commits the project to — in particular the contribution question, which is still open.
>
> **Still to decide, before the first external contribution is merged: CLA or DCO.** See
> "Consequences to accept" below. A DCO is lighter but forecloses the separate commercial
> licence; a CLA preserves it and deters casual contributors. Retrofitting either one means
> contacting every past contributor, and one unreachable person blocks relicensing for good.

## The original analysis

Before this decision there was no `LICENSE` file, which meant the code sat under
exclusive copyright: nobody could legally use, modify or redistribute it, whatever the
repository being public implied.

## The three realistic options

### AGPL-3.0 — recommended

A strong copyleft licence. Anyone may use, modify and self-host it. But whoever offers a
**modified version as a network service** must publish their modifications under the same
licence. That network clause is what separates AGPL from GPL, and it is the entire point
here, because this product is a web application.

*Why it fits this project.* The plan is open source plus a hosted version. AGPL means a
competitor can run this for their own users — a good thing, and part of why anyone would
trust it — but cannot take the code, improve it, run a closed commercial service on top,
and keep the improvements. Ordinary users, contributors and self-hosters are unaffected;
the only party constrained is one building a proprietary competing service.

*What it costs.* Some companies forbid AGPL dependencies outright, so corporate
contribution will be thinner. It rules out being embedded in closed products — which for a
standalone application is barely a loss.

### Apache-2.0

Permissive, with an explicit patent grant and clear trademark terms. Widest possible
adoption, easiest for companies to accept.

*What it costs here.* Anyone may run a closed commercial SaaS on this code and owe
nothing back. For a project whose differentiator is the working Descript → YouTube
pipeline, that is the whole product handed over. If broad adoption mattered more than
the hosted business, this would be the answer.

### MIT

Shortest and best understood. Same trade-off as Apache-2.0, minus the patent and
trademark clauses — which matters more than usual here, since the product name is
**not cleared** (see `BRAND_RENAME_CHECKLIST.md`). Apache-2.0's explicit statement that
the licence grants no trademark rights is worth having while that is unresolved.

## The choice made

**AGPL-3.0-or-later, with a separate commercial licence available from the copyright
holder.**

Dual licensing is the standard shape for open source plus hosted: AGPL for everyone,
and a commercial licence for anyone who wants to build something proprietary on it. It
requires being the sole rights holder over all the code — which is true today, and stops
being true the moment the first external contribution is merged.

## Consequences to accept before choosing

**Contributions.** To offer a commercial licence later, the rights to every contribution
must be held. Two ways:

- **DCO** (`Signed-off-by`) — lightweight, a certification of origin. It does **not**
  grant relicensing rights, so it is incompatible with dual licensing later.
- **CLA** — a contributor licence agreement granting the rights needed to relicense.
  Heavier, deters casual contributors, and is what actually enables the commercial track.

Pick before merging the first outside pull request. Retrofitting a CLA means contacting
every past contributor, and one unreachable person can block relicensing permanently.

**Dependencies.** Check the licences already in the tree before publishing under AGPL —
they must all be compatible.

**Hosted version.** Running your own AGPL code as a service imposes nothing on you. The
obligation falls on someone who *modifies* it and offers it as a service.

**Irreversibility.** A licence, once published for a given version, cannot be withdrawn
from it. New versions may be relicensed; released ones stay available under the terms
they carried.

## What is left to do

1. ~~Choose.~~ Done: AGPL-3.0-or-later.
2. ~~Add `LICENSE`.~~ Done, with the full text, and stated in both READMEs.
3. **Decide CLA or DCO before merging the first external contribution.** Until that is
   settled, do not merge one — accepting a contribution under an unclear arrangement is
   the thing that cannot be undone later.
4. Add a licensing section naming who to contact for a commercial licence, once there is
   an address to name.
5. Check the licences of existing dependencies for AGPL compatibility before the first
   release.
