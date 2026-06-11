# VAL-ATTR-001 AttributeNode Readability Check Cleanup

Date: 2026-06-11
Status: completed

## Summary

Fixed a false positive in `game_data_loader_readability_check.ps1` for `AttributeNode.children_nodes_info_`.

The script previously treated flattened tuple metadata values as child node IDs in some PowerShell `ConvertFrom-Json` cases. This produced missing-id failures such as:

```text
AttributeNode[100].children_nodes_info_.child_id references missing id: 1
AttributeNode[200].children_nodes_info_.child_id references missing id: 3
AttributeNode[500].children_nodes_info_.child_id references missing id: 2
```

Those values are tuple metadata/direction values, not child IDs.

## Scope

Changed only the validation script interpretation.

No changes were made to:

```text
PlayGround/Data/*.json
PlayGround/Project gameplay source
save/load behavior
schema
runtime behavior
```

## Files Changed

```text
tools/aiworkflow/game_data_loader_readability_check.ps1
_DevLog/WorkLog/2026-06-11_VAL-ATTR-001_AttributeNode_Readability_Check.md
_Docs/AIWorkflow/Backlog.md
_Docs/AIWorkflow/ProjectStatus.md
```

## Implementation Notes

Added helper functions:

```text
Test-IsScalarJsonValue
Assert-AttributeChildRef
```

Updated AttributeNode child validation so scalar-flattened tuple values are grouped as pairs:

```text
[child_id, metadata]
```

Only the first value of each pair is validated as an AttributeNode id.

Nested child tuple arrays still validate the first element as before.

## Validation

### RED / pre-fix evidence

Before the patch:

```text
tools\aiworkflow\game_data_loader_readability_check.bat PlayGround/Data
```

Result:

```text
Failed: 15
```

Failures were all AttributeNode `children_nodes_info_` false positives.

### GREEN / post-fix evidence

After the patch:

```text
tools\aiworkflow\game_data_loader_readability_check.bat PlayGround/Data
```

Result:

```text
Expected loader files: 10
Parsed loader files: 10
Warnings: 0
Failed: 0
```

Additional validation:

```text
tools\aiworkflow\json_smoke_check.bat PlayGround/Data
```

Result:

```text
Total: 11
Failed: 0
```

## Remaining Risks

This is a validation-script cleanup only. It does not prove runtime behavior or gameplay visuals.

If `children_nodes_info_` tuple schema changes later, the script should be updated with an explicit schema contract instead of relying on positional interpretation.
