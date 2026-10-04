import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import type { LoadOptions } from '@oge-ui/core';
import type {
  OgeDropDownClosingEvent,
  OgeListDataSource,
} from '@oge-ui/behavior';
import { OgeSelectBox } from './select-box';

interface Fruit {
  name: string;
  kind: string;
}

const FRUITS: Fruit[] = [
  { name: 'Apple', kind: 'Pome' },
  { name: 'Cherry', kind: 'Stone' },
  { name: 'Pear', kind: 'Pome' },
];

const combo = () => screen.getByRole('combobox') as HTMLInputElement;

function Host(extra: Partial<Parameters<typeof OgeSelectBox<Fruit>>[0]> = {}) {
  const [value, setValue] = useState<unknown>(null);
  return (
    <OgeSelectBox<Fruit>
      label="Fruit"
      items={FRUITS}
      displayExpr="name"
      value={value}
      onValueChange={setValue}
      {...extra}
    />
  );
}

interface Person {
  id: number;
  name: string;
}

const PEOPLE: Person[] = Array.from({ length: 120 }, (_, i) => ({
  id: i + 1,
  name: `Person ${String(i + 1).padStart(3, '0')}`,
}));

function server() {
  const calls: LoadOptions[] = [];
  const keys: unknown[] = [];
  const source: OgeListDataSource<Person> = {
    load: async (options) => {
      calls.push(options);
      const term = (options.searchText ?? '').toLowerCase();
      const rows = PEOPLE.filter((p) => p.name.toLowerCase().includes(term));
      const skip = options.skip ?? 0;
      return {
        data: rows.slice(skip, skip + (options.take ?? rows.length)),
        totalCount: rows.length,
      };
    },
    byKey: async (key) => {
      keys.push(key);
      return PEOPLE.find((p) => p.id === key) ?? null;
    },
  };
  return { source, calls, keys };
}

function RemoteHost(props: {
  source: OgeListDataSource<Person>;
  initial?: unknown;
}) {
  const [value, setValue] = useState<unknown>(props.initial ?? null);
  return (
    <OgeSelectBox<Person>
      label="Person"
      dataSource={props.source}
      pageSize={20}
      displayExpr="name"
      valueExpr="id"
      searchEnabled
      searchTimeout={0}
      virtualScroll
      value={value}
      onValueChange={setValue}
    />
  );
}

describe('<OgeSelectBox> templates and pre-events', () => {
  it('renders renderGroup, renderHeader and renderFooter', () => {
    render(
      <Host
        groupBy="kind"
        renderGroup={(label) => <span className="group-r">Kind {label}</span>}
        renderHeader={({ items }) => (
          <span className="header-r">{items.length} fruits</span>
        )}
        renderFooter={() => <span className="footer-r">footer</span>}
      />,
    );
    fireEvent.click(combo());
    expect(
      Array.from(document.querySelectorAll('.group-r')).map(
        (el) => el.textContent,
      ),
    ).toEqual(['Kind Pome', 'Kind Stone']);
    expect(
      document.querySelector('.oge-select-popup-header .header-r')?.textContent,
    ).toBe('3 fruits');
    expect(document.querySelector('.oge-select-popup-footer')).not.toBeNull();
  });

  it('renderField paints over the input while not searching', () => {
    render(
      <OgeSelectBox<Fruit>
        label="Fruit"
        items={FRUITS}
        displayExpr="name"
        defaultValue={FRUITS[1]}
        renderField={(item, { text }) => (
          <b className="field-r">
            {item?.kind} {text}
          </b>
        )}
      />,
    );
    const content = document.querySelector('.oge-select-field-content');
    expect(content).toHaveAttribute('aria-hidden', 'true');
    expect(content?.textContent).toBe('Stone Cherry');
    expect(combo().value).toBe('Cherry');
    expect(document.querySelector('.oge-select-box')).toHaveClass(
      'oge-select-field-templated',
    );
  });

  it('onOpening can veto the open', () => {
    render(<Host onOpening={(event) => (event.cancel = true)} />);
    fireEvent.click(combo());
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('onClosing can veto Escape and outside closes, with the reason', () => {
    const reasons: string[] = [];
    render(
      <Host
        onClosing={(event: OgeDropDownClosingEvent) => {
          reasons.push(event.reason);
          event.cancel = true;
        }}
      />,
    );
    fireEvent.click(combo());
    fireEvent.keyDown(combo(), { key: 'Escape' });
    fireEvent.pointerDown(document.body);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(reasons).toEqual(['escape', 'outside']);
  });
});

describe('<OgeSelectBox> remote dataSource', () => {
  it('loads pages on open and as the virtual window scrolls', async () => {
    const s = server();
    render(<RemoteHost source={s.source} />);
    fireEvent.click(combo());
    await waitFor(() =>
      expect(screen.getAllByRole('option')[0]).toHaveTextContent('Person 001'),
    );
    expect(s.calls[0]).toMatchObject({
      skip: 0,
      take: 20,
      requireTotalCount: true,
    });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute(
      'aria-setsize',
      '120',
    );
    const list = screen.getByRole('listbox');
    list.scrollTop = 20 * 34 - 320;
    fireEvent.scroll(list);
    await waitFor(() => expect(s.calls.map((c) => c.skip)).toEqual([0, 20]));
  });

  it('sends the typed text as searchText', async () => {
    const s = server();
    render(<RemoteHost source={s.source} />);
    fireEvent.click(combo());
    fireEvent.change(combo(), { target: { value: '077' } });
    await waitFor(() =>
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
        'Person 077',
      ]),
    );
    expect(s.calls.at(-1)).toMatchObject({ searchText: '077', skip: 0 });
  });

  it('resolves a value no page holds through byKey', async () => {
    const s = server();
    render(<RemoteHost source={s.source} initial={99} />);
    await waitFor(() => expect(combo().value).toBe('Person 099'));
    expect(s.keys).toEqual([99]);
  });
});
