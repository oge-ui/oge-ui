import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeDataView } from './data-view';
import { OgeDataViewItemTemplate } from './templates';

interface AnimateCall {
  el: Element;
  keyframes: Keyframe[];
}

/** jsdom has no Web Animations API (motion off) — a stub turns it on. */
function stubAnimate(): { calls: AnimateCall[]; restore(): void } {
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const original = proto.animate;
  const calls: AnimateCall[] = [];
  proto.animate = function (this: Element, keyframes: Keyframe[]) {
    calls.push({ el: this, keyframes });
    return { finished: new Promise(() => undefined), cancel: () => undefined };
  };
  return {
    calls,
    restore() {
      if (original === undefined) delete proto.animate;
      else proto.animate = original;
    },
  };
}

const PRODUCTS = [
  { id: 1, name: 'Desk' },
  { id: 2, name: 'Chair' },
  { id: 3, name: 'Lamp' },
  { id: 4, name: 'Shelf' },
];

@Component({
  imports: [OgeDataView, OgeDataViewItemTemplate],
  template: `
    <oge-data-view [items]="items" [pageSize]="2" [(pageIndex)]="page">
      <ng-template ogeDataViewItemTemplate let-item>{{
        item.name
      }}</ng-template>
    </oge-data-view>
  `,
})
class Host {
  readonly items = PRODUCTS;
  readonly page = signal(0);
}

describe('OgeDataView layout motion', () => {
  let fixture: ComponentFixture<Host>;
  let stub: ReturnType<typeof stubAnimate>;

  beforeEach(() => {
    stub = stubAnimate();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });
  afterEach(() => stub.restore());

  const keys = (): (string | null)[] =>
    Array.from(
      fixture.nativeElement.querySelectorAll('[data-oge-data-view-key]'),
      (el: Element) => el.getAttribute('data-oge-data-view-key'),
    );

  it('keys the items and animates nothing on the first render', () => {
    expect(keys()).toEqual(['1', '2']);
    expect(stub.calls).toHaveLength(0);
  });

  it("a page change fades the new page's items in", () => {
    fixture.componentInstance.page.set(1);
    fixture.detectChanges();
    expect(keys()).toEqual(['3', '4']);
    const entered = stub.calls
      .filter((call) => call.keyframes[0].opacity === 0)
      .map((call) => call.el.getAttribute('data-oge-data-view-key'));
    expect(entered).toEqual(['3', '4']);
  });
});
