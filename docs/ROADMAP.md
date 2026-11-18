# Roadmap

## v0.1.0 — Initial prototype
- [x] Manual print-area selection
- [x] Independent browser print stylesheet

## v0.2.0 — EBS native print integration
- [x] Target `solvePaper.ebs`
- [x] Preserve EBS native print workflow
- [x] Same-origin iframe scan
- [ ] Verify live EBS print DOM and output

## v0.3.0 — Question grouping and visual refinement
- [x] Avoid counting every nested numbered ancestor as a separate question
- [x] Group sibling stem/figure/choice fragments in safe flow containers
- [x] Add restrained red-accent workbook styling
- [x] Add split-fragment regression fixture
- [ ] Verify grouping against live EBS DOM across subjects and grades
- [ ] Verify question 3 stem/options remain together in the final PDF
- [ ] Tune shared passages and oversized questions

## Quality principles
- Preserve original question text, formulas, illustrations, and answers.
- Preserve EBS-selected printer, paper, page range, copies, orientation, and color settings.
- Do not call private APIs or download question banks.
- Never claim compatibility until verified against the live page and final printed output.