import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeButton } from '@oge-ui/buttons';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_INTERACTIONS_SECTIONS,
  ReactButtonInteractionsDemos,
} from '../react-buttons/interactions';
import {
  ACTION_SNIPPET,
  GUARD_SNIPPET,
  HOLD_SNIPPET,
  REPEAT_SNIPPET,
} from './interactions-snippets';

const SECTIONS = [
  'Async actions & loading',
  'Click guard',
  'Hold to confirm',
  'Auto-repeat',
] as const;

@Component({
  selector: 'app-buttons-interactions',
  imports: [
    OgeButton,
    DemoCard,
    DocHeader,
    PageToc,
    ReactButtonInteractionsDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Button Interactions"
      [chips]="[
        'action',
        'loading',
        'clickGuard',
        'holdToConfirm',
        'autoRepeat',
      ]"
    >
      <p>
        Four interaction guards you would otherwise hand-roll on every project:
        promise-aware <code>action</code> with automatic loading and
        single-flight protection, <code>clickGuard</code> throttle/debounce,
        <code>holdToConfirm</code> for destructive actions and
        <code>autoRepeat</code> for spinner buttons. All of them funnel into
        @if (fw.isReact()) {
          <code>onClick</code> — the same press machine from
          <code>&#64;oge-ui/behavior</code>, so the timings match the Angular
          component exactly.
        } @else {
          the <code>(clicked)</code> output.
        }
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-button-interactions />

      <h3>Notes</h3>
      <ul>
        <li>
          <code>loading</code> is a controlled/uncontrolled pair — pass it with
          <code>onLoadingChange</code> to drive it yourself, or omit it and let
          <code>action</code> manage the flag. A loading button is disabled and
          exposes <code>aria-busy</code> plus a screen-reader label from the
          messages config (<code>&lt;OgeButtonsConfigProvider&gt;</code>).
        </li>
        <li>
          Guards compose: a hold completion or auto-repeat tick still passes
          through <code>clickGuard</code> before calling <code>onClick</code>.
        </li>
        <li>
          <code>holdToConfirm</code> and <code>autoRepeat</code> are mutually
          exclusive; hold wins and dev mode logs an error.
        </li>
        <li>
          In gesture modes native clicks are swallowed (and stopped from
          bubbling) so a quick tap can never trigger outer click listeners.
        </li>
      </ul>
    } @else {
      <app-demo-card
        [chips]="['[action] → auto loading', 'single-flight', '(actionDone)']"
        heading="Async actions & loading"
        description="Bind a promise-returning function to <code>action</code> and the button manages the async lifecycle for you: it flips <code>loading</code> on, disables itself, silently ignores further clicks until the promise settles (single-flight), then emits <code>actionDone</code> with the resolved value or <code>actionFailed</code> with the error. No flags to manage in your component."
        [code]="actionSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button
            text="Save changes"
            severity="accent"
            [action]="save"
            (actionDone)="saveCount.set(saveCount() + 1)"
          />
          <oge-button
            text="Fails after 1s"
            severity="danger"
            stylingMode="outlined"
            [action]="fail"
            (actionFailed)="failCount.set(failCount() + 1)"
          />
          <span class="text-sm opacity-70">
            saved ×{{ saveCount() }} · failed ×{{ failCount() }} — spam the
            buttons: while pending, extra clicks are ignored.
          </span>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['clickGuard: true = throttle 500ms', 'debounce trailing']"
        heading="Click guard"
        description="Rate-limits the <code>clicked</code> output against double submissions and spam. <code>true</code> is a ready-made 500ms throttle (first click wins, the window swallows the rest); <code>{ mode: 'debounce', ms }</code> waits for the clicks to stop and fires once. The guard also applies to hold completions and auto-repeat ticks."
        [code]="guardSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button
            text="Throttled"
            [clickGuard]="true"
            (clicked)="throttled.set(throttled() + 1)"
          />
          <oge-button
            text="Debounced 400ms"
            stylingMode="outlined"
            [clickGuard]="{ mode: 'debounce', ms: 400 }"
            (clicked)="debounced.set(debounced() + 1)"
          />
          <span class="text-sm opacity-70">
            throttled ×{{ throttled() }} · debounced ×{{ debounced() }}
          </span>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['holdToConfirm', 'Escape cancels', 'keyboard: hold Space']"
        heading="Hold to confirm"
        description="Arms destructive actions behind an uninterrupted press: a fill sweeps across the button while held and brightens when the duration elapses — releasing then fires <code>clicked</code>. Quick taps do nothing. Escape, dragging away or pointer-cancel aborts; keyboard users hold Space or Enter. The fill is pure CSS (transform-only), so it costs no script time."
        [code]="holdSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button
            text="Delete account"
            severity="danger"
            [holdToConfirm]="{ ms: 1200 }"
            (clicked)="deletions.set(deletions() + 1)"
          />
          <span class="text-sm opacity-70">
            confirmed ×{{ deletions() }} — quick taps do nothing; hold until the
            bar fills, then release.
          </span>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['autoRepeat', 'delay + interval', 'spinner pattern']"
        heading="Auto-repeat"
        description="For spinner and counter buttons: holding the button re-fires <code>clicked</code> — once immediately, then repeatedly after <code>delayMs</code> at <code>intervalMs</code>. Repeating stops on release, on pointer-cancel, or the moment the button becomes disabled. Mutually exclusive with <code>holdToConfirm</code> (hold wins)."
        [code]="repeatSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-3">
          <oge-button
            text="−"
            hint="Decrement"
            size="sm"
            [autoRepeat]="{ delayMs: 400, intervalMs: 80 }"
            (clicked)="counter.set(counter() - 1)"
          />
          <span
            data-testid="repeat-value"
            class="min-w-12 text-center font-mono text-lg"
            >{{ counter() }}</span
          >
          <oge-button
            data-testid="repeat-plus"
            text="+"
            hint="Increment"
            size="sm"
            [autoRepeat]="{ delayMs: 400, intervalMs: 80 }"
            (clicked)="counter.set(counter() + 1)"
          />
          <span class="text-sm opacity-70">hold either button down</span>
        </div>
      </app-demo-card>

      <h3>Notes</h3>
      <ul>
        <li>
          <code>loading</code> is a two-way model — drive it manually or let
          <code>action</code> manage it. A loading button is disabled and
          exposes <code>aria-busy</code> plus a screen-reader label from the
          messages config (<code>provideOgeButtonsConfig</code>).
        </li>
        <li>
          Guards compose: a hold completion or auto-repeat tick still passes
          through <code>clickGuard</code> before emitting.
        </li>
        <li>
          <code>holdToConfirm</code> and <code>autoRepeat</code> are mutually
          exclusive; hold wins and dev mode logs an error.
        </li>
        <li>
          In gesture modes native clicks are swallowed (and stopped from
          bubbling) so a quick tap can never trigger outer
          <code>(click)</code> listeners.
        </li>
      </ul>
    }
  `,
})
export class ButtonsInteractionsPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INTERACTIONS_SECTIONS;
  protected readonly saveCount = signal(0);
  protected readonly failCount = signal(0);
  protected readonly throttled = signal(0);
  protected readonly debounced = signal(0);
  protected readonly deletions = signal(0);
  protected readonly counter = signal(0);

  protected readonly save = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, 1500));
  protected readonly fail = (): Promise<void> =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('nope')), 1000),
    );

  protected readonly actionSnippet = ACTION_SNIPPET;
  protected readonly guardSnippet = GUARD_SNIPPET;
  protected readonly holdSnippet = HOLD_SNIPPET;
  protected readonly repeatSnippet = REPEAT_SNIPPET;
}
