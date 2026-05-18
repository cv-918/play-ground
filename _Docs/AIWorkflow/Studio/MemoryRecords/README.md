# Studio Memory Records

This folder is the default durable store for AIWorkflow Studio `MemoryRecord`
JSON files.

The folder starts empty on purpose. Example memory records live under:

```text
_Docs/AIWorkflow/Studio/Examples/
```

Use the local memory store tool to inspect and validate durable records:

```bat
tools\aiworkflow\studio_memory_store.bat status
tools\aiworkflow\studio_memory_store.bat validate
tools\aiworkflow\studio_memory_store.bat list
tools\aiworkflow\studio_memory_store.bat read <memory_id>
```

Writing a memory record requires an explicit execute flag:

```bat
tools\aiworkflow\studio_memory_store.bat create <memory_json_path> --execute
```

Safety rules:

- `proposed` memory is not approved.
- `approved` memory is scoped approval, not global canon.
- `canon` memory requires a `DEC-*` source reference.
- `rejected` memory must explain why the idea was rejected.
- Memory writes do not create tasks, approve work, start runners, mark done,
  commit, or push.
