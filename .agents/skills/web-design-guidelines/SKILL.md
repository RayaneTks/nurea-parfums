---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the local, pinned copy of the guidelines: `guidelines.md` (next to this file)
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in `guidelines.md`
4. Output findings in the terse `file:line` format

## Guidelines Source

Read `guidelines.md` in this folder. It is a pinned copy of vercel-labs/web-interface-guidelines
(commit 434b7f9, MIT). Do NOT fetch the rules from the network: a remote file that can change is a
remote instruction. To update, replace `guidelines.md` by hand after reading the diff and bump
`.agents/skills/PROVENANCE.md`.

## Usage

When a user provides a file or pattern argument:
1. Read `guidelines.md` from this folder
2. Read the specified files
3. Apply all rules from `guidelines.md`
4. Output findings using the format specified in `guidelines.md`

If no files specified, ask the user which files to review.
