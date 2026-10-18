import { createRef } from 'react';
import { act, render } from '@testing-library/react';
import { OgeForm } from './form';
import type { OgeFormHandle, OgeFormItemDefinition } from './form-types';

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
        ? Array.from(grid.children).indexOf(this) * 40
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

interface Account extends Record<string, unknown> {
  kind: string;
  vat: string;
  email: string;
}

const items: OgeFormItemDefinition[] = [
  { field: 'kind', label: 'Kind' },
  {
    field: 'vat',
    label: 'VAT number',
    visibleWhen: { field: 'kind', equals: 'company' },
  },
  { field: 'email', label: 'Email' },
];

describe('<OgeForm> visibleWhen motion', () => {
  let stub: ReturnType<typeof stubMotion> | undefined;
  afterEach(() => {
    stub?.restore();
    stub = undefined;
  });

  it('fades the shown field in and glides the field below', () => {
    stub = stubMotion();
    const ref = createRef<OgeFormHandle<Account>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={{ kind: 'person', vat: '', email: '' }}
        items={items}
      />,
    );
    expect(stub.calls).toHaveLength(0);
    act(() => ref.current?.updateData('kind', 'company'));
    const moved = stub.calls.map((call) => ({
      text: ['VAT number', 'Email'].find((label) =>
        call.el.textContent?.includes(label),
      ),
      first: call.keyframes[0],
    }));
    expect(moved).toEqual([
      {
        text: 'VAT number',
        first: { opacity: 0, transform: 'scale(0.96)' },
      },
      { text: 'Email', first: { transform: 'translate(0px, -40px)' } },
    ]);
  });

  it('leaves typing alone (the visible fields did not change)', () => {
    stub = stubMotion();
    const ref = createRef<OgeFormHandle<Account>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={{ kind: 'person', vat: '', email: '' }}
        items={items}
      />,
    );
    act(() => ref.current?.updateData('email', 'a@b.c'));
    expect(stub.calls).toHaveLength(0);
  });
});
