# Roadmap

## v0.1.0 — Initial prototype

- [x] Manual print-area selection
- [x] Independent browser print stylesheet
- [x] Paper, orientation, columns, font size, line height, and margin controls

## v0.2.0 — EBS native print integration

- [x] Target the middle/high-school `solvePaper.ebs` route
- [x] Preserve EBS's native preview and print workflow
- [x] Heuristic question-block detection
- [x] Keep question blocks, headings, figures, and tables together where possible
- [x] Same-origin iframe scan and dynamic preview rescan
- [ ] Verify question-block detection against the live EBS DOM
- [ ] Verify preview and final print/PDF output on EBS

## v0.3.0 — Layout refinement

- [ ] Tune question detection using real DOM samples from multiple subjects and grades
- [ ] Keep shared passages and their dependent questions together
- [ ] Improve handling of question blocks that exceed one page
- [ ] Add adjustable question spacing without overriding EBS printer settings
- [ ] Detect whether EBS preview is HTML, a same-origin frame, or a generated PDF and select the correct integration point

## Quality principles

- Preserve EBS's original question data, illustrations, and answer content.
- Preserve the user's EBS-selected printer, paper, page range, copies, orientation, and color settings.
- Do not make private API requests or scrape/download question banks.
- Only apply print-layout CSS to content already displayed by EBS.
- Do not claim compatibility until verified against the live page and final printed output.
