# Studio Context Packets

## Purpose

This folder stores governed `StaffContextPacket` records.

A StaffContextPacket is the sealed context envelope given to a StaffAgent before
a RoleRun starts.

It exists so AI staff do not receive loose role prompts. The packet records:

- agent identity and department
- source WorkOrder, meeting, task, proposal, or director goal
- objective
- approved scope
- non-goals
- memory refs separated by status
- allowed, blocked, and approval-required tools
- required outputs
- quality criteria
- stop conditions
- safety permissions

## Boundary

Creating a StaffContextPacket does not run an LLM, execute a staff agent,
create a RoleRun, create tasks, approve work, write memory, write canon, modify
source files, commit, or push.

The packet can later be passed to:

```bat
tools\aiworkflow\studio_staff_runtime.bat create <context_packet_json_path> --execute
```
