# Unity Project Workflow Profile Requirements

Status: Current requirements draft
Task: UNITY-001
Purpose: Define the minimum project-profile contract required before AIWorkflow/Hermes automation can safely operate on Unity-based game projects for Steam and Google Play/mobile workflows.

---

## Purpose

A Unity project workflow profile is a project-specific operating card for AI tools and automation.

It tells the orchestrator:

```text
what kind of project this is
where important Unity files live
which paths are safe to edit within an approved task scope
which paths need explicit human approval
how validation should be invoked
which platform/release targets matter
which future release-track details belong to follow-up tasks
```

This is needed because the current Dust Land workflow was validated against a custom C++/WinAPI prototype, while long-term solo game development is expected to include Unity projects, Steam releases, and Google Play/mobile releases.

The profile prevents tools from applying C++ assumptions such as:

```text
Visual Studio solution as the only build entry
MSBuild Debug x64 as the only build proof
PlayGround/Data as the only data root
C++ source-anchor checks as the only automated validation path
```

---

## Required Profile Fields

A Unity profile should include these fields before being used by automation.

| Field | Required | Purpose |
|---|---:|---|
| `profile_id` | yes | Stable workflow profile identifier, e.g. `unity_steam_default`. |
| `project_id` | yes | Stable project identifier, e.g. `dustland-unity-port`. |
| `project_name` | yes | Human-readable name. |
| `engine` | yes | Must be `unity`. |
| `unity_version` | yes | Expected Unity editor version or LTS family. |
| `project_root` | yes | Absolute or repo-relative Unity project root. |
| `active_project_selector_id` | yes | Link back to the active-project selector/state. |
| `platform_targets` | yes | Target list such as `windows_steam`, `android_google_play`. |
| `paths` | yes | Known Unity path map. |
| `approval_gates` | yes | Human approval requirements for risky Unity changes. |
| `validation` | yes | Validation hooks and expected commands/categories. |
| `release_tracks` | yes | Platform/release metadata hooks, not full release implementation. |

Minimum `paths` contract:

```text
Assets/Scripts
Assets/Scenes
Assets/Prefabs
Assets/ScriptableObjects
Assets/Resources or Addressables path if used
Packages/manifest.json
ProjectSettings
UserSettings, Library, Temp, Obj, Logs as local/generated paths
```

---

## Path Scope Rules

Path rules define what an AI agent may edit after a task has been approved.

### Normally allowed within approved task scope

```text
Assets/Scripts
Assets/ScriptableObjects
Assets/Tests
Assets/Editor
project-owned documentation
non-generated config templates explicitly included in the task
```

### Review-required / high-risk paths

```text
Assets/Scenes
Assets/Prefabs
Assets/Animations
Assets/Materials
Assets/Resources
Addressables configuration
Packages/manifest.json
Packages/packages-lock.json
ProjectSettings
```

These can be edited only when the approved task explicitly includes them and validation covers the expected effects.

### Human approval required before changing

```text
Unity editor version
render pipeline
Input System package/settings
physics settings
quality settings
player settings
scripting backend
bundle identifier / application id
keystore / signing configuration
Steam App ID / depot configuration
Google Play package identity / store signing assumptions
```

### Normally forbidden / generated / local-only

```text
Library
Temp
Obj
Logs
Build
Builds
UserSettings
.vs
.idea
.DS_Store
crash dumps
machine-local editor caches
```

---

## Human Approval Gates

The profile should expose approval gates so the orchestrator can stop before risky work.

Recommended gate levels:

```text
allowed_in_scope
review_required
ask_user_first
forbidden_generated
```

Default policy:

| Change category | Gate |
|---|---|
| C# gameplay script in approved scope | `allowed_in_scope` |
| EditMode/PlayMode tests | `allowed_in_scope` |
| Scene or prefab structural change | `review_required` |
| Package add/remove/major version change | `ask_user_first` |
| ProjectSettings change | `ask_user_first` |
| Unity version change | `ask_user_first` |
| Build target/platform switch | `ask_user_first` |
| Signing/keystore/store identity | `ask_user_first` |
| Library/Temp/Obj/UserSettings edits | `forbidden_generated` |

---

## Validation Hooks

UNITY-001 does not implement Unity validation. It defines what the profile must be able to describe.

Required validation categories:

```text
unity_project_open_check
package_restore_check
editmode_tests
playmode_tests
platform_build_smoke
asset_reference_check
scene_open_smoke
```

Required command metadata:

| Field | Purpose |
|---|---|
| `unity_editor_path` | Optional explicit editor path when not discovered automatically. |
| `project_path` | Unity `-projectPath` value. |
| `batchmode_supported` | Whether CI/headless checks are expected. |
| `editmode_test_command` | Command template for EditMode tests. |
| `playmode_test_command` | Command template for PlayMode tests. |
| `build_commands` | Per-platform build command templates. |
| `artifacts` | Paths to test result XML, build output, logs. |

Example validation intent:

```text
EditMode: fast C# logic/editor tests
PlayMode: runtime behavior tests that can run through Unity Test Runner
StandaloneWindows64: Steam/desktop build smoke
Android: Google Play/mobile build smoke
```

---

## Platform / Release Hooks

The profile should record enough platform metadata to route work safely, but full store-release checklists belong to UNITY-003.

### Steam / Windows hook fields

```text
target: windows_steam
unity_build_target: StandaloneWindows64
build_output_dir
steam_app_id placeholder
steam_depot_config path placeholder
save_data_policy
controller_input_policy
achievement_integration_status
```

### Google Play / Android hook fields

```text
target: android_google_play
unity_build_target: Android
application_id / package name placeholder
version_code_policy
version_name_policy
keystore_policy
min_sdk / target_sdk placeholders
scripting_backend, e.g. IL2CPP
architecture requirement, e.g. ARM64
permission_review_required
```

Signing, keystore, store credentials, app IDs, and release publishing must remain human-gated unless a later task explicitly defines a safe credential and release process.

---

## Example Profiles

### Dust Land Unity port example

```text
profile_id: unity_steam_default
project_id: dustland-unity-port
engine: unity
unity_version: 2022.3 LTS or project-pinned LTS
platform_targets: windows_steam
primary paths: Assets/Scripts, Assets/Scenes, Assets/Prefabs, ProjectSettings, Packages/manifest.json
validation: EditMode, PlayMode, StandaloneWindows64 build smoke
approval: ProjectSettings/package/render/input changes ask_user_first
```

### Unity mobile prototype example

```text
profile_id: unity_android_default
project_id: mobile-roguelite-prototype
engine: unity
unity_version: project-pinned LTS
platform_targets: android_google_play
primary paths: Assets/Scripts, Assets/Scenes, Assets/Prefabs, ProjectSettings, Packages/manifest.json
validation: EditMode, PlayMode, Android build smoke
approval: package id/signing/keystore/player settings ask_user_first
```

---

## UNITY-002 / UNITY-003 Boundaries

UNITY-001 stops at profile requirements.

UNITY-002 should define concrete validation profile candidates:

```text
EditMode test profile
PlayMode test profile
Windows/Steam build smoke profile
Android/Google Play build smoke profile
package restore/profile health check
asset reference/profile integrity check
```

UNITY-003 should define release-track workflow fields:

```text
Steam release checklist fields
Google Play release checklist fields
store asset requirements
versioning policy
signing/credential boundaries
build artifact handoff rules
publish approval gates
```

Non-goals for UNITY-001:

```text
creating a Unity project
running Unity Editor
implementing Unity build/test automation
changing existing Discord/PC Runner behavior
changing Dust Land C++ source/data
creating real Steam or Google Play release configuration
```

---

## Completion Criteria

UNITY-001 is complete when:

```text
[ ] this requirements document exists
[ ] UnityProjectProfile_Template.json exists and parses
[ ] required fields, path scope rules, human gates, validation hooks, and platform hooks are documented
[ ] UNITY-002 and UNITY-003 boundaries are explicit
[ ] unity001_profile_requirements_check.bat passes
[ ] BacklogArchive and ProjectStatus record the decision
```
