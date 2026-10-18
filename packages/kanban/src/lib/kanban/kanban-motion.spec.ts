import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeKanban } from './kanban';

interface Task {
  id: number;
  status: string;
  title: string;
}

@Component({
  imports: [OgeKanban],
  template: `
    <oge-kanban
      [dataSource]="tasks()"
      [columns]="columns"
      [virtualScrolling]="false"
      keyExpr="id"
      columnExpr="status"
      titleExpr="title"
      style="height: 480px; display: block"
    />
  `,
})
class Host {
  readonly tasks = signal<Task[]>([
    { id: 1, status: 'todo', title: 'One' },
    { id: 2, status: 'todo', title: 'Two' },
    { id: 3, status: 'doing', title: 'Three' },
  ]);
  readonly columns = [{ key: 'todo' }, { key: 'doing' }, { key: 'done' }];
}

interface FakeAnimation {
  el: Element;
  keyframes: Keyframe[];
  finish(): void;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

const frames = () => new Promise((resolve) => setTimeout(resolve, 20));

function place(el: Element, left: number, top: number): void {
  (el as HTMLElement).getBoundingClientRect = () =>
    ({
      left,
      top,
      width: 200,
      height: 80,
      right: left + 200,
      bottom: top + 80,
      x: left,
      y: top,
    }) as DOMRect;
}

function pointer(type: string, init: MouseEventInit): PointerEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  }) as unknown as PointerEvent;
}

/**
 * Layout motion wiring with a Web Animations stub (jsdom has none — there
 * the board never animates): the drop settle and the FLIP of a move.
 */
describe('<oge-kanban> layout motion', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;
  let calls: FakeAnimation[];
  let original: unknown;

  beforeEach(async () => {
    calls = [];
    const proto = HTMLElement.prototype as unknown as { animate?: unknown };
    original = proto.animate;
    proto.animate = function (this: Element, keyframes: Keyframe[]) {
      let finish!: () => void;
      const finished = new Promise<void>((resolve) => (finish = resolve));
      calls.push({ el: this, keyframes, finish });
      return { finished, cancel: () => undefined };
    };
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    const proto = HTMLElement.prototype as unknown as { animate?: unknown };
    if (original === undefined) delete proto.animate;
    else proto.animate = original;
    vi.unstubAllGlobals();
  });

  const card = (key: number) =>
    host.querySelector<HTMLElement>(`.oge-kanban-card[data-key="${key}"]`);

  it('Escape glides the lifted preview back onto its card', async () => {
    const one = card(1) as HTMLElement;
    one.dispatchEvent(
      pointer('pointerdown', { button: 0, clientX: 10, clientY: 10 }),
    );
    document.dispatchEvent(
      pointer('pointermove', { clientX: 60, clientY: 60 }),
    );
    await settle(fixture);
    place(one, 0, 120);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
    );
    await settle(fixture);
    const clone = host.querySelector<HTMLElement>('[data-oge-settling]');
    expect(clone).not.toBeNull();
    await frames();
    const glide = calls.find((call) => call.el === clone);
    expect(String(glide?.keyframes.at(-1)?.transform)).toContain(
      'translate(0px, 120px)',
    );
    expect(clone?.classList).toContain('oge-kanban-drag-settling');
    glide?.finish();
    await frames();
    expect(host.querySelector('[data-oge-settling]')).toBeNull();
  });

  it('a keyboard move glides the card from its old box', async () => {
    place(card(1) as HTMLElement, 10, 50);
    place(card(2) as HTMLElement, 10, 150);
    card(1)?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle(fixture);
    const moved = calls.filter((call) => call.el === card(1));
    expect(moved).toHaveLength(1);
    expect(moved[0].keyframes[0].transform).toBe('translate(10px, 50px)');
    // the card that stayed put does not move
    expect(calls.some((call) => call.el === card(2))).toBe(false);
  });
});
