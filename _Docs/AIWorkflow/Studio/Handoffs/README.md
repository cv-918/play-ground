# Studio Handoffs

This folder stores governed `Handoff` records between AI staff agents.

A handoff is a proposed transfer of responsibility from one staff agent to
another. It carries the reason, required input context, expected output,
constraints, and evidence refs.

A handoff does not run the target agent by itself. The next step is to create a
sealed StaffContextPacket and then use the normal RoleRun and approval flow.
