import { fireEvent, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { OgeFileUploader } from './file-uploader';

/**
 * jsdom has neither layout nor the Web Animations API: stack the rows by
 * their index among the list's rows and record `animate` calls.
 */
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
    const list = this.closest('.oge-upload-list');
    const top =
      list && this.classList.contains('oge-upload-file')
        ? Array.from(
            list.querySelectorAll(':scope > .oge-upload-file'),
          ).indexOf(this) * 50
        : 0;
    return {
      left: 0,
      top,
      width: 300,
      height: 44,
      right: 300,
      bottom: top + 44,
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

const FILES = [
  { uid: 'a', name: 'a.txt', size: 10 },
  { uid: 'b', name: 'b.txt', size: 20 },
  { uid: 'c', name: 'c.txt', size: 30 },
];

const rows = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '.oge-upload-file:not(.oge-exit-ghost)',
    ),
  );

const removeButton = (row: HTMLElement) =>
  Array.from(row.querySelectorAll('button')).at(-1) as HTMLButtonElement;

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('<OgeFileUploader> row motion', () => {
  let stub: ReturnType<typeof stubMotion> | undefined;
  afterEach(() => {
    stub?.restore();
    stub = undefined;
    document.querySelectorAll('.oge-exit-ghost').forEach((el) => el.remove());
  });

  it('marks an uploaded row with the check badge', () => {
    render(<OgeFileUploader initialFiles={FILES} />);
    for (const row of rows()) {
      expect(
        row.querySelector('.oge-upload-file-done svg path'),
      ).not.toBeNull();
    }
  });

  it('removes a row at once, without a ghost, in jsdom', async () => {
    render(<OgeFileUploader initialFiles={FILES} />);
    fireEvent.click(removeButton(rows()[0]));
    await tick();
    expect(rows().map((row) => row.dataset['uid'])).toEqual(['b', 'c']);
    expect(document.querySelector('.oge-exit-ghost')).toBeNull();
  });

  it('ghosts the removed row and glides the rows below up', async () => {
    stub = stubMotion();
    render(
      <StrictMode>
        <OgeFileUploader initialFiles={FILES} />
      </StrictMode>,
    );
    fireEvent.click(removeButton(rows()[0]));
    await tick();
    expect(rows().map((row) => row.dataset['uid'])).toEqual(['b', 'c']);
    const ghost = document.querySelector<HTMLElement>('.oge-exit-ghost');
    expect(ghost?.getAttribute('aria-hidden')).toBe('true');
    expect(ghost?.dataset['uid']).toBe('a');
    const glides = stub.calls
      .filter((call) => call.el !== ghost)
      .map((call) => ({
        uid: (call.el as HTMLElement).dataset['uid'],
        from: call.keyframes[0].transform,
      }));
    expect(glides).toEqual([
      { uid: 'b', from: 'translate(0px, 50px)' },
      { uid: 'c', from: 'translate(0px, 50px)' },
    ]);
  });
});
