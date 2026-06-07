# Studio Commit/Push Requests

This folder is the durable store for Studio `commit_push_request.v1` approval request records.

A Commit/Push request is an advisory boundary record for Hermes or the Human Director. It is not a git operation.

## Boundary

Creating or reading a Commit/Push request must not:

- run `git add`
- run `git commit`
- run `git push`
- mutate source files or Studio records outside this request store
- include `_Temp`, `_Local`, `node_modules`, `.env`, or local config files
- approve release or deployment

Push requires stronger separate Human Director approval than commit.

## Schema

Current schema:

```text
commit_push_request.v1
```

Record id and file name:

```text
CPR-YYYYMMDD-HHMMSS-short-slug.json
```

Required fields:

- identity: `commit_push_request_id`, `schema_version`, `request_type`, `status`, `created_at`, `updated_at`
- proposed boundary: `selected_files`, `excluded_files`, `proposed_commit_message`, `proposed_commit_group`
- review metadata: `validation_summary`, `approval`
- safety: `safety`

Allowed `request_type` values:

```text
commit_only
push_after_commit
push_only
```

All records remain `approval_requested` until a separate human/Hermes action handles the actual git boundary outside Studio.
