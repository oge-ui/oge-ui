import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeForm } from './form';
import type { OgeFormItemData } from './form-types';

/** Rows stacked by index among their grid's items; `animate` recorded. */
function stubMotion() {
  const calls: { el: Element; keyframes: Keyframe[] }[] = [];
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const animate = proto.animate;
  const rect = Element.prototype.getBoundingClientRect;
  proto.animate = function (this: Element, keyframes: Keyframe[]) {
    calls.push({ el: this, keyframes });
    return {
      finished: new Promise<void>(() => undefined),
      cancel: () => undefined,
      finish: () => undefined,
    };
  };
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const grid = this.parentElement;
    const top =
      grid && this.hasAttribute('data-oge-form-item')
        ? Array.from(grid.children)
            .filter((child) => child.hasAttribute('data-oge-form-item'))
            .indexOf(this) * 40
        : 0;
    return {
      left: 0,
      top,
      width: 300,
      height: 36,
      right: 300,
      bottom: top + 36,
      x: 0,
      y: top,
      toJSON: () => ({}),
    } as DOMRect;
  };
  return {
    calls,
    restore() {
      if (animate === undefined) delete proto.animate;
      else proto.animate = animate;
      Element.prototype.getBoundingClientRect = rect;
    },
  };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 2; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  fixture.detectChanges();
}

@Component({
  imports: [OgeForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<oge-form [(formData)]="data" [items]="items" />`,
})
class Host {
  readonly data = signal<Record<string, unknown>>({
    kind: 'person',
    vat: '',
    email: '',
  });
  readonly items: readonly OgeFormItemData[] = [
    { field: 'kind', label: 'Kind' },
    {
      field: 'vat',
      label: 'VAT number',
      visibleWhen: { field: 'kind', equals: 'company' },
    },
    { field: 'email', label: 'Email' },
  ];
}

const labelOf = (el: Element) =>
  ['VAT number', 'Email', 'Kind'].find((label) =>
    el.textContent?.includes(label),
  );

describe('OgeForm visibleWhen motion', () => {
  let stub: ReturnType<typeof stubMotion> | undefined;
  afterEach(() => {
    stub?.restore();
    stub = undefined;
  });

  it('keys every rendered item for the layout animator', async () => {
    const f = TestBed.createComponent(Host);
    await settle(f);
    const keyed = f.nativeElement.querySelectorAll('[data-oge-form-item]');
    expect(Array.from(keyed, labelOf)).toEqual(['Kind', 'Email']);
  });

  it('fades the shown field in and glides the field below', async () => {
    stub = stubMotion();
    const f = TestBed.createComponent(Host);
    await settle(f);
    expect(stub.calls).toHaveLength(0);
    f.componentInstance.data.update((data) => ({ ...data, kind: 'company' }));
    await settle(f);
    const moved = stub.calls.map((call) => ({
      text: labelOf(call.el),
      first: call.keyframes[0],
    }));
    expect(moved).toEqual([
      { text: 'VAT number', first: { opacity: 0, transform: 'scale(0.96)' } },
      { text: 'Email', first: { transform: 'translate(0px, -40px)' } },
    ]);
  });

  it('leaves typing alone (the visible fields did not change)', async () => {
    stub = stubMotion();
    const f = TestBed.createComponent(Host);
    await settle(f);
    f.componentInstance.data.update((data) => ({ ...data, email: 'a@b.c' }));
    await settle(f);
    expect(stub.calls).toHaveLength(0);
  });
});
