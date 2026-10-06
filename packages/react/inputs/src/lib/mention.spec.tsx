import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import type { OgeMentionToken } from '@oge-ui/behavior';
import { OgeMention } from './mention';

interface User {
  id: number;
  name: string;
}

const USERS: User[] = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Alan' },
  { id: 3, name: 'Grace' },
];

function Host(props: { multiline?: boolean }) {
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<readonly OgeMentionToken<User>[]>(
    [],
  );
  return (
    <>
      <OgeMention
        label="Comment"
        items={USERS}
        displayExpr="name"
        valueExpr="id"
        multiline={props.multiline}
        value={text}
        onValueChange={setText}
        mentions={mentions}
        onMentionsChange={setMentions}
      />
      <output data-testid="text">{text}</output>
      <output data-testid="mentions">
        {mentions.map((m) => `${m.value}@${m.start}`).join(',')}
      </output>
    </>
  );
}

function field(): HTMLTextAreaElement | HTMLInputElement {
  return document.querySelector('.oge-input-native') as HTMLTextAreaElement;
}

function type(text: string) {
  const el = field();
  act(() => el.focus());
  fireEvent.change(el, {
    target: { value: text, selectionStart: text.length },
  });
}

const options = () => screen.queryAllByRole('option');

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb(0), 0),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('<OgeMention>', () => {
  it('opens the suggestions after a trigger and moves the active option (StrictMode)', () => {
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    type('Hi @a');
    expect(screen.getByRole('listbox').getAttribute('aria-label')).toBe(
      'Suggestions',
    );
    expect(options().map((o) => o.textContent)).toEqual([
      '@Ada',
      '@Alan',
      '@Grace',
    ]);
    const el = field();
    expect(el.getAttribute('aria-activedescendant')).toBe(options()[0].id);
    fireEvent.keyDown(el, { key: 'ArrowDown' });
    expect(el.getAttribute('aria-activedescendant')).toBe(options()[1].id);
  });

  it('inserts with Enter, reports the mention and tracks later edits', () => {
    render(<Host />);
    type('Hi @gr');
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(screen.getByTestId('text').textContent).toBe('Hi @Grace ');
    expect(screen.getByTestId('mentions').textContent).toBe('3@3');
    expect(options()).toHaveLength(0);
    type('Oh, Hi @Grace ');
    expect(screen.getByTestId('mentions').textContent).toBe('3@7');
    type('Oh, Hi @Grac ');
    expect(screen.getByTestId('mentions').textContent).toBe('');
  });

  it('Escape closes until a new trigger', () => {
    render(<Host />);
    type('@a');
    expect(options().length).toBeGreaterThan(0);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });
    expect(options()).toHaveLength(0);
    type('@al');
    expect(options()).toHaveLength(0);
    type('@al @');
    expect(options()).toHaveLength(3);
  });

  it('is a combobox when single-line, and a click inserts', () => {
    render(<Host multiline={false} />);
    const el = field();
    expect(el.tagName).toBe('INPUT');
    expect(el.getAttribute('role')).toBe('combobox');
    expect(el.getAttribute('aria-expanded')).toBe('false');
    type('@');
    expect(el.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(options()[1]);
    expect(screen.getByTestId('text').textContent).toBe('@Alan ');
  });

  it('serves several triggers and a custom row', () => {
    render(
      <OgeMention<User>
        label="Note"
        triggers={[
          { char: '@', items: USERS, displayExpr: 'name' },
          {
            char: '#',
            items: [{ id: 7, name: 'urgent' }],
            displayExpr: 'name',
          },
        ]}
        renderItem={(item, ctx) => (
          <b className={ctx.active ? 'custom is-active' : 'custom'}>
            {item.name}!
          </b>
        )}
      />,
    );
    type('#');
    const rows = document.querySelectorAll('.custom');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toBe('urgent!');
    expect(rows[0].classList.contains('is-active')).toBe(true);
  });

  it('ignores a trigger inside a word', () => {
    render(<Host />);
    type('mail@a');
    expect(options()).toHaveLength(0);
  });
});
