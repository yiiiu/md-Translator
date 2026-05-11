# OpenSpec Specs

This directory stores confirmed long-term specifications.

## Purpose

Use this directory to record stable project requirements and module-level behavior.

## Suggested Structure

Each module should have its own folder:

```text
openspec/specs/
├─ auth/
│  └─ spec.md
├─ user/
│  └─ spec.md
└─ example-module/
   └─ spec.md
```

## Rules

* Specs here represent confirmed long-term behavior.
* Do not put temporary task notes here.
* Do not put chat history here.
* When a change is completed and accepted, merge its final behavior into this directory.