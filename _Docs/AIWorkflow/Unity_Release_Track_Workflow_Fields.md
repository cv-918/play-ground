# Unity Release Track Workflow Fields

Status: Current release-track field definition
Task: UNITY-003
Purpose: Define release-track workflow fields for Unity projects targeting Steam / Windows and Google Play / Android before implementing any store automation, credential handling, or publishing flow.

---

## Purpose

UNITY-003 defines how AIWorkflow should represent release-oriented work without treating release work like normal coding work.

A release track records:

```text
which platform/store target is being prepared
which build artifact is expected
which validation profile proves build health
which store metadata exists or is missing
which human approval gates must stop automation
which external publish/upload actions are forbidden unless explicitly approved
```

This is a safety specification. It does not publish anything.

---

## Release Track Concept

A release track is a per-platform release state record.

Examples:

```text
windows_steam demo track
windows_steam full release track
android_google_play internal test track
android_google_play production release track
```

Each track should be linked to:

```text
Unity project profile from UNITY-001
Unity validation profile selection from UNITY-002
release artifact location
store metadata/status fields
human approval state
```

Minimum identity fields:

```text
release_track_id
project_id
profile_id
target
status
owner
last_reviewed
```

Recommended statuses:

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

---

## Common Release Fields

Fields shared by Steam and Google Play tracks:

| Field | Purpose |
|---|---|
| `release_track_id` | Stable release-track identifier. |
| `project_id` | Owning Unity project. |
| `profile_id` | Unity project workflow profile ID. |
| `target` | `windows_steam` or `android_google_play`. |
| `status` | Workflow release state. |
| `version_name` | Human-readable version string. |
| `build_number` | Project-defined build number when applicable. |
| `unity_version` | Expected Unity version for reproducibility. |
| `validation_profile_id` | UNITY-002 validation profile, e.g. build smoke. |
| `artifact_path` | Expected output path for build artifact. |
| `artifact_manifest_path` | Optional machine-readable artifact manifest. |
| `store_metadata_status` | State of store listing/content readiness. |
| `store_assets_status` | State of capsule/icon/screenshot/video assets. |
| `release_notes_status` | State of release notes/changelog. |
| `qa_status` | QA/pass/fail/blocked state. |
| `human_approval_status` | Approval state for release-impacting actions. |
| `publish_status` | Not-started/blocked/ready/published state. |

Recommended common approval fields:

```text
build_artifact_acceptance
store_copy_approval
store_asset_approval
version_approval
upload_approval
publish_approval
rollback_plan_approval
```

---

## Steam / Windows Release Fields

Target:

```text
windows_steam
```

Expected validation profile:

```text
unity_windows_steam_build_smoke
```

Steam / Windows fields:

| Field | Purpose |
|---|---|
| `steam_app_id` | Steam App ID; nullable until assigned. |
| `steam_depot_ids` | Depot IDs or placeholders. |
| `depot_config_path` | SteamPipe/depot config path if used. |
| `steam_branch` | Target branch such as internal, beta, default. |
| `build_output_dir` | Windows build artifact output directory. |
| `executable_path` | Expected executable path in artifact. |
| `save_data_policy` | Local/cloud save policy. |
| `steam_cloud_status` | Steam Cloud integration status. |
| `achievements_status` | Achievement integration status. |
| `controller_support_status` | Controller support readiness. |
| `store_page_status` | Steam store page readiness. |
| `capsule_assets_status` | Capsule/header/library asset readiness. |
| `steamworks_sdk_status` | Steamworks SDK integration status if used. |

Required human approval examples:

```text
steam_app_id change
steam_depot_ids change
depot_config_path change
steam_branch publish target
store_page publish
production_release
```

Automated checks may verify file existence and field presence, but may not upload to Steam or publish a branch without explicit approval.

---

## Google Play / Android Release Fields

Target:

```text
android_google_play
```

Expected validation profile:

```text
unity_android_google_play_build_smoke
```

Google Play / Android fields:

| Field | Purpose |
|---|---|
| `application_id` | Android package name / Google Play app identity. |
| `version_code` | Monotonically increasing Android version code. |
| `version_name` | User-facing Android version name. |
| `artifact_type` | `AAB` by default for Google Play. |
| `aab_output_path` | Expected Android App Bundle artifact path. |
| `keystore_policy` | Human-managed / CI-managed / not-configured. |
| `signing_status` | Signing readiness state. |
| `min_sdk` | Minimum Android SDK level. |
| `target_sdk` | Target Android SDK level. |
| `scripting_backend` | Usually IL2CPP for release. |
| `architecture` | Required architectures, e.g. ARM64. |
| `permissions_review_status` | Android permissions review status. |
| `privacy_policy_status` | Privacy policy readiness. |
| `data_safety_status` | Google Play Data safety form status. |
| `store_listing_status` | Store listing readiness. |
| `internal_test_status` | Internal test track state. |
| `closed_test_status` | Closed test state. |
| `production_release_status` | Production release state. |

Required human approval examples:

```text
application_id change
version_code policy change
keystore or signing change
permission-sensitive manifest change
privacy_policy update
Google Play upload
production_release
```

Automation may prepare or validate an AAB build artifact, but must not handle keystore secrets, upload to Google Play, or promote to production without explicit human approval.

---

## Human Approval Gates

Release workflow must use stricter gates than normal code work.

Gate levels:

```text
auto_check_allowed
prepare_only
ask_user_first
human_approval_required
forbidden_without_explicit_approval
```

Default gate mapping:

| Action | Gate |
|---|---|
| Verify build artifact exists | `auto_check_allowed` |
| Generate local release checklist draft | `prepare_only` |
| Change version fields | `ask_user_first` |
| Change Steam App ID / depot config | `human_approval_required` |
| Change Android application_id | `human_approval_required` |
| Change keystore/signing settings | `human_approval_required` |
| Modify privacy_policy or data safety declarations | `human_approval_required` |
| Upload to Steam / Google Play | `forbidden_without_explicit_approval` |
| Publish, promote, or make public | `forbidden_without_explicit_approval` |

Approval records should include:

```text
requested_action
release_track_id
risk_summary
exact files/services affected
validation evidence
rollback or recovery note
human decision
approved_at
```

---

## Automated Validation Fields

Fields that can be checked automatically without external publish side effects:

```text
artifact_path exists
artifact_manifest_path parses
version_name format
version_code monotonic rule if previous value is available
expected build target matches validation profile
store asset file existence
required screenshots/icon paths exist
Android permissions list extracted for review
privacy_policy_status is not missing before release candidate
Steam executable path exists
AAB artifact exists for Google Play
```

Recommended evidence fields:

```text
last_validation_profile_id
last_validation_result
last_validation_report_path
last_build_artifact_path
last_build_log_path
last_store_asset_check_path
last_permission_review_path
```

Automated validation can say “ready for human review”. It must not say “published” unless an explicit external publish step was approved and verified.

---

## Forbidden Automation Without Explicit Approval

These actions are forbidden unless the Human Director explicitly approves that exact action and target:

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
privacy policy publish/change on external service
public release announcement
```

Even with approval, credential handling should prefer user-owned tools/sessions and avoid storing secrets in repo files.

---

## UNITY-001 / UNITY-002 Links

UNITY-001 provides the project profile context:

```text
project_id
profile_id
engine = unity
unity_version
paths
platform_targets
approval_gates
release_tracks
```

UNITY-002 provides validation profile IDs used by release tracks:

```text
unity_windows_steam_build_smoke
unity_android_google_play_build_smoke
unity_project_open
unity_editmode_tests
unity_playmode_tests
unity_asset_reference_check
unity_scene_open_smoke
```

UNITY-003 adds release-track state and approval fields on top of those foundations.

---

## Non-goals

UNITY-003 does not:

```text
create Steamworks configuration
create Google Play Console configuration
create or store keystores
upload builds
publish builds
modify external store pages
write production release notes
implement store API clients
change Unity project files
change Dust Land C++ source/data
```

Future implementation tasks must be separately approved and should use the fields defined here as their safety contract.

---

## Completion Criteria

UNITY-003 is complete when:

```text
[ ] this release-track workflow field document exists
[ ] UnityReleaseTrack_Template.json exists and parses
[ ] common release fields are documented
[ ] Steam / Windows release fields are documented
[ ] Google Play / Android release fields are documented
[ ] human approval gates and forbidden automation are explicit
[ ] UNITY-001 / UNITY-002 links are traceable
[ ] unity003_release_track_fields_check.bat passes
[ ] BacklogArchive and ProjectStatus record UNITY-003 completion
```
