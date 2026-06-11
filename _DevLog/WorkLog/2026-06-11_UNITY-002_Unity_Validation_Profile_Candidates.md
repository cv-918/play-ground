# UNITY-002 Unity Validation Profile Candidates

Date: 2026-06-11
Status: completed

## Summary

Defined Unity validation profile candidates that can be attached to a Unity project workflow profile before implementing real Unity automation.

Primary outputs:

```text
_Docs/AIWorkflow/Unity_Validation_Profile_Candidates.md
_Docs/AIWorkflow/UnityValidationProfiles_Template.json
```

## Scope

UNITY-002 defines candidate validation routes for Unity projects.

It covers:

```text
- project open / package restore check
- EditMode test profile
- PlayMode test profile
- Windows Steam build smoke profile
- Android Google Play build smoke profile
- asset reference check profile
- scene open smoke profile
- validation selection matrix by change type
```

It does not:

```text
- run Unity Editor
- install Unity
- create Unity test assemblies
- create BuildScript methods
- define Steam or Google Play release checklist fields
- handle signing, credentials, uploads, or publishing
- change existing Dust Land C++ validation
- change Discord/PC Runner command behavior
```

## TDD / RED-GREEN Evidence

RED command before check existed:

```bat
tools\aiworkflow\unity002_validation_profiles_check.bat
```

Initial failure:

```text
No such file or directory
```

After adding the check but before docs/template/state updates, expected RED failure included:

```text
FAIL UNITY-002 validation profile document anchors :: Required file not found: ...Unity_Validation_Profile_Candidates.md
FAIL UnityValidationProfiles template contract :: template missing or invalid JSON: Required file not found: ...UnityValidationProfiles_Template.json
FAIL workflow state and UNITY-001 boundary references :: BacklogArchive missing done UNITY-002 row
```

GREEN result after implementation:

```text
PASS UNITY-002 validation profile document anchors
PASS UnityValidationProfiles template contract
PASS workflow state and UNITY-001 boundary references
```

## Tooling Added

```text
tools/aiworkflow/unity002_validation_profiles_check.ps1
tools/aiworkflow/unity002_validation_profiles_check.bat
```

The check validates:

```text
- validation profile document exists
- required document anchors exist
- required Unity validation terms exist
- template JSON parses
- template includes required top-level contract fields
- template uses engine = unity
- template includes the expected candidate profile IDs
- UNITY-001 boundary text remains traceable
- BacklogArchive records UNITY-002 as done
- ProjectStatus records UNITY-002 and Unity validation profile wording
```

## Key Decisions

Minimum candidate profile set:

```text
unity_project_open
unity_editmode_tests
unity_playmode_tests
unity_windows_steam_build_smoke
unity_android_google_play_build_smoke
unity_asset_reference_check
unity_scene_open_smoke
```

Default selection matrix:

```text
C# gameplay/domain script -> project_open + editmode + relevant playmode
Editor tooling/validators -> project_open + editmode
Scene/prefab behavior -> project_open + playmode + scene_open + asset_reference
Windows/Steam build-impacting -> project_open + relevant tests + windows build smoke
Android/Google Play build-impacting -> project_open + relevant tests + android build smoke
```

UNITY-003 boundary:

```text
Release-track fields such as store assets, versioning, signing/credential boundaries, artifact handoff, and publish approval gates are not part of UNITY-002.
```

## Validation

Commands run:

```bat
tools\aiworkflow\unity002_validation_profiles_check.bat
tools\aiworkflow\unity001_profile_requirements_check.bat
tools\aiworkflow\backlog_archive_consistency_check.bat
git diff --check
```

Expected final results:

```text
UNITY-002 check: PASS
UNITY-001 check: PASS
Backlog archive consistency: PASS
git diff --check: passed with line-ending warnings only
```

No build is required because UNITY-002 is documentation/template-only and does not change game source/data.
