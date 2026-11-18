# Roadmap

## v0.1.0 — Initial beta

- [x] Tampermonkey userscript
- [x] Manual print-area selection
- [x] A4 / A5 / Letter, portrait / landscape
- [x] One- and two-column layouts
- [x] Font size, line height, and margin controls
- [x] Browser print dialog and PDF output

## v0.2.0 — DANCHOO+ page-specific refinement

- [ ] Verify the middle-school exam detail page DOM
- [ ] Verify the high-school exam detail page DOM
- [ ] Optional header with subject, grade, and date
- [ ] Question-level page breaks that keep shared passages with their questions
- [ ] Regression cases for TeX/math, tables, diagrams, graphs, and images
- [ ] Better handling of long questions and embedded frames

## v0.3.0 — Layout presets

- [ ] Spacing presets between questions
- [ ] Optional removal of selected non-question UI inside the print area
- [ ] Separate answer/explanation output when those sections are already displayed
- [ ] Save and restore named print presets

## Quality principles

- Do not alter EBS source data or make private API requests.
- Only print content that the user explicitly selects.
- Preserve the original reading order of passages and linked questions.
- Do not claim compatibility with an EBS page until tested against its actual DOM.
