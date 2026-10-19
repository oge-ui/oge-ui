import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeSplitter } from './splitter';
import { OgeSplitterPane } from './splitter-pane';

interface AnimateCall {
  el: Element;
  keyframes: Keyframe[];
}

/**
 * Motion on: a Web Animations stub, plus resolved pixel tracks for the
 * splitter host (jsdom lays nothing out, so its computed template would be
 * the authored `fr` one) — 300px for an open side pane, 0 when collapsed.
 */
function stubMotion(): { calls: AnimateCall[]; restore(): void } {
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const animate = proto.animate;
  const computed = window.getComputedStyle;
  const calls: AnimateCall[] = [];
  proto.animate = function (this: Element, keyframes: Keyframe[]) {
    calls.push({ el: this, keyframes });
    return { finished: new Promise(() => undefined), cancel: () => undefined };
  };
  window.getComputedStyle = ((el: Element, pseudo?: string | null) => {
    const style = computed(el, pseudo);
    if (!el.classList?.contains('oge-splitter')) return style;
    return new Proxy(style, {
      get(target, key) {
        if (key === 'getPropertyValue') {
          return (name: string) => {
            if (name !== 'grid-template-columns')
              return target.getPropertyValue(name);
            const collapsed = !!el.querySelector(
              '.oge-splitter-pane-collapsed',
            );
            return collapsed ? '0px 6px 700px' : '300px 6px 400px';
          };
        }
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }) as typeof window.getComputedStyle;
  return {
    calls,
    restore() {
      if (animate === undefined) delete proto.animate;
      else proto.animate = animate;
      window.getComputedStyle = computed;
    },
  };
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeSplitter, OgeSplitterPane],
  template: `
    <oge-splitter>
      <oge-splitter-pane
        key="side"
        [size]="30"
        [collapsible]="true"
        [(collapsed)]="side"
      >
        side
      </oge-splitter-pane>
      <oge-splitter-pane key="main" [size]="70">main</oge-splitter-pane>
    </oge-splitter>
  `,
})
class Host {
  readonly splitter = viewChild.required(OgeSplitter);
  readonly side = signal(false);
}

describe('OgeSplitter collapse motion', () => {
  let fixture: ComponentFixture<Host>;
  let motion: ReturnType<typeof stubMotion>;

  beforeEach(async () => {
    motion = stubMotion();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => motion.restore());

  const trackCalls = () =>
    motion.calls.filter((call) => 'gridTemplateColumns' in call.keyframes[0]);

  it('animates nothing on the first render', () => {
    expect(trackCalls()).toHaveLength(0);
  });

  it('a collapse and an expand glide the tracks between the resolved sizes', async () => {
    fixture.componentInstance.splitter().collapse('side');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(trackCalls().map((call) => call.keyframes)).toEqual([
      [
        { gridTemplateColumns: '300px 6px 400px' },
        { gridTemplateColumns: '0px 6px 700px' },
      ],
    ]);
    const host = fixture.nativeElement.querySelector('oge-splitter');
    expect(host.hasAttribute('data-oge-animating')).toBe(true);
    fixture.componentInstance.splitter().expand('side');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(trackCalls()).toHaveLength(2);
    expect(trackCalls()[1].keyframes[1]).toEqual({
      gridTemplateColumns: '300px 6px 400px',
    });
  });

  it('a vetoed or no-op toggle animates nothing', async () => {
    fixture.componentInstance.splitter().expand('side');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(trackCalls()).toHaveLength(0);
  });
});
