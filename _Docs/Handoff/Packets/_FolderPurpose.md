# Folder Purpose: Handoff Packets

## Purpose

This folder stores structured Handoff Packet folders.

A Packet is a durable role-to-role work transfer unit with a required `manifest.yaml` and optional supporting documents such as planning brief, implementation request, approval request, review request, QA request, resource notes, results, and completion notice.

## Belongs Here

- Packet folders named `HANDOFF-YYYYMMDD-###-short-slug`
- Packet manifests
- Packet-specific planning, implementation, art, review, QA, and completion documents
- Packet-specific result documents
- Resource notes that point to actual asset locations

## Does Not Belong Here

- Large binary source assets
- Source code changes
- Runtime artifacts
- Local machine configuration
- Completed historical records that should live only in `_DevLog/`
- Automation scripts that belong under `tools/`

## Required Packet File

Every Packet folder must include:

```text
manifest.yaml
```

Use `_Manifest_Template.yaml` as the starting point.

## Notes

Do not confuse `delivery_status: Ready` with execution approval.

High-risk execution must use `execution_status: WaitingUserApproval` and an approval request document before changing source code, data schema, runtime behavior, build settings, or Git state.
