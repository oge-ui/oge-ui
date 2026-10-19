import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeChipList } from './chip-list';
import type { OgeChipItem, OgeChipKey } from './chip-types';

/** jsdom has no Web Animations API (motion off) — a stub turns it on. */
function stubMotion(): { calls: Element[]; restore(): void } {
  const proto = HTMLElement.prototype as unknown as {
    animate?: unknown;
    getBoundingClientRect: () => DOMRect;
  };
  const animate = proto.animate;
  const rect = proto.getBoundingClientRect;
  const calls: Element[] = [];
  proto.animate = function (this: Element) {
    calls.push(this);
    return { finished: new Promise(() => undefined), cancel: () => undefined };
  };
  // every box is visible (jsdom lays nothing out), so a leaving chip has one
  proto.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 60,
      height: 24,
      right: 60,
      bottom: 24,
    }) as DOMRect;
  return {
    calls,
    restore() {
      if (animate === undefined) delete proto.animate;
      else proto.animate = animate;
      proto.getBoundingClientRect = rect;
    },
  };
}

@Component({
  imports: [OgeChipList],
  template: `
    <div class="wrap">
      <oge-chip-list
        [items]="items()"
        [removable]="true"
        ariaLabel="Tags"
        (itemRemoved)="drop($event.item.key)"
      />
    </div>
  `,
})
class Host {
  readonly items = signal<OgeChipItem[]>([
    { key: 'a', label: 'Alpha' },
    { key: 'b', label: 'Beta' },
    { key: 'c', label: 'Gamma' },
  ]);
  drop(key: OgeChipKey): void {
    this.items.update((items) => items.filter((item) => item.key !== key));
  }
}

describe('OgeChipList motion', () => {
  let fixture: ComponentFixture<Host>;
  let motion: ReturnType<typeof stubMotion>;

  beforeEach(async () => {
    motion = stubMotion();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => {
    motion.restore();
    document.querySelectorAll('.oge-exit-ghost').forEach((el) => el.remove());
  });

  it('keys every chip and animates nothing on the first render', () => {
    const keys = Array.from(
      fixture.nativeElement.querySelectorAll('[data-oge-chip-key]'),
      (el: Element) => el.getAttribute('data-oge-chip-key'),
    );
    expect(keys).toEqual(['a', 'b', 'c']);
    expect(motion.calls).toHaveLength(0);
  });

  it('a removed chip leaves through an exit ghost beside the list; the node goes at once', async () => {
    const remove = fixture.nativeElement.querySelector(
      'button.oge-chip-remove',
    ) as HTMLButtonElement;
    remove.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const list = fixture.nativeElement.querySelector(
      'oge-chip-list',
    ) as HTMLElement;
    expect(list.querySelectorAll('[data-oge-chip-key]')).toHaveLength(2);
    const ghost = fixture.nativeElement.querySelector(
      '.wrap > .oge-exit-ghost',
    ) as HTMLElement | null;
    expect(ghost?.getAttribute('aria-hidden')).toBe('true');
    expect(ghost?.textContent).toContain('Alpha');
    expect(list.querySelector('.oge-exit-ghost')).toBeNull();
    // chips enter through their own CSS keyframe: only the ghost animated
    expect(motion.calls).toEqual([ghost]);
  });
});
