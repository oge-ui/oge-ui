# @oge-ui/behavior

The framework-free **interaction and accessibility layer** behind the
[OGE](https://www.npmjs.com/package/@oge-ui/grid) UI suite. Plain TypeScript,
shipped as ESM, with zero dependency on Angular, React or any other framework —
the sibling of [`@oge-ui/core`](https://www.npmjs.com/package/@oge-ui/core),
which owns the _data_ engine while this package owns _behaviour_.

Where `@oge-ui/core` answers "what rows are visible", this package answers
"where does the panel go, who has focus, and which surface does Escape close".

## What's inside

**Popup positioning.** `resolvePopupPosition` takes an anchor rectangle, a panel
size, a viewport and a logical `OgePopupPlacement` (`'bottom-start'`, a bare
`'top'` for edge-centred tooltips, …) and returns viewport-relative coordinates
for `position: fixed`, flipping to the opposite side and clamping to the
viewport when the preferred placement does not fit. It is RTL-aware and takes no
DOM: measure however you like, then ask it where to put things.

**Focus trapping.** `getTabbableElements` computes visible, enabled, tabbable
descendants in DOM order, and `trapTabKey` wraps Tab / Shift+Tab across that set.
Tabbables are recomputed at key-press time rather than fenced by sentinel
elements, so content added or removed while a dialog is open never leaves the
trap stale.

**The shared overlay stack.** `pushOverlay` / `removeOverlay` / `isTopOverlay`
order every open surface — anchored panels, modals, drawers — bottom to top, so
Escape only ever acts on the topmost one. There is deliberately exactly _one_
stack: two competing stacks would each believe they hold the top surface, and
Escape inside a popup opened within a drawer would close the drawer instead.

**Body scroll locking.** `lockBodyScroll` / `unlockBodyScroll` are ref-counted
for stacked modals, compensate the vanishing scrollbar width in a single
measure-then-write pass, and restore the previously inlined styles verbatim.

## Installation

You rarely install this directly — the OGE component packages depend on it.

```sh
npm install @oge-ui/behavior
```

## Licence

MIT. See [LICENSE](LICENSE).
