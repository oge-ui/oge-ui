import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  DestroyRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * Mounts a React tree inside the Angular docs site.
 *
 * The docs are **one site** — one homepage, one shell, one router — that
 * happens to document two render layers, so the React demos run right here
 * beside the Angular ones instead of behind a link to a second app (ADR 0001).
 * `apps/dev-app` is the only project allowed to import both, and the
 * `platform:docs` boundary rule says so.
 *
 * The demo is passed as a thunk returning a React node, and demo modules build
 * their trees with `createElement` rather than JSX — that keeps the Angular
 * build free of a JSX pipeline it would otherwise need only for the docs.
 *
 * ```html
 * <app-react-host [render]="() => createElement(OgeButton, { text: 'Save' })" />
 * ```
 */
@Component({
  selector: 'app-react-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-react-host' },
  template: '',
})
export class ReactHost {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private root: Root | null = null;

  /** Builds the React tree. Re-read on every render pass. */
  readonly render = input.required<() => ReactNode>();

  /** Set once the DOM node exists, so the render effect can start. */
  private readonly mounted = signal(false);

  constructor() {
    afterNextRender(() => {
      this.root = createRoot(this.host.nativeElement);
      this.mounted.set(true);
    });

    // Re-render whenever anything the thunk reads changes. The thunk is invoked
    // *inside* the effect on purpose: a demo that reads an Angular signal (a
    // counter, a selection) then re-renders its React tree on change, so both
    // halves of the page stay live under one change-detection story.
    effect(() => {
      if (!this.mounted()) return;
      const node = this.render()();
      this.root?.render(createElement(Bridge, { render: node }));
    });
    inject(DestroyRef).onDestroy(() => {
      // Unmount out of the current task: React warns when a root is torn down
      // synchronously from inside another render, which is exactly where
      // Angular's destroy hook runs during route changes.
      const root = this.root;
      this.root = null;
      if (root) queueMicrotask(() => root.unmount());
    });
  }
}

/** Trivial wrapper so the thunk becomes a component React can render. */
function Bridge({ render }: { render: ReactNode }): ReactNode {
  return render;
}
