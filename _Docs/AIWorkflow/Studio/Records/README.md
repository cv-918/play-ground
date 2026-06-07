# Studio Record Keeping Records

This folder is the durable store for Studio `studio_record.v1` records.

Record Keeping records are Director-readable summaries that link decisions, Execution Requests, Worker Dispatches, evidence refs, Result Review outcomes, verification summaries, and commit/push boundary requests.

## Boundary

Creating or reading a Studio Record must not:

- ingest into Director Brain or Obsidian automatically
- store secrets, tokens, auth codes, or local machine configuration
- store raw full logs as long-term knowledge
- start workers, PC Runner, Codex CLI, or local execution
- mutate Execution Requests, Worker Dispatches, Result Reviews, Backlog, or ActiveTask
- modify game source/data
- commit or push

## Schema

Current schema:

```text
studio_record.v1
```

Record id and file name:

```text
REC-YYYYMMDD-HHMMSS-short-slug.json
```

Required fields:

- identity: `record_id`, `schema_version`, `record_type`, `status`, `created_at`, `updated_at`
- Director summary: `title`, `summary`
- traceability: `source_refs`, `links`, `outcome`
- storage safety: `storage_policy`

`storage_policy.director_brain_ingest` and `storage_policy.obsidian_ingest` must be `not_requested`.

`storage_policy.raw_logs_stored` and `storage_policy.secrets_stored` must be `false`.

## Explicit Creation

Goal G supports explicit creation from a Result Review through Studio API/UI.

It is not automatic record keeping. The Human Director must request the record.
