import { StrictMode, createRef, useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import { ogeEditorWriteSelection } from '@oge-ui/behavior';
import { OgeEditor, type OgeEditorHandle } from './editor';
import { OgeEditorConfigProvider } from './editor-config';

function surface(): HTMLElement {
  return screen.getByRole('textbox');
}

function caret(block: number, offset: number, end = offset): void {
  const root = surface();
  root.focus();
  ogeEditorWriteSelection(
    root,
    { anchor: { block, offset }, focus: { block, offset: end } },
    document.getSelection(),
  );
  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });
}

function type(text: string): void {
  for (const ch of text) {
    act(() => {
      surface().dispatchEvent(
        new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: ch,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  }
}

function tool(key: string): HTMLButtonElement {
  return document.querySelector(
    `[data-oge-editor-tool="${key}"]`,
  ) as HTMLButtonElement;
}

function Controlled({ onChange }: { onChange?: (html: string) => void }) {
  const [html, setHtml] = useState('<p>hello</p>');
  return (
    <>
      <OgeEditor
        label="Body"
        hint="Markdown shortcuts work"
        value={html}
        onValueChange={(next) => {
          setHtml(next);
          onChange?.(next);
        }}
      />
      <output data-testid="value">{html}</output>
    </>
  );
}

describe('<OgeEditor> (React)', () => {
  it('renders an accessible textbox with the value — under StrictMode', () => {
    render(
      <StrictMode>
        <Controlled />
      </StrictMode>,
    );
    const root = surface();
    expect(root.getAttribute('aria-multiline')).toBe('true');
    expect(root.getAttribute('contenteditable')).toBe('true');
    expect(root.getAttribute('aria-labelledby')).toMatch(/-label$/);
    expect(root.querySelector('p')?.textContent).toBe('hello');
  });

  it('typing goes through the model and survives the StrictMode remount', () => {
    const changes: string[] = [];
    render(
      <StrictMode>
        <Controlled onChange={(html) => changes.push(html)} />
      </StrictMode>,
    );
    caret(0, 5);
    type('!');
    expect(screen.getByTestId('value').textContent).toBe('<p>hello!</p>');
    expect(changes).toEqual(['<p>hello!</p>']);
  });

  it('the toolbar is a labelled APG toolbar with pressed toggles and shortcut tooltips', () => {
    render(<Controlled />);
    expect(screen.getByRole('toolbar').getAttribute('aria-label')).toBe(
      'Text formatting',
    );
    expect(tool('bold').getAttribute('title')).toBe('Bold (Ctrl+B)');
    expect(tool('bold').getAttribute('aria-keyshortcuts')).toBe('Control+B');
    caret(0, 0, 5);
    act(() => tool('bold').click());
    expect(screen.getByTestId('value').textContent).toBe(
      '<p><strong>hello</strong></p>',
    );
    expect(tool('bold').getAttribute('aria-pressed')).toBe('true');
  });

  it('keyboard shortcuts and undo', () => {
    render(<Controlled />);
    caret(0, 0, 5);
    act(() => {
      surface().dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'i',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(screen.getByTestId('value').textContent).toBe(
      '<p><em>hello</em></p>',
    );
    act(() => tool('undo').click());
    expect(screen.getByTestId('value').textContent).toBe('<p>hello</p>');
  });

  it('uncontrolled with defaultValue, and the ref handle', () => {
    const ref = createRef<OgeEditorHandle>();
    render(<OgeEditor ref={ref} defaultValue="<p>a</p>" toolbar={false} />);
    expect(screen.queryByRole('toolbar')).toBeNull();
    act(() => {
      ref.current?.selectAll();
      ref.current?.exec('heading2');
    });
    expect(ref.current?.getHtml()).toBe('<h2>a</h2>');
    expect(ref.current?.insertLink('javascript:alert(1)')).toBe(false);
    act(() => ref.current?.reset('<p>b</p>'));
    expect(surface().textContent).toBe('b');
    expect(ref.current?.canUndo).toBe(false);
  });

  it('sanitizes a bound value', () => {
    render(
      <OgeEditor
        defaultValue={'<p onclick="x()">ok</p><script>alert(1)</script>'}
      />,
    );
    expect(surface().innerHTML).not.toContain('script');
    expect(surface().innerHTML).not.toContain('onclick');
  });

  it('maxLength stops typing and shows the counter', () => {
    render(
      <OgeEditor
        defaultValue="<p>abc</p>"
        maxLength={4}
        counter="characters"
      />,
    );
    caret(0, 3);
    type('de');
    expect(surface().textContent).toBe('abcd');
    expect(document.querySelector('.oge-editor-counter')?.textContent).toBe(
      '4 / 4',
    );
  });

  it('read-only: not editable and tools disabled', () => {
    render(<OgeEditor defaultValue="<p>a</p>" readonly />);
    expect(surface().getAttribute('contenteditable')).toBe('false');
    expect(surface().getAttribute('aria-readonly')).toBe('true');
    expect(tool('bold').disabled).toBe(true);
  });

  it('config provider and messages prop merge', () => {
    render(
      <OgeEditorConfigProvider
        config={{ messages: { tools: { bold: 'Kalın' } } }}
      >
        <OgeEditor messages={{ tools: { italic: 'Eğik' } }} />
      </OgeEditorConfigProvider>,
    );
    expect(tool('bold').getAttribute('aria-label')).toBe('Kalın');
    expect(tool('italic').getAttribute('aria-label')).toBe('Eğik');
  });

  it('opens the block-format menu', () => {
    render(<Controlled />);
    act(() => tool('blockFormat').click());
    const items = Array.from(
      document.querySelectorAll('[role="menuitemradio"]'),
    ).map((el) => el.textContent?.trim());
    expect(items).toContain('Heading 2');
    expect(tool('blockFormat').getAttribute('aria-expanded')).toBe('true');
  });
});
