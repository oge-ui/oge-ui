import { demoSource } from '../../shared/demo-source';

export const ACTION_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  template: `<oge-button
  text="Save changes"
  severity="accent"
  [action]="save"
  (actionDone)="log('saved!')"
  (actionFailed)="log('failed')"
/>`,
  body: `protected readonly save = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 1500));

protected log(message: string): void {
  console.log(message);
}`,
});

export const GUARD_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  template: `<!-- true = throttle with the 500ms config default -->
<oge-button text="Submit once" [clickGuard]="true" (clicked)="count()" />

<!-- trailing debounce -->
<oge-button
  text="Debounced"
  [clickGuard]="{ mode: 'debounce', ms: 400 }"
  (clicked)="count()"
/>`,
  body: `protected readonly clicks = signal(0);

protected count(): void {
  this.clicks.update((value) => value + 1);
}`,
});

export const HOLD_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  template: `<oge-button
  text="Delete account"
  severity="danger"
  [holdToConfirm]="{ ms: 1200 }"
  (clicked)="destroyEverything()"
/>`,
  body: `protected destroyEverything(): void {
  console.warn('boom');
}`,
});

export const REPEAT_SNIPPET = demoSource({
  use: { '@oge-ui/buttons': ['OgeButton'] },
  template: `<oge-button
  text="+"
  hint="Increment"
  [autoRepeat]="{ delayMs: 400, intervalMs: 80 }"
  (clicked)="value = value + 1"
/>`,
  body: `protected value = 0;`,
});
