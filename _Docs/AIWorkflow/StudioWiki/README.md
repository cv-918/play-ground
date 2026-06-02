# External Knowledge Candidate

> Status: external knowledge-base candidate.
>
> This folder preserves the earlier LLM Wiki experiment and possible
> Obsidian/Hermes knowledge-base structure. It is not a primary Studio screen.
> Studio's Director-facing records area owns proposals, Director decisions, reference
> notes, and canon candidates as governance records. Long-term wiki curation,
> AI Librarian behavior, and Markdown graph management should be evaluated as an
> external knowledge-base layer.

## Purpose

`StudioWiki` is an external knowledge-base candidate for AIWorkflow Studio.

It is the place where useful conversation outcomes, research notes, proposals,
Director decisions, lessons, rejected directions, and canon-like project facts
become human-readable Markdown records.

This folder is not a raw dump and not an automatic RAG database.

The intended flow is:

```text
raw material -> AI Librarian draft -> Human Director review -> Wiki record
```

## Authority

StudioWiki can store context, but it does not approve work by itself.

Canon, official design direction, implementation work, task execution, commit,
push, and release decisions still require the normal Studio and AIWorkflow
governance gates.

## Directory Map

```text
StudioWiki/
+-- README.md
+-- 00_MOC.md
+-- Inbox/
+-- Research/
+-- Proposals/
+-- Decisions/
+-- Canon/
+-- Lessons/
+-- Rejected/
+-- Concepts/
+-- Templates/
```

## Knowledge Classes

| Class | Use |
|---|---|
| `Inbox` | Raw captures that are useful but not yet classified |
| `Research` | External research, reference notes, tool findings, source summaries |
| `Proposals` | Ideas and recommendations that are not accepted yet |
| `Decisions` | Human Director decisions: accept, reject, revise, defer, canonize |
| `Canon` | Official project truths and approved constraints |
| `Lessons` | Reusable lessons from implementation, review, QA, failures, or process |
| `Rejected` | Rejected ideas and why they should not be repeated |
| `Concepts` | Stable definitions such as Studio, Work Packet, Context Pack, or AI Librarian |
| `Templates` | Reusable Wiki record templates |

## Promotion Rules

1. Raw information starts in `Inbox` unless it is already clearly classified.
2. AI Librarian may summarize, connect, and propose where it should go.
3. Human Director decides what becomes a Decision, Canon, Lesson, or Rejected
   record.
4. Proposal records remain non-authoritative until a Decision references them.
5. Canon records must reference an explicit Director decision or approved
   source.
6. Rejected records are valuable and should remain searchable so staff do not
   repeat discarded directions.

## Obsidian Compatibility

Records should stay as plain Markdown and may use Obsidian-style links:

```text
[[AIWorkflow Studio]]
[[Context Pack]]
[[Decision: Studio as Human Director Control Plane]]
```

Obsidian is a reading and navigation tool. It is not the authority system.

## What This Folder Must Not Do

- It must not become a second task tracker.
- It must not store secrets or local credentials.
- It must not automatically canonize AI output.
- It must not replace Backlog, ActiveTask, VerificationReport, CompletionReport,
  FinalizationLog, or Git history.
- It must not make implementation or commit decisions.
