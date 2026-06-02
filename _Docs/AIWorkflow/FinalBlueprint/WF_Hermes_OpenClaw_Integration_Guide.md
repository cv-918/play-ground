# Hermes and OpenClaw Integration Guide

## 1. Purpose

This document defines how Hermes and OpenClaw should fit into AIWorkflow
Studio without taking authority away from the Human Director or AIWorkflow
governance.

Hermes and OpenClaw are external agent/tool candidates.

They are not the Studio, not the source of truth, and not approval authorities.

## 2. Role Summary

| Tool | Intended role | Initial authority |
|---|---|---|
| Hermes | Browser/web research, browser QA, screenshot/page evidence collection | Read, inspect, capture, summarize |
| OpenClaw | Long-running autonomous staff runtime candidate | Read, analyze, propose, draft |

Both tools must operate under a Studio-approved Work Packet.

## 3. Hermes Adapter

Hermes is best used when the work needs a browser.

Allowed early uses:

- web research
- official documentation reading
- competitor/reference page inspection
- browser QA
- browser-game smoke checks
- screenshots and page state capture
- external AI web UI experiments

Hermes output should return as one of:

- `ResearchNote`
- `EvidenceLink`
- `ExternalKnowledgeCandidate`
- `StaffReportInput`
- `MeetingReference`

Hermes must not:

- approve direction
- canonize knowledge
- edit local game source directly
- commit or push
- run unbounded browser sessions without a Work Packet

## 4. OpenClaw Worker

OpenClaw is best treated as an experimental long-running worker runtime.

Allowed early uses:

- extended investigation
- multi-step research
- staff report drafting
- cross-tool analysis in a sandbox
- draft proposal generation
- draft external knowledge-base candidate generation

Initial mode should be:

```text
read/analyze/propose/draft only
```

OpenClaw must not:

- approve work
- write canon directly
- commit or push
- run unrestricted local control
- modify repository files outside an approved packet
- become the final decision layer

## 5. Common Tool Request Contract

Every external agent request should be represented as a governed tool request.

Minimum fields:

- request_id
- requested_tool
- requested_by
- agenda_or_work_packet_ref
- purpose
- allowed_actions
- blocked_actions
- input_context_refs
- expected_outputs
- evidence_required
- timeout_or_stop_conditions
- cost_or_external_call_risk
- approval_required

## 6. Output Contract

External agents must return structured output that Studio can route.

Minimum output classes:

- ResearchNote
- StaffReport
- EvidenceLink
- ProposalDraft
- ExternalKnowledgeCandidate
- WorkOrderCandidate
- FailureReport

Raw chat output is not enough.

## 7. Evidence Rules

External agent output should cite what it used.

Evidence may include:

- URL and timestamp
- screenshot path
- browser page title
- source snippet summary
- local file path
- command output path
- failure reason

The evidence proves what the external tool saw or did.

It does not prove that the conclusion is correct.

## 8. Human Director Gates

Human Director approval is required before:

- accepting a direction
- canonizing memory
- starting implementation
- modifying source/data/config
- committing or pushing
- using external paid APIs beyond already-approved subscription routes
- allowing long-running autonomous local control

## 9. Recommended Integration Order

1. Document adapter policy and safety boundaries.
2. Add read-only ToolRequest records.
3. Add manual import of Hermes/OpenClaw outputs as ExternalKnowledgeCandidate or StaffReport.
4. Add Studio buttons that prepare a request but do not execute it.
5. Add supervised execution only after evidence and stop conditions are stable.
6. Add automated routing only after repeated successful manual runs.

## 10. Stop Conditions

Stop and require Human Director decision when:

- the tool asks to expand scope
- external cost may occur
- browser auth or private account access is needed
- source/data/config edits are requested
- evidence is missing
- output contradicts canon or a previous Director decision
- the tool cannot explain its source

## 11. Current Verified Hermes Baseline

As of 2026-06-02, the local Hermes installation has been verified as a
usable browser/web tool candidate.

Verified configuration:

- Hermes home: `%LOCALAPPDATA%\hermes`
- Config path: `%LOCALAPPDATA%\hermes\config.yaml`
- Auth provider: `openai-codex`
- Auth state: logged in
- Default model: `gpt-5.5`
- Model provider: `openai-codex`
- Model base URL: `https://chatgpt.com/backend-api/codex`
- Terminal backend: local
- Messaging platforms: not configured

Known local caveat:

- `C:\Users\kalux\.hermes` and `%LOCALAPPDATA%\hermes` may both exist.
- `%LOCALAPPDATA%\hermes` is the current verified Hermes home.
- If a shell reports stale auth state, set `HERMES_HOME=%LOCALAPPDATA%\hermes`
  before checking Hermes status.

Verified smoke evidence:

- Korean prompt and Korean response worked.
- Web search for the `example.com` test page worked.
- Browser automation opened `https://example.com/`, confirmed the page title,
  clicked the `Learn more` link, and reached the `Example Domains` page.
- The smoke asked Hermes not to edit files, and no file modification was
  reported.

This proves Hermes can be used for browser/web investigation. It does not grant
Hermes source editing, approval, canon, commit, push, or release authority.

## 12. Next Real-Use Smoke

The next meaningful Studio/Hermes smoke should use a real agenda item without
allowing Hermes to change local files.

Recommended smoke:

1. Studio creates or records a broad agenda item that needs external reference
   research.
2. Hermes performs web search and browser inspection only.
3. Hermes returns a short research summary with URLs, timestamps, page titles,
   and screenshot/page-state evidence if useful.
4. Studio imports the result as a `ResearchNote`, `MeetingReference`, or
   `StaffReportInput`.
5. The Human Director decides whether the result affects direction, needs more
   research, becomes a WorkOrder input, or should be ignored.

Pass criteria:

- No source/data/config files are edited by Hermes.
- No Studio decision is automatically approved.
- No canon, task execution, commit, or push happens from Hermes output alone.
- The returned research has enough evidence for the Human Director to review.
