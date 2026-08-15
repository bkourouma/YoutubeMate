## What this changes

<!-- One or two sentences. What is different after this PR? -->

## Why

<!-- The problem, not the patch. What was wrong, or what became possible? -->

## Screenshots

<!-- Required for any visible change. Before and after if you changed something existing. -->

## How it was verified

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] Checked in the browser (say which screens)
- [ ] Manual integration check, if this touches Descript, YouTube, OpenRouter or OpenAI — say which, and what was not verified

## Impact

- **Security / identity:** <!-- new route, new trust in a header, new credential path, or "none" -->
- **User data:** <!-- new stored field, migration, retention change, or "none" -->
- **AI cost:** <!-- does this spend money, or change how much? Is it recorded in usage_events? -->
- **OAuth / scopes:** <!-- any change to Google scopes, consent screen or token handling -->
- **Migrations:** <!-- new file in drizzle/? Is it additive? Was it applied locally? -->

## Documentation

- [ ] English and French docs updated together, or no user-visible change
- [ ] Debugging guide updated if a new failure mode became possible

## Sign-off

- [ ] Commits are signed off (`git commit -s`). One line, no agreement to read — see
      [CONTRIBUTING.md](../CONTRIBUTING.md). Forgot it? `git commit --amend -s` and force-push.

## Secrets

- [ ] No API key, token, refresh token, OAuth code, encryption key or signed URL in the
      diff, the tests, the fixtures, the screenshots or this description
- [ ] No private transcript, script, photo or channel content committed
