# UNITY-003 Unity Release Track Workflow Fields

Date: 2026-06-11
Status: completed

## Summary

Defined release-track workflow fields for Unity projects targeting Steam / Windows and Google Play / Android before implementing any store automation, credential handling, or publishing flow.

Primary outputs:

```text
_Docs/AIWorkflow/Unity_Release_Track_Workflow_Fields.md
_Docs/AIWorkflow/UnityReleaseTrack_Template.json
```

## Scope

UNITY-003 defines release-track state and safety gates.

It covers:

```text
- release track concept and statuses
- common release fields
- Steam / Windows release fields
- Google Play / Android release fields
- human approval gates
- automated validation fields
- forbidden automation without explicit approval
- links to UNITY-001 project profiles and UNITY-002 validation profiles
```

It does not:

```text
- create Steamworks configuration
- create Google Play Console configuration
- create/store keystores
- upload builds
- publish builds
- modify external store pages
- implement store API clients
- change Unity project files
- change Dust Land C++ source/data
```

## TDD / RED-GREEN Evidence

RED command before check existed:

```bat
tools\aiworkflow\unity003_release_track_fields_check.bat
```

Initial failure:

```text
No such file or directory
```

After adding the check but before docs/template/state updates, expected RED failure included:

```text
FAIL UNITY-003 release track document anchors :: Required file not found: ...Unity_Release_Track_Workflow_Fields.md
FAIL UnityReleaseTrack template contract :: template missing or invalid JSON: Required file not found: ...UnityReleaseTrack_Template.json
FAIL workflow state and Unity boundary references :: BacklogArchive missing done UNITY-003 row
```

GREEN result after implementation:

```text
PASS UNITY-003 release track document anchors
PASS UnityReleaseTrack template contract
PASS workflow state and Unity boundary references
```

## Tooling Added

```text
tools/aiworkflow/unity003_release_track_fields_check.ps1
tools/aiworkflow/unity003_release_track_fields_check.bat
```

The check validates:

```text
- release-track document exists
- required document anchors exist
- required Steam / Google Play release terms exist
- template JSON parses
- template includes required top-level contract fields
- template uses engine = unity
- template includes windows_steam and android_google_play tracks
- template includes expected release_track_id examples
- UNITY-001 and UNITY-002 boundary references remain traceable
- BacklogArchive records UNITY-003 as done
- ProjectStatus records UNITY-003 and release-track workflow wording
```

## Key Decisions

Release tracks use these target IDs:

```text
windows_steam
android_google_play
```

Default statuses:

```text
draft
pre_release
internal_test
closed_test
release_candidate
ready_for_human_publish
published
blocked
archived
```

Gate levels:

```text
auto_check_allowed
prepare_only
ask_user_first
human_approval_required
forbidden_without_explicit_approval
```

Forbidden without explicit approval:

```text
Steam upload
Steam branch publish
Steam store page publish
Google Play upload
Google Play track promote
Google Play production_release
keystore generation/change/import
signing credential handling
store credential handling
application_id change
steam_app_id change
privacy policy external publish/change
```

## Validation

Commands run:

```bat
tools\aiworkflow\unity003_release_track_fields_check.bat
tools\aiworkflow\unity002_validation_profiles_check.bat
tools\aiworkflow\unity001_profile_requirements_check.bat
tools\aiworkflow\backlog_archive_consistency_check.bat
git diff --check
```

Expected final results:

```text
UNITY-003 check: PASS
UNITY-002 check: PASS
UNITY-001 check: PASS
Backlog archive consistency: PASS
git diff --check: passed with line-ending warnings only
```

No build is required because UNITY-003 is documentation/template-only and does not change game source/data.
