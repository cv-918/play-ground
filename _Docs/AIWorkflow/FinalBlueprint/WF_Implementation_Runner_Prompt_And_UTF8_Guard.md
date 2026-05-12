# WF-411 Implementation Runner Prompt Boundary And UTF-8 Guard

## Purpose

WF-411 hardens the controlled PC Runner `implementation` profile after the
WF-410 smoke exposed two practical issues:

- The nested Codex executor could confuse its own tracked-edit responsibility
  with PC Runner-owned runtime validation.
- Garbled Korean output could be written into executor logs or generated
  user-facing documents unless the runner stopped for review.

## Prompt Boundary Change

The implementation prompt now includes an explicit ownership section:

```text
Executor And Runner Ownership
```

The key rule is:

```text
Codex executor handles approved tracked repository changes.
PC Runner owns runtime validation, local ignored config, _Temp artifacts,
evidence collection, verification reports, completion cards, finalization logs,
auto-approval evaluation, and follow-up plan generation.
```

This prevents runner-smoke tasks from being incorrectly reported as blocked only
because the executor cannot edit `_Local/` or `_Temp/`.

## UTF-8 And Korean Output Requirement

The implementation prompt also tells the executor:

- write generated text files as UTF-8
- keep Korean user-facing documents readable
- stop and report if output or generated documents contain replacement
  characters or garbled Korean

This is a prompt-level guard. The runner also has a deterministic guard.

## Text Encoding Guard

The implementation profile now inserts this step after `codex_cli_adapter.run`
and before `file_watcher.snapshot`:

```text
runner.text_encoding_guard
```

The guard writes an artifact under:

```text
_Temp\AIWorkflowRuntime\tasks\<task_id>\runner\text_encoding_guard\
```

It scans:

- executor stdout log
- executor stderr log as warning-only evidence
- changed text files reported by the Codex CLI adapter
- current Git worktree tracked changed text files, including Markdown,
  JSON/YAML, scripts, common source files, and project/config text files

The guard checks for common mojibake markers such as replacement characters,
UTF-8-as-Latin-1 fragments, and Korean text decoded through the wrong code page.

## Stop Behavior

When no findings exist:

```text
runner.text_encoding_guard -> completed
```

When blocking findings exist in executor stdout or changed text files:

```text
stop_reason: text_encoding_guard_failed
human_gate: Review probable mojibake in executor output or changed text files before continuing.
```

Executor stderr findings are recorded as `passed_with_warnings` because stderr
often includes shell command echoes and tool output. They are still visible in
the guard artifact for review, but they do not block completion by themselves.

The runner stops before result collection, verification, completion report, and
completion card generation. This keeps corrupted user-facing text from being
treated as a reviewed completion.

## Safety Boundaries

The guard does not:

- approve tasks
- mark tasks done
- create Backlog tasks
- decide final verification pass/fail
- commit or push
- modify `_Local/`, secrets, or game source/data

It is a runner-level stop condition and evidence artifact only.

## Validation Summary

WF-411 validation should cover:

- `pc_runner.ps1` parser check
- implementation plan includes `runner.text_encoding_guard`
- generated prompt includes executor/runner ownership wording
- clean text guard pass smoke
- synthetic mojibake guard stop smoke
- `git diff --check`
- forbidden tracked path check
