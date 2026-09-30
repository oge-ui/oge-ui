import { act, fireEvent, render, screen } from '@testing-library/react';
import { OGE_DEFAULT_BPMN_MESSAGES } from '@oge-ui/bpmn-engine';
import { BpmnPalette } from './bpmn-palette';

describe('BpmnPalette', () => {
  function setup(disabled = false) {
    const onToolPicked = vi.fn();
    const onDragStarted = vi.fn();
    const utils = render(
      <BpmnPalette
        label="Elements palette"
        items={['startEvent', 'task', 'exclusiveGateway']}
        labels={OGE_DEFAULT_BPMN_MESSAGES.paletteLabels}
        activeType="task"
        disabled={disabled}
        onToolPicked={onToolPicked}
        onDragStarted={onDragStarted}
      />,
    );
    return { ...utils, onToolPicked, onDragStarted };
  }

  it('renders one roving-tabindex button per item with aria-pressed', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons.map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('toolbar').getAttribute('aria-orientation')).toBe(
      'vertical',
    );
  });

  it('moves focus with the shared APG key map', () => {
    setup();
    const [first, , last] = screen.getAllByRole('button');
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(last);
    expect(last.tabIndex).toBe(0);
    fireEvent.keyDown(last, { key: 'Home' });
    expect(document.activeElement).toBe(first);
  });

  it('reports picks and pointer-downs', () => {
    const { onToolPicked, onDragStarted } = setup();
    const start = screen.getByRole('button', { name: 'Start event' });
    // jsdom has no PointerEvent; a MouseEvent typed pointerdown carries the fields
    act(() => {
      start.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          button: 0,
          clientX: 5,
          clientY: 6,
        }),
      );
    });
    fireEvent.click(start);
    expect(onDragStarted).toHaveBeenCalledWith({
      type: 'startEvent',
      clientX: 5,
      clientY: 6,
    });
    expect(onToolPicked).toHaveBeenCalledWith('startEvent');
  });
});
