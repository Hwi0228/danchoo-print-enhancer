# Changelog

## 0.3.0 — 2026-11-18

- Replace nested-element counting with deepest numbered-stem detection.
- Group sibling fragments from each numbered stem up to the next stem within safe normal-flow containers.
- Add a red-accent workbook-inspired print treatment with restrained rules and spacing.
- Add a regression fixture where question 3 stem, diagram, and choices are separate DOM siblings.
- Keep EBS's native print dialog and printer settings; live EBS DOM compatibility remains unverified.

## 0.2.0 — 2026-11-18

- Target the middle/high-school DANCHOO+ `solvePaper.ebs` route.
- Preserve EBS's native preview and print workflow.
- Add heuristic question detection and keep-together print rules.