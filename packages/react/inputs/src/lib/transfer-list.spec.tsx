import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, createRef, useState } from 'react';
import {
  OgeTransferList,
  type OgeTransferListHandle,
  type OgeTransferListMovedEvent,
  type OgeTransferListMovingEvent,
} from './transfer-list';

interface Perm {
  id: string;
  name: string;
  locked?: boolean;
}

const PERMS: Perm[] = [
  { id: 'read', name: 'Read' },
  { id: 'write', name: 'Write' },
  { id: 'admin', name: 'Admin', locked: true },
  { id: 'share', name: 'Share' },
];

const pane = (side: 'source' | 'target') =>
  document.querySelector(`[data-oge-transfer-side="${side}"]`) as HTMLElement;
const texts = (side: 'source' | 'target') =>
  Array.from(pane(side).querySelectorAll('[role="option"]')).map(
    (o) => o.textContent,
  );
const option = (side: 'source' | 'target', index: number) =>
  pane(side).querySelectorAll<HTMLElement>('[role="option"]')[index];
const list = (side: 'source' | 'target') =>
  pane(side).querySelector('[role="listbox"]') as HTMLElement;

function pointer(type: string, target: Element, x: number, y: number): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  target.dispatchEvent(event);
}

function Host(props: {
  veto?: boolean;
  onMoved?: (event: OgeTransferListMovedEvent<Perm>) => void;
}) {
  const [value, setValue] = useState<readonly unknown[]>(['share']);
  return (
    <>
      <OgeTransferList
        label="Permissions"
        items={PERMS}
        displayExpr="name"
        valueExpr="id"
        disabledExpr="locked"
        targetTitle="Granted"
        value={value}
        onValueChange={setValue}
        onMoving={(event: OgeTransferListMovingEvent<Perm>) => {
          if (props.veto) event.cancel = true;
        }}
        onMoved={props.onMoved}
      />
      <output data-testid="v">{JSON.stringify(value)}</output>
    </>
  );
}

describe('<OgeTransferList>', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('splits the items into two named lists with counts and shortcuts', () => {
    render(<Host />);
    expect(texts('source')).toEqual(['Read', 'Write', 'Admin']);
    expect(texts('target')).toEqual(['Share']);
    expect(screen.getByRole('listbox', { name: 'Available' })).toBe(
      list('source'),
    );
    expect(screen.getByRole('listbox', { name: 'Granted' })).toBe(
      list('target'),
    );
    expect(list('source').getAttribute('aria-keyshortcuts')).toBe(
      'Control+ArrowRight Control+Shift+ArrowRight',
    );
    expect(
      document.querySelector('.oge-transfer-list-count')!.textContent,
    ).toBe('3 items');
  });

  it('buttons move the selection and everything movable', async () => {
    const onMoved = vi.fn();
    render(<Host onMoved={onMoved} />);
    const add = screen.getByRole('button', { name: 'Add selected' });
    expect(add).toBeDisabled();
    fireEvent.click(option('source', 1));
    expect(add).not.toBeDisabled();
    fireEvent.click(add);
    expect(screen.getByTestId('v').textContent).toBe('["share","write"]');
    expect(onMoved.mock.calls[0][0]).toMatchObject({
      values: ['write'],
      from: 'source',
      to: 'target',
      cause: 'button',
    });
    expect(option('target', 1).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Add all' }));
    expect(screen.getByTestId('v').textContent).toBe(
      '["share","write","read"]',
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 200)));
    expect(
      document.querySelector('[data-oge-live-announcer="polite"]')?.textContent,
    ).toContain('moved to Granted');
    fireEvent.click(screen.getByRole('button', { name: 'Remove all' }));
    expect(screen.getByTestId('v').textContent).toBe('[]');
  });

  it('a vetoed onMoving keeps the value', () => {
    render(<Host veto />);
    fireEvent.click(screen.getByRole('button', { name: 'Add all' }));
    expect(screen.getByTestId('v').textContent).toBe('["share"]');
  });

  it('Ctrl+arrows on a focused list move toward the other list', () => {
    render(<Host />);
    const source = list('source');
    fireEvent.focus(source);
    fireEvent.keyDown(source, { key: ' ' });
    fireEvent.keyDown(source, { key: 'ArrowRight', ctrlKey: true });
    expect(screen.getByTestId('v').textContent).toBe('["share","read"]');
    fireEvent.keyDown(list('target'), {
      key: 'ArrowLeft',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(screen.getByTestId('v').textContent).toBe('[]');
  });

  it('dragging an option onto the other list runs the same move', async () => {
    const onMoved = vi.fn();
    render(<Host onMoved={onMoved} />);
    const target = list('target');
    act(() => {
      pointer('pointerdown', option('source', 0), 10, 10);
      pointer('pointermove', target, 60, 10);
      pointer('pointermove', target, 80, 12);
    });
    expect(pane('target').classList).toContain('oge-transfer-list-pane-drop');
    act(() => pointer('pointerup', target, 80, 12));
    expect(screen.getByTestId('v').textContent).toBe('["share","read"]');
    expect(onMoved.mock.calls[0][0].cause).toBe('drag');
    expect(pane('target').classList).not.toContain(
      'oge-transfer-list-pane-drop',
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  });

  it('works under StrictMode and through the handle', () => {
    const ref = createRef<OgeTransferListHandle>();
    const onValueChange = vi.fn();
    render(
      <StrictMode>
        <OgeTransferList
          ref={ref}
          items={PERMS}
          displayExpr="name"
          valueExpr="id"
          onValueChange={onValueChange}
        />
      </StrictMode>,
    );
    act(() => ref.current!.moveAllToTarget());
    expect(onValueChange).toHaveBeenLastCalledWith([
      'read',
      'write',
      'admin',
      'share',
    ]);
  });
});
