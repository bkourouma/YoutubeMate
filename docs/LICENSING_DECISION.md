# Licensing decision — settled: MIT

**Decided by the copyright holder: MIT, with a DCO sign-off for contributions.**
`LICENSE` holds the full text. This document records what was chosen, what it was chosen
over, and what it costs — so nobody has to reconstruct the reasoning later.

## The choice

**MIT**, because the goal is contribution and adoption.

AGPL-3.0 was the earlier recommendation and was briefly applied. It was replaced once the
goal was stated plainly: *people should contribute*. Those two things pull against each
other, and the goal wins.

- Many companies forbid AGPL dependencies outright, so a whole class of contributor is
  filtered out before reading the code.
- AGPL's value is a **dual-licensing** business — free copyleft plus a paid commercial
  licence — and that model requires holding the rights to every contribution, which means
  a **CLA**. A CLA is exactly the friction that stops casual contributors.
- MIT makes the question disappear. It already permits commercial use, so there is nothing
  to sell a separate licence for, and therefore no reason to ask a contributor to sign
  anything beyond certifying they wrote what they submitted.

## What MIT costs, stated plainly

**Anyone may take this code, build a closed commercial service on it, and owe nothing
back — not the improvements, not attribution beyond the copyright notice, not a share of
the revenue.** That is not a risk of MIT; it is MIT working as intended.

For a product whose differentiator is the working Descript → YouTube pipeline, that is the
differentiator handed over to anyone who wants it. The bet is that adoption, contribution
and being the reference implementation are worth more than exclusivity. That is a
legitimate bet, and a common one — but it is a bet, and it cannot be taken back for a
version already released.

**What is not given away:** the trademark (MIT grants no rights to the product name), the
hosted service and its operations, the accumulated editorial knowledge in the prompts, and
the maintainer's position. Those are the assets that remain.

**Reversibility:** future versions can be relicensed at any time, since the copyright
holder holds the rights and contributions arrive under MIT. Versions already published
stay available under MIT for good. Relicensing later would also mean losing the goodwill
that MIT bought.

## Contributions — DCO, not CLA

Contributions are accepted under MIT, certified with a **Developer Certificate of Origin**
sign-off:

```bash
git commit -s -m "Your message"
```

That adds one `Signed-off-by:` line. It is a statement that you wrote the contribution, or
have the right to submit it — not a transfer of anything, and not a legal document to
read and sign.

A CLA was considered and rejected. It would only be needed to keep dual licensing possible,
which MIT already makes moot, and it is a well-documented reason people close the tab
rather than open a pull request.

## What was rejected

**AGPL-3.0.** Protects against a closed competing service, at the cost of corporate
contribution and a CLA. Correct if the hosted business were the priority; it is not.

**Apache-2.0.** Nearly the same effect as MIT, plus an explicit patent grant and an
explicit statement that no trademark rights are granted. That trademark clause is genuinely
useful while the product name is unverified — see `BRAND_RENAME_CHECKLIST.md`. It was not
chosen because MIT is shorter and better understood, which matters more when the goal is
lowering the barrier to contributing. **If the name later turns out to be contested,
revisiting Apache-2.0 for future versions is reasonable.**

## Remaining

1. Check dependency licences before the first release. Nothing in the tree is expected to
   conflict with MIT, but it has not been verified.
2. Add a licensing line to any published artefact — release notes, the site — once those
   exist.
