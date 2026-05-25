# Folder Purpose: Handoff Scanner

## Purpose

This folder stores read-only scanner design support documents and report templates for the AI Role Handoff System.

The scanner is a future helper behavior that reads Handoff state and reports queues, approval waits, blocked work, and consistency issues without changing repository files.

## Belongs Here

- Read-only scan report templates
- Role query examples
- Scanner output format notes
- Scanner safety notes

## Does Not Belong Here

- Automation scripts
- Scheduled job definitions
- Generated scan reports, unless a later phase explicitly approves storing them
- Packet manifests
- Source code
- Runtime artifacts
- Git automation

## Safety Boundary

Phase 5 scanner behavior is read-only.

No file writes, status updates, claims, approvals, build/test execution, commit, or push are allowed.
