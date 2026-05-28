# Planning Brief: Developer Worker Dry-Run Plan Creation Pilot

## Summary

This Packet exists to validate the positive dry-run path for the Developer Worker automation.

The automation already passed the no-candidate path. This pilot gives it one active approved-scope Developer Packet so it can create `DeveloperDryRunPlan.md` without editing source.

## Korean Summary

이 Packet은 Developer Worker 자동화가 후보가 있을 때 `DeveloperDryRunPlan.md`를 생성하는지 확인하기 위한 테스트 Packet이다.

실제 구현을 시키는 작업이 아니다. 자동화는 승인된 source 파일을 읽고 계획만 작성해야 한다.

## Context

The selected topic is a follow-up review of the completed outgame resolution-change character position fix.

The dry-run should reason about the already implemented area:

- `OutGameScene::_HandleViewportChanged()`
- `Background::UpdateViewport()`
- outgame nav mesh resizing
- player field-relative position preservation

## Goal

Validate that the Developer Worker dry-run automation can:

- find an active approved-scope Developer Packet
- read approved files
- write a dry-run implementation plan
- avoid all implementation and status changes

## Non-Goals

- Do not edit source.
- Do not edit JSON.
- Do not run build or tests.
- Do not change runtime behavior.
- Do not update Packet status from automation.
- Do not commit or push.
