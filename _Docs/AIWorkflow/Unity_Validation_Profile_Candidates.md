# Unity Validation Profile Candidates

Status: Current candidate definition
Task: UNITY-002
Purpose: Define Unity validation profile candidates that can be attached to a Unity project workflow profile before implementing real Unity automation.

---

## Purpose

UNITY-001 defined what a Unity project workflow profile must be able to describe. UNITY-002 defines the validation profiles that such a project profile should be able to select.

A validation profile is a named validation route with:

```text
when to run it
which Unity command category it represents
what artifacts it should produce
which changes it validates
which failures should block completion
which human approval gates remain outside automated validation
```

This document is intentionally not an implementation of Unity Editor automation. It is a candidate contract for later tooling.

---

## Candidate Profiles

Minimum candidate set:

| Profile ID | Purpose | Typical trigger | Blocks completion? |
|---|---|---|---:|
| `unity_project_open` | Confirm project opens and packages restore in batchmode | any Unity task before deeper checks | yes |
| `unity_editmode_tests` | Fast C# editor/domain logic checks | scripts/editor/tooling/data model changes | yes when relevant |
| `unity_playmode_tests` | Runtime behavior checks through Unity Test Runner | gameplay/prefab/scene/runtime system changes | yes when relevant |
| `unity_windows_steam_build_smoke` | Desktop build smoke for Steam target | release/platform/build-impacting changes | yes for Steam-target work |
| `unity_android_google_play_build_smoke` | Android build smoke for Google Play/mobile target | mobile/platform/build-impacting changes | yes for Android-target work |
| `unity_asset_reference_check` | Detect broken references/addressable/resource links | prefab/scene/asset path changes | yes when available |
| `unity_scene_open_smoke` | Confirm target scenes can load/open without obvious errors | scene/prefab/UI-flow changes | yes when relevant |

The profile selection should be based on changed paths, task kind, target platform, and human approval gates.

---

## EditMode Test Profile

Profile ID:

```text
unity_editmode_tests
```

Purpose:

```text
Run Unity Test Runner EditMode tests for C# logic, editor tooling, asset processors, validators, and deterministic data/model behavior.
```

Candidate command shape:

```text
<Unity> -batchmode -projectPath <project_path> -runTests -testPlatform EditMode -testResults <artifacts>/editmode-results.xml -logFile <artifacts>/editmode.log
```

Required metadata:

```text
unity_editor_path or discoverable editor
project_path
artifacts directory
testResults XML path
log path
```

Good coverage:

```text
C# pure/domain logic
ScriptableObject validation helpers
editor import/validation scripts
save/load serializers
project-specific data validators
```

Does not prove:

```text
runtime scene feel
input feel
camera/UI readability
platform build health
store compliance
```

---

## PlayMode Test Profile

Profile ID:

```text
unity_playmode_tests
```

Purpose:

```text
Run Unity Test Runner PlayMode tests for runtime behavior that needs Unity scene/player loop context.
```

Candidate command shape:

```text
<Unity> -batchmode -projectPath <project_path> -runTests -testPlatform PlayMode -testResults <artifacts>/playmode-results.xml -logFile <artifacts>/playmode.log
```

Good coverage:

```text
MonoBehaviour lifecycle behavior
scene boot smoke
runtime UI contract checks when automated
prefab-instantiated behavior
physics/collision logic that can be tested deterministically
```

Does not prove:

```text
human UX feel
visual taste
device-specific performance
store build/signing validity
```

---

## Package Restore / Project Open Profile

Profile ID:

```text
unity_project_open
```

Purpose:

```text
Verify that Unity can open the project in batchmode, resolve Packages/manifest.json, and exit without project-open errors.
```

Candidate command shape:

```text
<Unity> -batchmode -quit -projectPath <project_path> -logFile <artifacts>/project-open.log
```

Inputs / anchors:

```text
Packages/manifest.json
Packages/packages-lock.json if present
ProjectSettings
Assets folder
```

Blocks completion when:

```text
Unity exits non-zero
package resolution fails
script compilation fails during project open
editor log contains project-open blocking errors
```

Human approval remains required for:

```text
package add/remove/major upgrade
Unity version change
render pipeline or input system switch
ProjectSettings changes outside approved scope
```

---

## Windows Steam Build Smoke Profile

Profile ID:

```text
unity_windows_steam_build_smoke
```

Purpose:

```text
Produce or validate a StandaloneWindows64 smoke build suitable for Steam-track tasks.
```

Candidate command shape:

```text
<Unity> -batchmode -quit -projectPath <project_path> -executeMethod BuildScript.BuildWindowsSteam -logFile <artifacts>/windows-steam-build.log
```

Required output:

```text
build artifact directory
build log
exit code
optional artifact manifest
```

Expected Unity target:

```text
StandaloneWindows64
```

Blocks completion when:

```text
build command exits non-zero
expected executable/build artifact is missing
script compilation fails
build log has fatal build errors
```

Does not cover full release:

```text
Steam depot upload
Steamworks configuration
store page assets
achievements/cloud-save correctness
final QA certification
```

---

## Android Google Play Build Smoke Profile

Profile ID:

```text
unity_android_google_play_build_smoke
```

Purpose:

```text
Produce or validate an Android smoke build route for Google Play/mobile-target tasks without handling store credentials automatically.
```

Candidate command shape:

```text
<Unity> -batchmode -quit -projectPath <project_path> -executeMethod BuildScript.BuildAndroidGooglePlay -logFile <artifacts>/android-google-play-build.log
```

Expected Unity target:

```text
Android
```

Recommended build assumptions:

```text
IL2CPP
ARM64
package identity configured by human-approved project settings
versionCode/versionName policy defined by release track
keystore/signing human-gated unless a later secure process exists
```

Blocks completion when:

```text
build command exits non-zero
APK/AAB build artifact is missing
script compilation fails
Android target support is missing for a task that requires Android validation
```

Human approval remains required for:

```text
keystore
signing credentials
application id/package name
store identity
permission-sensitive manifest changes
Google Play publish action
```

---

## Asset Reference / Scene Smoke Profiles

Profile IDs:

```text
unity_asset_reference_check
unity_scene_open_smoke
```

Purpose:

```text
Catch broken Unity references, missing assets, scene-open errors, and obvious prefab/scene regressions before human visual review.
```

Candidate approaches:

```text
project-defined editor validation script
Addressables validation if Addressables is used
scene list open/load validation in batchmode
prefab reference scanner
missing script/material/texture reference scanner
```

Useful for changes under:

```text
Assets/Scenes
Assets/Prefabs
Assets/Materials
Assets/Animations
Assets/Resources
Addressables configuration
```

Does not replace human review for:

```text
visual taste
composition
readability
animation feel
input feel
scene pacing
```

---

## Validation Selection Matrix

Recommended default matrix:

| Change type | Required validation |
|---|---|
| C# gameplay/domain script | `unity_project_open`, `unity_editmode_tests`, relevant `unity_playmode_tests` |
| Editor tooling/validators | `unity_project_open`, `unity_editmode_tests` |
| Scene or prefab behavior | `unity_project_open`, `unity_playmode_tests`, `unity_scene_open_smoke`, `unity_asset_reference_check` |
| Package manifest change | `unity_project_open`, relevant tests, human approval for package change |
| ProjectSettings change | `unity_project_open`, target build smoke, human approval |
| Steam/Windows build-impacting change | `unity_project_open`, tests as relevant, `unity_windows_steam_build_smoke` |
| Android/mobile build-impacting change | `unity_project_open`, tests as relevant, `unity_android_google_play_build_smoke` |
| Store/release metadata | validation depends on UNITY-003 release-track fields; human approval required |

Default completion rule:

```text
Do not mark Unity implementation work done unless the selected validation profiles have passed or are explicitly documented as unavailable with a bounded reason.
```

---

## Non-goals

UNITY-002 does not:

```text
run Unity Editor
install Unity
create test assemblies
create BuildScript methods
define Steam release checklist fields
handle Google Play signing or upload
publish builds
change existing C++ Dust Land validation
change Discord/PC Runner command behavior
```

Those belong to later implementation tasks or UNITY-003 for release-track fields.

---

## Completion Criteria

UNITY-002 is complete when:

```text
[ ] this validation profile candidate document exists
[ ] UnityValidationProfiles_Template.json exists and parses
[ ] EditMode, PlayMode, project-open, Windows Steam build smoke, Android Google Play build smoke, asset reference, and scene smoke profiles are documented
[ ] validation selection matrix is documented
[ ] UNITY-003 release boundary remains explicit
[ ] unity002_validation_profiles_check.bat passes
[ ] BacklogArchive and ProjectStatus record UNITY-002 completion
```
