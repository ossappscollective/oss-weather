---
name: open-pr
description: MANDATORY skill for ALL pull requests. Must be used EVERY TIME before creating any pull request. No exceptions.
---

# Generating Pull Requests

## Mandatory Process

**`--auto`** (caller runs autonomously): skip step 0 sign-off and any push/PR approval wait — proceed directly. Still fix push-hook errors, still `--draft`.

0. **ALWAYS** ensure the change was verified before opening the PR. For logic changes this means the relevant Vitest tests pass (`npx vitest run <path>`) and `yarn svelte-check` is clean; for UI/behavioral changes, confirm it by running the app (`ns run ios` / `ns run android`), or — when a native run isn't possible — flag that a visual check is still required. Propose the scenarios to verify.
1. **ALWAYS** run `git push` and check for errors returned by any git hooks / CI (this repo has no local husky hooks, so commitlint runs in CI — a bad conventional-commit title/message will fail there, not on push)
2. **ALWAYS** fix any errors — autofixup into the relevant commits, or create a new commit if autofixup does not apply
3. **ALWAYS** create the PR as **draft**:
    1. This repo has **no** `.github/PULL_REQUEST_TEMPLATE.md`. Read it **only if one exists** and mirror its structure; otherwise write a clean default body (see "Writing the description" + "Default body" below).
    2. **CRITICAL**: `--template` and `--body` are **mutually exclusive** in `gh pr create`. Always use `--body` with an inline multiline string, never `--template`:
        ```sh
        gh pr create --draft --title "fix(camera): ..." --body "$(cat <<'EOF'
        ## Summary
        ...
        EOF
        )"
        ```
    3. **ALWAYS** use `--draft` — only the user decides when a PR is ready for review
    4. The PR title **ALWAYS** follows the Conventional Commits header (`<type>(<scope>): <subject>`) — same convention as the [commit](../commit/SKILL.md) skill. The squash-merge uses this title as the changelog entry, so it must be a valid conventional commit
    5. **ALWAYS** reference the tracking issue in the body: `Fixes #<issue>` / `Closes #<issue>`

## Writing the description

The description is for a human reviewer who needs to grasp _what this PR does_ at a glance. Write the kind of summary you'd write by hand.

- Summarize the **main changes only** — the meaningful, functional changes a reviewer needs to know about. A few clear bullet points or short sentences is enough.
- **NEVER dump commit details** — do not paste commit messages, do not write a commit-by-commit breakdown. The git history already holds that; repeating it just adds noise.
- **Skip non-important changes** — small refactors, formatting, renames, lint fixes. They dilute the signal; leave them out.
- If the description reads like a changelog of every diff, it's wrong. Clear, concise, high-level — that's the bar.

## Default body (no PR template)

The repo has no PR template, so use this structure:

```markdown
## Summary

<1-4 bullets of the meaningful changes>

## Testing

<what you ran / what still needs a manual visual check>

Fixes #<issue>
```

Keep it lean: `## Summary`, an optional `## Testing`, and the `Fixes #<issue>` line when an issue exists. Add a `## Breaking changes` section **only** when the PR truly breaks something (impact + migration path).

## If a template ever gets added

If `.github/PULL_REQUEST_TEMPLATE.md` exists, mirror its structure instead. The `<!-- ... -->` HTML comments in it are **instructions to the author**, not content — strip every one out; they must never appear in the final PR body. Check (`[x]`) only checklist boxes that genuinely hold; never check a box that isn't true.
