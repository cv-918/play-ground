# Studio RoleRuns

This folder is the default durable store for AIWorkflow Studio `RoleRun` JSON
files.

A RoleRun is not the same thing as a loose prompt. It is the governed runtime
envelope for one AI staff agent acting from a `StaffContextPacket`.

Use the local staff runtime tool to inspect and validate durable RoleRuns:

```bat
tools\aiworkflow\studio_staff_runtime.bat status
tools\aiworkflow\studio_staff_runtime.bat validate
tools\aiworkflow\studio_staff_runtime.bat list
tools\aiworkflow\studio_staff_runtime.bat read <role_run_id>
```

Use `plan` before any staff execution:

```bat
tools\aiworkflow\studio_staff_runtime.bat plan <context_packet_json_path>
```

Writing a RoleRun envelope requires an explicit execute flag:

```bat
tools\aiworkflow\studio_staff_runtime.bat create <context_packet_json_path> --execute
```

RoleRunOutput files can be checked before handoff:

```bat
tools\aiworkflow\studio_staff_runtime.bat inspect-output <role_run_output_json_path>
tools\aiworkflow\studio_staff_runtime.bat handoff-output <role_run_output_json_path>
```

Safety rules:

- Planning and creating a RoleRun does not call an LLM.
- The default provider policy is Codex App/CLI signed-in execution first, not
  OpenAI API billing.
- RoleRunOutput may propose work, ask questions, request approval, or recommend
  WorkOrders.
- RoleRunOutput must not directly approve, write canon, create tasks, change
  source files, commit, or push.
