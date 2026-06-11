# UNITY-001 Unity Project Workflow Profile Requirements

Date: 2026-06-11
Status: completed

## Summary

Defined the minimum Unity project workflow profile contract required before AIWorkflow/Hermes automation can safely operate on Unity-based game projects for Steam and Google Play/mobile workflows.

Primary outputs:

```text
_Docs/AIWorkflow/Unity_Project_Workflow_Profile_Requirements.md
_Docs/AIWorkflow/UnityProjectProfile_Template.json
```

## Scope

UNITY-001 is documentation/schema-requirements work only.

It defines:

```text
- required Unity profile fields
- Unity path scope rules
- human approval gates
- validation hook categories
- Steam / Windows platform hooks
- Google Play / Android platform hooks
- example profile shapes
- boundaries for UNITY-002 and UNITY-003
```

It does not:

```text
- create a Unity project
- run Unity Editor
- implement Unity build/test automation
- change Discord/PC Runner behavior
- change Dust Land C++ source/data
- create real Steam or Google Play release configuration
```

## TDD / RED-GREEN Evidence

RED command before check existed:

```bat
tools\aiworkflow\unity001_profile_requirements_check.bat
```

Initial failure:

```text
No such file or directory
```

After adding the check but before docs/template/state updates, expected RED failure included:

```text
FAIL UNITY-001 requirements document anchors :: Required file not found: ...Unity_Project_Workflow_Profile_Requirements.md
FAIL UnityProjectProfile template contract :: template missing or invalid JSON: Required file not found: ...UnityProjectProfile_Template.json
FAIL workflow state references :: BacklogArchive missing done UNITY-001 row
```

GREEN result after implementation:

```text
PASS UNITY-001 requirements document anchors
PASS UnityProjectProfile template contract
PASS workflow state references
```

## Tooling Added

```text
tools/aiworkflow/unity001_profile_requirements_check.ps1
tools/aiworkflow/unity001_profile_requirements_check.bat
```

The check validates:

```text
- requirements document exists
- required document anchors exist
- required Unity-specific terms exist
- template JSON parses
- template includes required top-level contract fields
- template uses engine = unity
- template includes Assets/Scripts
- template includes windows_steam and android_google_play targets
- BacklogArchive records UNITY-001 as done
- ProjectStatus records UNITY-001 and Unity project workflow profile requirements
```

## Key Decisions

Profile fields must cover:

```text
profile_id
project_id
project_name
engine
unity_version
project_root
active_project_selector_id
platform_targets
paths
approval_gates
validation
release_tracks
```

Approval gates use these categories:

```text
allowed_in_scope
review_required
ask_user_first
forbidden_generated
```

UNITY-002 boundary:

```text
Define concrete Unity validation profile candidates such as EditMode, PlayMode, Windows/Steam build smoke, Android/Google Play build smoke, package restore, and asset-reference checks.
```

UNITY-003 boundary:

```text
Define release-track workflow fields for Steam and Google Play, including store asset requirements, versioning, signing/credential boundaries, build artifact handoff, and publish approval gates.
```

## Validation

Commands run:

```bat
tools\aiworkflow\unity001_profile_requirements_check.bat
tools\aiworkflow\backlog_archive_consistency_check.bat
git diff --check
```

Results:

```text
UNITY-001 check: PASS
Backlog archive consistency: PASS
git diff --check: passed with line-ending warnings only
```

No build was required because UNITY-001 is documentation/template-only and does not change game source/data.
