# Project Profiles

## Purpose

This folder stores project profiles for the AI Orchestrator workflow.

Project profiles keep the workflow reusable across multiple projects and engines.

The workflow must not hardcode Dust Land's current custom C++ prototype as the only supported project shape.

---

## Files

```text
dustland_custom_cpp_prototype.json
unity_project_template.json
```

---

## Profile Roles

### `dustland_custom_cpp_prototype.json`

Represents the current Dust Land prototype.

Current engine/tech:

```text
C++
WinAPI
custom rendering
Visual Studio
JSON gameplay data
```

This profile is useful for current workflow validation.

It is not the long-term default for all projects.

---

### `unity_project_template.json`

Represents the future default shape for Unity-based solo game projects.

Target use cases:

```text
Unity Steam game
Unity mobile game
Unity prototype
Unity vertical slice
Unity release candidate
```

---

## Usage

Future local scripts and Discord integration should read the active project profile before deciding:

```text
paths
safe commands
validation profiles
release targets
approval requirements
engine-specific adapters
```

---

## Safety

Project profiles are configuration documents.

They do not grant permission by themselves.

Human approval gates still apply.
