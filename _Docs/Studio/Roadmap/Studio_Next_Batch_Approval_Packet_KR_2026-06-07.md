# Studio Next Batch Approval Packet

## Date

2026-06-07

## Status

Human Director batch approval packet.

This packet prepares the next Studio implementation run after Goals C~K implementation and Goals L~N design packets.

## Current Position

Completed:

- Execution Request lifecycle foundation
- Result Review foundation and decision actions
- Worker Dispatch request record and safe smoke path
- Record Keeping foundation
- Evidence Collector / Verification Gate foundation
- Completion Card foundation
- Commit/Push request boundary layer
- L/M/N design packets

Current product state:

```text
Studio is a Director-facing workflow shell with request, review, decision, record, and commit-boundary models connected.
```

## Recommended Next Batch

This batch should focus on making the existing workflow usable in practice before expanding into deeper autonomy.

### Batch 1 — Studio UX Operational Polish

Implementation approved by this packet if the Human Director approves:

- Improve Director Console information hierarchy for current C~K features.
- Add clearer next-action cues for Execution Request, Worker Dispatch, Result Review, Record, Completion Card, and Commit/Push Request surfaces.
- Add status grouping/filtering where useful.
- Reduce raw/internal wording in primary UI.
- Keep raw JSON and internal ids available only as secondary/debug details.
- Add or update view-model tests.

Non-goals:

- No new worker execution authority.
- No automatic accept/reject/done/close.
- No automatic commit/push.
- No automatic Director Brain/Obsidian ingest.

### Batch 2 — Controlled Implementation Worker v2

Implementation approved by this packet if the Human Director approves:

- Extend the existing bounded Hermes/Codex pickup contract.
- Add a request-record-only implementation-worker dispatch path if missing.
- Require approved Execution Request scope before source-editing worker eligibility.
- Add safety status fields that distinguish requested, picked_up, running, result_ready, blocked, failed, and closed/superseded states.
- Add evidence/result-review handoff requirements.
- Add tests for forbidden direct execution and out-of-scope source edit requests.

Non-goals:

- No unrestricted shell execution from Studio.
- No direct PC Runner default path.
- No Studio browser/API action that directly starts arbitrary Codex/local commands.
- No source edits outside approved Execution Request scope.
- No automatic commit/push.

### Batch 3 — Evidence / Verification Hardening

Implementation approved by this packet if the Human Director approves:

- Strengthen evidence metadata validation.
- Add required validation-command/result fields for implementation-worker results.
- Add verification gate outcomes such as pass, fail, warning, blocked, skipped.
- Make skipped validation visible as a first-class risk.
- Preserve separation:
  - Evidence Collector records facts.
  - Verification Gate judges evidence.
  - Result Review is Director-readable.
  - Result Review Decision is Human Director judgment.

Non-goals:

- Verification Gate does not auto-accept results.
- Evidence Collector does not mark tasks done.
- No automatic retry/replan.

### Batch 4 — Minimal Runtime Observation, Not Control

Implementation approved by this packet if the Human Director approves:

- Implement read-only runtime observation foundation from Goal L design.
- Track worker/session status, heartbeat timestamps, last activity, and stalled indicator.
- Surface blocked/stalled/running/completed states in Director Console.

Non-goals:

- No pause/stop/retry/replan execution yet.
- No process kill from Studio.
- No runtime control mutation endpoints.

### Batch 5 — Channel Notification Integration Boundary

Implementation approved by this packet if the Human Director approves:

- Add Studio event/notification record model for stage changes, blockers, approval waits, and completion.
- Keep Discord/OpenClaw/mobile/voice as delivery channels, not governance authority.
- Add documentation for which events should notify Human Director.

Non-goals:

- No external channel bypass of Studio governance.
- No Discord slash command that directly starts unrestricted execution.
- No OpenClaw authority over approval/commit/push.

## Recommended Execution Mode

If approved, Hermes should run this as a batch implementation sequence:

```text
Batch 1 -> Batch 2 -> Batch 3 -> Batch 4 -> Batch 5
```

For each batch:

1. Write bounded Codex handoff.
2. Send Discord START notification.
3. Run Codex worker or implement small Hermes-controlled edits where appropriate.
4. Run Hermes review.
5. Run validation.
6. Run security/scope scan.
7. Send PASS/BLOCKED notification.
8. Stop if scope/risk/tool blocker appears.

## Commit Policy

During implementation:

- Do not commit automatically unless the Human Director explicitly says to commit/push.
- If the Human Director pre-approves commit/push for the batch, split commits by batch boundary.
- Never release/deploy automatically.

## Global Non-Goals

- No unrestricted local command execution from Studio.
- No direct PC Runner default path without later approval.
- No automatic source edits outside approved Execution Request scope.
- No automatic Backlog/ActiveTask creation.
- No automatic Result Review accept/reject.
- No automatic task done/close.
- No automatic commit/push/release/deploy unless separately approved.
- No automatic Director Brain/Obsidian ingest.
- No external channel bypass of Studio governance.

## Copy-Paste Approval Text

```text
Approve the Studio Next Batch roadmap with scoped authorization.

Immediate implementation is approved for:
- Batch 1 Studio UX Operational Polish
- Batch 2 Controlled Implementation Worker v2
- Batch 3 Evidence / Verification Hardening
- Batch 4 Minimal Runtime Observation, read-only only
- Batch 5 Channel Notification Integration Boundary

Execution mode:
- Hermes may run the approved batches sequentially as a single batch run.
- Hermes may use bounded Codex CLI workers and small Hermes-controlled edits inside approved scope.
- Hermes must send START/PASS/BLOCKED notifications to Discord.
- Hermes must review, validate, scan scope/security, and report risks.

Global non-goals:
- no unrestricted shell/local command execution from Studio
- no direct PC Runner default path
- no source edits outside approved Execution Request scope
- no runtime pause/stop/retry/replan mutation yet
- no automatic accept/reject/done/close
- no automatic Backlog/ActiveTask creation
- no automatic commit/push/release/deploy unless separately approved
- no automatic Director Brain/Obsidian ingest
- no external channel bypass of Studio governance
```
