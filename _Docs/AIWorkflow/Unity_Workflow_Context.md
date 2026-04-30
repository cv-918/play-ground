# Unity Workflow Context

## 1. Purpose

This document records the strategic engine and release direction for the AI Orchestrator workflow.

The current Dust Land prototype is custom-engine based, but the long-term workflow target is Unity-based solo game development.

---

## 2. Current Project Context

Dust Land currently exists as:

```text
C++ / WinAPI / custom rendering prototype
```

This prototype is useful for:

```text
gameplay experimentation
workflow validation
AI-assisted development process testing
early content/system design
```

However, it should not become the permanent baseline for all workflow automation decisions.

---

## 3. Strategic Target

Long-term target:

```text
Unity-based solo game production and release
```

Primary release targets:

```text
Steam
Google Play / mobile stores
```

Dust Land target:

```text
Prototype in current custom engine
Port to Unity for Steam release after prototype validation
```

Future projects:

```text
Unity-based from the beginning
Reusable AI workflow
Steam and/or mobile release
```

---

## 4. Workflow Design Implications

The AI Orchestrator workflow must remain:

```text
engine-agnostic
project-profile based
multi-project capable
release-pipeline aware
```

Avoid overfitting to:

```text
C++ only
WinAPI only
Visual Studio project files only
custom renderer only
Dust Land-specific folder assumptions only
```

Support future profiles such as:

```text
Unity 2D Steam game
Unity mobile game
Unity prototype
Unity vertical slice
Unity release candidate
```

---

## 5. Future Unity Project Profile Requirements

A future Unity project profile should include:

```yaml
project_id:
display_name:
engine: unity
unity_version:
repo_path:
assets_path:
scenes_path:
scripts_path:
project_settings_path:
target_platforms:
  - steam
  - google_play
build_profiles:
  - windows_debug
  - windows_release
  - android_development
  - android_release
validation_profiles:
  - editmode_tests
  - playmode_tests
  - scene_boot
  - build_smoke
  - store_package_check
docs_path:
devlog_path:
allowed_tools:
```

---

## 6. Discord Orchestrator Implication

Discord integration should not hardcode Dust Land or C++ behavior.

Correct structure:

```text
Discord Bot
  -> Orchestrator Core
      -> Project Profile
          -> Tool Adapters
```

For Dust Land custom prototype:

```text
use C++/WinAPI project profile
```

For future projects:

```text
use Unity project profile
```

---

## 7. Automation Priority Adjustment

Before building Discord execution features, define:

```text
Project profile schema
Task state schema
Validation profile schema
Read-only status summary format
```

Unity support should be considered in these schemas from the start.

---

## 8. Summary

Dust Land custom engine is the current testbed.

Unity is the long-term production target.

The workflow must optimize for reusable solo game production, not only for the current C++ prototype.
