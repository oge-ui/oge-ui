import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeButton } from '@oge-ui/react-buttons';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INTERACTION_DEMOS } from './react-buttons-snippets';

/** TOC of the React view — the same four sections as the Angular page. */
export const REACT_INTERACTIONS_SECTIONS = [
  'Async actions & loading',
  'Click guard',
  'Hold to confirm',
  'Auto-repeat',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row' }, ...children);

// The live previews are real React function components: the counters are
// React state, exactly as the shown source code manages them.

function AsyncActionsPreview() {
  const [saved, setSaved] = useState(0);
  const [failed, setFailed] = useState(0);
  return row(
    createElement(OgeButton, {
      key: 's',
      text: 'Save changes',
      severity: 'accent',
      action: () => new Promise((resolve) => setTimeout(resolve, 1500)),
      onActionDone: () => setSaved((n) => n + 1),
    }),
    createElement(OgeButton, {
      key: 'f',
      text: 'Fails after 1s',
      severity: 'danger',
      stylingMode: 'outlined',
      action: () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('nope')), 1000),
        ),
      onActionFailed: () => setFailed((n) => n + 1),
    }),
    createElement(
      'span',
      { key: 'o', className: 'text-sm opacity-70' },
      `saved ×${saved} · failed ×${failed} — spam the buttons: while pending, extra clicks are ignored.`,
    ),
  );
}

function ClickGuardPreview() {
  const [throttled, setThrottled] = useState(0);
  const [debounced, setDebounced] = useState(0);
  return row(
    createElement(OgeButton, {
      key: 't',
      text: 'Throttled',
      clickGuard: true,
      onClick: () => setThrottled((n) => n + 1),
    }),
    createElement(OgeButton, {
      key: 'd',
      text: 'Debounced 400ms',
      stylingMode: 'outlined',
      clickGuard: { mode: 'debounce', ms: 400 },
      onClick: () => setDebounced((n) => n + 1),
    }),
    createElement(
      'span',
      { key: 'o', className: 'text-sm opacity-70' },
      `throttled ×${throttled} · debounced ×${debounced}`,
    ),
  );
}

function HoldToConfirmPreview() {
  const [deletions, setDeletions] = useState(0);
  return row(
    createElement(OgeButton, {
      key: 'h',
      text: 'Delete account',
      severity: 'danger',
      holdToConfirm: { ms: 1200 },
      onClick: () => setDeletions((n) => n + 1),
    }),
    createElement(
      'span',
      { key: 'o', className: 'text-sm opacity-70' },
      `confirmed ×${deletions} — quick taps do nothing; hold until the bar fills, then release.`,
    ),
  );
}

function AutoRepeatPreview() {
  const [value, setValue] = useState(0);
  return row(
    createElement(OgeButton, {
      key: 'minus',
      text: '−',
      hint: 'Decrement',
      size: 'sm',
      autoRepeat: { delayMs: 400, intervalMs: 80 },
      onClick: () => setValue((n) => n - 1),
    }),
    createElement(
      'output',
      { key: 'v', className: 'min-w-12 text-center font-mono text-lg' },
      value,
    ),
    createElement(OgeButton, {
      key: 'plus',
      text: '+',
      hint: 'Increment',
      size: 'sm',
      autoRepeat: { delayMs: 400, intervalMs: 80 },
      onClick: () => setValue((n) => n + 1),
    }),
    createElement(
      'span',
      { key: 'o', className: 'text-sm opacity-70' },
      'hold either button down',
    ),
  );
}

/**
 * The React half of the interactions page — the same four demo sections as
 * the Angular page, same example content, real React state in the previews.
 */
@Component({
  selector: 'app-react-button-interactions',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/buttons/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['action → auto loading', 'single-flight', 'onActionDone']"
      heading="Async actions &amp; loading"
      description="Bind a promise-returning function to <code>action</code> and the button manages the async lifecycle for you: it flips <code>loading</code> on, disables itself, silently ignores further clicks until the promise settles (single-flight), then calls <code>onActionDone</code> with the resolved value or <code>onActionFailed</code> with the error. No flags to manage in your component."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="asyncActions" />
    </app-demo-card>

    <app-demo-card
      [chips]="['clickGuard: true = throttle 500ms', 'debounce trailing']"
      heading="Click guard"
      description="Rate-limits <code>onClick</code> against double submissions and spam. <code>true</code> is a ready-made 500ms throttle (first click wins, the window swallows the rest); <code>{ mode: 'debounce', ms }</code> waits for the clicks to stop and fires once. The guard also applies to hold completions and auto-repeat ticks."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="clickGuard" />
    </app-demo-card>

    <app-demo-card
      [chips]="['holdToConfirm', 'Escape cancels', 'keyboard: hold Space']"
      heading="Hold to confirm"
      description="Arms destructive actions behind an uninterrupted press: a fill sweeps across the button while held and brightens when the duration elapses — releasing then fires <code>onClick</code>. Quick taps do nothing. Escape, dragging away or pointer-cancel aborts; keyboard users hold Space or Enter. The fill is pure CSS (transform-only), so it costs no script time."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="holdToConfirm" />
    </app-demo-card>

    <app-demo-card
      [chips]="['autoRepeat', 'delay + interval', 'spinner pattern']"
      heading="Auto-repeat"
      description="For spinner and counter buttons: holding the button re-fires <code>onClick</code> — once immediately, then repeatedly after <code>delayMs</code> at <code>intervalMs</code>. Repeating stops on release, on pointer-cancel, or the moment the button becomes disabled. Mutually exclusive with <code>holdToConfirm</code> (hold wins)."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="autoRepeat" />
    </app-demo-card>
  `,
})
export class ReactButtonInteractionsDemos {
  protected readonly demos = INTERACTION_DEMOS;

  protected readonly asyncActions = () => createElement(AsyncActionsPreview);
  protected readonly clickGuard = () => createElement(ClickGuardPreview);
  protected readonly holdToConfirm = () => createElement(HoldToConfirmPreview);
  protected readonly autoRepeat = () => createElement(AutoRepeatPreview);
}
