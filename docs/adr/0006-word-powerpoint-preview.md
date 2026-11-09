# ADR 0006 — Word and PowerPoint preview in the spreadsheet family

- **Status:** Accepted — packaging and fidelity by the product owner, architecture and phase order by the maintainers, 2026-11-09
- **Date:** 2026-11-09
- **Decided by:** product owner (packaging, fidelity target), maintainers
  (architecture, phase order)
- **Related:** ADR 0001 (multi-framework), ADR 0003 (commercial engine
  packages), ADR 0004 (license keys), ADR 0005 (spreadsheet)

## Context

`@oge-ui/spreadsheet` opens xlsx files in the browser with no runtime
dependency and measures its rendering against Excel. Applications that preview
workbooks also need to preview the other two Office formats. Nothing in the
suite reads docx or pptx today.

Both formats are OOXML packages, so a large part of the xlsx reader applies
unchanged: `lib/zip`, `lib/xml`, `codec/package.ts`, `codec/read-theme.ts`,
`lib/color` and the font metrics in `@oge-ui/spreadsheet-engine`. What does not
carry over is layout. A slide is absolutely positioned; a Word document is a
flow that Word breaks into lines and pages by rules it does not publish.

## Product decisions

1. **Same packages.** Preview ships in the existing spreadsheet family, under
   its license check and the Pro bundle, rather than as a new family.
2. **Office-identical from the start.** As with Excel in ADR 0005, a visual rule
   lands with a measurement from real Office, not from reading the specification.

## Decisions

1. **Separate entry points inside the same packages.** Decision 1 must not make
   Excel-only applications download two more renderers: `@oge-ui/spreadsheet/word`,
   `@oge-ui/spreadsheet/powerpoint`, the same subpaths on
   `@oge-ui/react-spreadsheet` and `@oge-ui/spreadsheet-engine`. Each gets its own
   size budget. The engine package exports only `.` today, so its build changes
   in P0.
2. **The engine decides, the layers bind.** The ADR 0005 rule holds: parsing,
   layout and the viewer core are framework-free and DOM-free, and the Angular
   and React layers bind identical markup.
3. **Read-only OOXML.** docx and pptx only. Legacy `.doc` / `.ppt` are refused
   with an import issue, and editing is out of scope.
4. **Unsupported content is reported.** Anything not drawn yields an import
   issue, as the xlsx reader does, never a silent gap.
5. **Untrusted files stay inert.** Macros and embedded OLE objects never run,
   external relationships are never fetched, and links pass through
   `sanitizeUrl`. Text is bound as text; no markup is built from file content.
6. **Golden corpus from Office.** Word and PowerPoint are driven read-only over
   COM on a Windows machine. Only the numbers they yield are committed.

## Phases

| Phase | Scope                                                                                                                                               |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0    | Shared OPC layer for all three formats, entry points and budgets, corpus tooling for Word and PowerPoint, docs pipeline                             |
| P1    | PowerPoint: master and layout inheritance, theme, text bodies and autofit, preset shapes, pictures, tables, charts, slide navigation, accessibility |
| P2    | Word content: style cascade, paragraphs and runs, numbering, tables, pictures, headers and footers, sections                                        |
| P3    | Word pagination: line breaking, widow and keep rules, floating objects, footnotes, measured against Word                                            |

PowerPoint comes first: it has no pagination problem, so it proves the shared
layer and the corpus tooling while delivering a complete format.

## Outcome

All four phases are built. The corpus deck and document are created and
measured by PowerPoint and Word themselves: every line break and page break of
the corpus document matches Word, and the slides differ from PowerPoint's own
pictures only in glyph rasterization. What a file uses and the viewer does not
draw is reported through `issues`.

## Consequences

- **Fonts cap the fidelity.** Line and page breaks depend on the font. Microsoft
  fonts cannot be redistributed, so a document matches Office exactly only where
  its fonts are available to the browser. Without them the viewer substitutes
  metric-compatible fonts and reports it; breaks can then differ.
- Word pagination is the largest risk in the plan, because its rules can only be
  recovered by measurement. P3 may stop short of some layouts, and those must
  surface as import issues.
- The spreadsheet family's public description and the Pro bundle's contents
  change, while the price stays as it is unless the owner revisits it.
- `lib/zip` and `lib/xml` stay private to the family. ADR 0005's product decision
  3 may still move the ZIP layer into MIT code later.
