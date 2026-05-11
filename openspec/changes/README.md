# OpenSpec Changes

This directory stores active or proposed changes.

## Purpose

Each new feature or major modification should have its own change folder.

## Suggested Structure

```text
openspec/changes/
└─ change-name/
   ├─ proposal.md
   ├─ tasks.md
   └─ specs/
      └─ affected-module/
         └─ spec.md
```

## Rules

* One feature or major modification = one change folder.
* `proposal.md` explains why and what will change.
* `tasks.md` tracks implementation progress.
* `specs/` records the expected behavior after the change.
* After the change is completed, update `openspec/specs/`.