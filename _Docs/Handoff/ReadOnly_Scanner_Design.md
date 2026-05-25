# Read-Only Handoff Scanner Design

## Purpose

The Read-Only Handoff Scanner is a future helper behavior for inspecting the AI Role Handoff System without changing repository state.

Its job is to answer questions such as:

- What Handoff work exists?
- What work is aimed at my role?
- What is waiting for human approval?
- What is blocked?
- What recently finished?
- Which Packets have missing or inconsistent manifest fields?

The scanner is intentionally read-only in Phase 5.

## Phase 5 Boundary

Phase 5 defines scanner behavior and report format only.

Phase 5 does not implement:

- Scheduled automation
- Background watchers
- File modification
- Packet claiming
- Status updates
- Approval recording
- Source code, JSON, asset, runtime, build, commit, or push execution

Any behavior that writes files or changes status belongs to a later phase.

## Inputs

The scanner may read:

- `_Docs/Handoff/00_Index.md`
- `_Docs/Handoff/Handoff_System_Principles.md`
- `_Docs/Handoff/Handoff_Packet_Spec.md`
- `_Docs/Handoff/Role_Routines/`
- `_Docs/Handoff/Packets/**/manifest.yaml`
- Packet documents referenced by `manifest.yaml`
- Packet `Results/` documents
- `_DevLog/WorkLog/` entries linked from manifests

The scanner should not read unrelated source code, gameplay data, local config, temporary runtime artifacts, secrets, or external services.

## Output

The scanner outputs a report in chat or another explicitly approved display surface.

It must not create or modify repository files in Phase 5.

Use `_Docs/Handoff/Scanner/_Scan_Report_Template.md` as the report shape.

## Scan Modes

### Full Queue Scan

Lists all active Packet rows and active handoffs.

### Role Queue Scan

Filters work for a role:

- Planner
- Developer
- Artist
- Reviewer
- QA

### Approval Waiting Scan

Lists all Packets where:

```yaml
execution_status: WaitingUserApproval
```

or where `_Docs/Handoff/00_Index.md` lists the work under `Waiting User Approval`.

### Blocked Scan

Lists all Packets where:

```yaml
delivery_status: Blocked
```

or:

```yaml
execution_status: Blocked
```

### Fresh Work Scan

Lists Packets where:

```yaml
delivery_status: Ready
execution_status: NotStarted
```

or where the Packet is not yet claimed.

### Consistency Scan

Reports manifest/index mismatches and missing fields.

Examples:

- Packet exists but is not listed in `00_Index.md`.
- Index references a missing manifest.
- Manifest references missing documents.
- `approval_required: true` but `approval_request_path` is empty.
- `execution_status: WaitingUserApproval` but the Packet is not listed under `Waiting User Approval`.
- `delivery_status: Done` but `CompletionNotice.md` is missing.

## Report Sections

A scanner report should include:

- Scan timestamp
- Scan mode
- Role filter, if any
- Waiting user approval
- Ready work
- In-progress work
- Blocked work
- Review requested
- QA requested
- Recently done
- Consistency issues
- Suggested next human actions

## Severity Labels

Use these labels for consistency issues:

- `Critical`: the scanner cannot determine safe status or required approval is hidden.
- `Major`: a Packet may be actionable but key routing or approval information is missing.
- `Minor`: the Packet is usable but has incomplete metadata.
- `Info`: useful observation with no immediate action required.

## Required Safety Rules

The scanner must:

- Read only.
- Never claim a Packet.
- Never change `delivery_status` or `execution_status`.
- Never record approval.
- Never mark work done.
- Never create DevLog.
- Never run build, tests, tools, scripts, or Git commands as part of scanning.
- Never infer that approval exists unless it is recorded in the manifest, index, linked workflow document, or visible conversation.

## Example User Requests

```text
현재 Handoff 승인 대기 목록 확인해줘.
```

```text
Developer 역할에게 온 새 Packet만 확인해줘.
```

```text
Handoff Packet 정합성만 읽기 전용으로 점검해줘.
```

## Phase 6 Handoff

Phase 6 may define document/status update behavior, but Phase 5 does not grant permission for it.

The scanner report may recommend updates, but the scanner must not apply them.
