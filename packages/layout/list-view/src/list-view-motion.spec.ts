import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeListView } from './list-view';

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

const PEOPLE = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
  { id: 3, name: 'Alan' },
];

@Component({
  imports: [OgeListView],
  template: `
    <oge-list-view
      [items]="people"
      keyExpr="id"
      displayExpr="name"
      [searchEnabled]="true"
      [(searchValue)]="query"
      [virtualScroll]="virtual()"
      [height]="200"
      ariaLabel="People"
    />
  `,
})
class Host {
  readonly people = PEOPLE;
  readonly query = signal('');
  readonly virtual = signal(false);
}

describe('OgeListView layout motion', () => {
  let fixture: ComponentFixture<Host>;
  let stub: ReturnType<typeof stubAnimate>;

  beforeEach(() => {
    stub = stubAnimate();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });
  afterEach(() => stub.restore());

  const rows = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('[data-oge-list-key]'));

  it('keys the rows and animates nothing on the first render', () => {
    expect(rows().map((row) => row.getAttribute('data-oge-list-key'))).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(stub.calls).toHaveLength(0);
  });

  it('rows coming back after a filter fade in', () => {
    fixture.componentInstance.query.set('Grace');
    fixture.detectChanges();
    expect(rows()).toHaveLength(1);
    fixture.componentInstance.query.set('');
    fixture.detectChanges();
    const entered = stub.calls
      .filter((call) => call.keyframes[0].opacity === 0)
      .map((call) => call.el.getAttribute('data-oge-list-key'));
    expect(entered).toEqual(['1', '3']);
  });

  it('virtualized rows are never keyed for motion', () => {
    fixture.componentInstance.virtual.set(true);
    fixture.detectChanges();
    expect(rows()).toHaveLength(0);
    fixture.componentInstance.query.set('A');
    fixture.detectChanges();
    expect(stub.calls).toHaveLength(0);
  });
});
