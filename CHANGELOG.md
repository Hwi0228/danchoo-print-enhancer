# Changelog

## 0.2.0 — 2026-11-18

- Retarget the userscript to the actual middle/high-school DANCHOO+ `solvePaper.ebs` route.
- Replace the separate print workflow with an enhancement toggle that preserves EBS's own preview and printer controls.
- Add heuristic detection of question containers and keep-together print rules.
- Apply the same rules to accessible same-origin iframes and rescan when the page adds preview content.
- Preserve EBS paper size, selected printer, copies, layout choice, and color settings; page count may change when question blocks are kept together.

## 0.1.0 — 2026-11-18

- Initial experimental release with manual print-area selection and independent browser printing.
