# ADR 0002 — A framework-aware documentation system

- **Status:** Accepted
- **Date:** 2026-08-12
- **Builds on:** [ADR 0001](0001-multi-framework-strategy.md)

## Context

ADR 0001 decided the suite ships native render layers per framework over a
shared substrate, and that the docs stay **one site** with a global framework
switch rather than splitting into per-framework sites. The switch, the ambient
identity and the Buttons page now work that way.

The rest of the site does not. Getting Started tells everyone to
`npm i @oge-ui/grid` and shows an `@Component` with an `imports` array; the AI
page describes `llms.txt` as if there were one flavour of it; the components
gallery gives no hint which families exist in which layer. A reader who picked
React gets Angular instructions everywhere except one page — which is worse
than no React docs at all, because it looks authoritative.

This ADR records how a page participates in the framework system, and the order
the remaining pages are converted.

## Decisions

**1. Coverage has one source of truth.** `FrameworkService.COVERAGE` lists which
families exist in which layer. The switch, the "not in this layer yet" notice
and (from Faz 4) the parity gate all read it. A new React package is one line
there — never a second list in a page.

**2. Pages do not own a switch.** There is exactly one control, in the header.
A page reads `FrameworkService.isReact()` (or `framework()`) and renders
accordingly. Two controls would raise the question of which one wins.

**3. The family comes from the route, not from a page input.** `/components/x/…`
→ `x`. That is what lets the shell warn about an unsupported page without every
page declaring anything.

**4. Framework-varying code lives in the snippet modules, keyed by framework.**
A `*-snippets.ts` exports `{ angular: '…', react: '…' }` for anything that
differs, and a plain string for anything that does not. The compile gate already
tells the two apart by shape (`'use client'`), so both halves stay checked. A
page never inlines a code sample — that rule is unchanged and enforced.

**5. Prose that differs is branched in the template, not duplicated per page.**
`@if (fw.isReact())` around the paragraph that differs, never a second page
component. The heading, the TOC and the route stay single, which is what keeps
the sitemap and the SEO descriptions single.

**6. What must NOT become framework-aware.** The design tokens, the theme
stylesheets and the localization _message_ tables are shared by construction —
saying so on those pages is the point, and branching them would imply a
difference that does not exist.

## Work plan

Ordered by harm-if-wrong, not by effort. Each item is done when: the page reads
correctly in both layers, its snippets compile in the gate, `docs-tools:llms`
regenerates clean, and the full gate set is green.

| #   | Page                                       | What changes                                                                                                                                                                                                                                | Status  |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 0   | Shell, switch, ambient identity, Buttons   | Header switch, `data-framework` stamp, the framework mark beside the OGE brand atop the sidebar with its colour glowing into the column, unsupported-page notice (page-granular `COVERAGE`), Buttons demos + API + TOC/notes in both layers | ✅ done |
| 1   | `getting-started/setup`                    | Install command, first import, `styles.css` import, `'use client'`, peer deps. **Highest harm:** a wrong install line blocks a reader entirely.                                                                                             | ✅ done |
| 2   | `getting-started` (Introduction)           | Framing: one engine, two render layers. Package table gains the React column.                                                                                                                                                               | ✅ done |
| 3   | `ai/overview`                              | Which `llms.txt` is which. The React file carries React rules — say so, and link it.                                                                                                                                                        | ✅ done |
| 4   | `components` (gallery)                     | Per-card badge showing the layers a family ships in, driven by `COVERAGE`.                                                                                                                                                                  | ✅ done |
| 5   | `getting-started/styling`                  | Mostly a _no-branch_ page: state plainly that the tokens and themes are shared, with one note on where the stylesheet import differs.                                                                                                       | ✅ done |
| 6   | `getting-started/localization`             | Message tables are shared; only the provider syntax differs (`provideOgeButtonsConfig()` ↔ `<OgeButtonsConfigProvider>`).                                                                                                                   | ✅ done |
| 7   | `home`                                     | Hero carries the switch; the component tiles now carry per-family layer marks.                                                                                                                                                              | ✅ done |
| 8   | Component families without a React package | Nothing per page — the shell notice covers them. Revisit as each React package lands.                                                                                                                                                       | n/a     |

## Consequences

- Every page conversion is small, but there are eight of them; they are listed
  so none is silently skipped.
- The `llms.txt` generator already branches on `platform`, so converting a page
  does not change the machine-readable docs — those follow the packages, not
  the pages.
- Item 8 is the honest admission that most of the suite is Angular-only today.
  The shell notice makes that visible without a per-page apology, and it
  disappears family by family as ADR 0001's Faz 5 proceeds.
