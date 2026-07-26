---
name: investigate-contract
description: Read-only guarantee + interactive-vs-autonomous (--auto) behavior for investigate modes. Internal helper invoked by the investigate mode of feat / fix — not meant to be run on its own.
disable-model-invocation: true
---

Applies whenever a skill runs with `--investigate`. The domain-specific output (a plan, or a bug triage) and any labeling live in the calling skill; this is the shared contract.

## Read-only (enforce yourself)

Investigate mode is **strictly read-only**: never edit code, never create a branch, never commit. Nothing at the tool level blocks you here, so hold the line yourself. The only writes you make are the GitHub-issue comment (`gh issue comment`, via the `save-plan-to-github` skill) and, in autonomous mode, a label the calling skill may add (`gh issue edit --add-label`). Other hard limits (no force-push, no destructive shell) are enforced by `.claude/settings.json` deny/ask rules — if a tool call is blocked, do not work around it.

## Interactive vs autonomous

`--investigate` is interactive by default; `--investigate --auto` is autonomous. The analysis is identical — only the human-in-the-loop differs:

|           | **Interactive** (`--investigate`)                                           | **Autonomous** (`--investigate --auto`)           |
| --------- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| Questions | May ask 1-2 targeted questions when a material ambiguity changes the output | **Never** ask — record the assumption and proceed |
| Use case  | While the user is at their machine                                          | Unattended batch (e.g. nightly)                   |

## Record assumptions instead of blocking

When the issue is underspecified, don't stall. Interactive: ask only the question(s) that _materially_ change the output; for everything minor, state the assumption explicitly in the posted block (under an "Assumptions" heading) and proceed. Autonomous: never ask — always record the assumption and continue. A reader seeing your assumptions is far more useful than a half-done investigation waiting on input.

## Review before posting (interactive only)

The posted block is the deliverable — but in interactive mode the user is sitting _with_ you, so let them shape it before it lands on the issue. Draft the plan, **present it in chat, fold in their edits, and post the comment only once they approve.** Posting an unreviewed plan and asking for validation _after_ it's already on the issue is backwards when a human is right there to catch a wrong assumption or a missing constraint first.

**For the in-chat review, show every section expanded** — don't wrap sections in `<details>` collapsibles (those hide content the user wants to see now). Keep the tables/bullets as-is. Assemble the final comment (with `<details>` around the long sections) only at the moment you post it, after approval.

Autonomous (`--auto`) is the exception: there's no human to ask, so post directly — the `gh issue comment` call is the deliverable and the only write. Never block an unattended run waiting on approval.
