import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import type { OgeListDataSource } from '@oge-ui/behavior';
import { OgeTagBox } from './tag-box';

interface Skill {
  id: number;
  name: string;
  area: string;
  off?: boolean;
}

const SKILLS: Skill[] = [
  { id: 1, name: 'Angular', area: 'Frontend' },
  { id: 2, name: 'Signals', area: 'Frontend' },
  { id: 3, name: 'Nx', area: 'Tooling' },
  { id: 4, name: 'Vitest', area: 'Tooling', off: true },
];

const combo = () => screen.getByRole('combobox') as HTMLInputElement;

function Host(
  extra: Partial<Parameters<typeof OgeTagBox<Skill>>[0]> & {
    initial?: readonly unknown[];
    onValue?: (value: readonly unknown[]) => void;
  } = {},
) {
  const { initial, onValue, ...rest } = extra;
  const [value, setValue] = useState<readonly unknown[]>(initial ?? []);
  return (
    <OgeTagBox<Skill>
      label="Skills"
      items={SKILLS}
      displayExpr="name"
      valueExpr="id"
      disabledExpr="off"
      searchEnabled
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
      {...rest}
    />
  );
}

describe('<OgeTagBox> parity features', () => {
  it('renders renderItem and renderTag (the remove button stays)', () => {
    render(
      <Host
        initial={[1]}
        renderTag={(_item, { text }) => <span className="tag-r">#{text}</span>}
        renderItem={(item, { selected }) => (
          <span className="item-r">
            {item.name}
            {selected ? ' ✓' : ''}
          </span>
        )}
      />,
    );
    expect(document.querySelector('.tag-r')?.textContent).toBe('#Angular');
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    fireEvent.click(combo());
    expect(document.querySelector('.item-r')?.textContent).toBe('Angular ✓');
  });

  it('groups options and loads a lazy items function', async () => {
    render(<Host groupBy="area" items={() => Promise.resolve(SKILLS)} />);
    fireEvent.click(combo());
    await waitFor(() =>
      expect(
        Array.from(document.querySelectorAll('.oge-select-group')).map(
          (el) => el.textContent,
        ),
      ).toEqual(['Frontend', 'Tooling']),
    );
  });

  it('creates a custom tag on Enter', () => {
    const onValue = vi.fn();
    render(
      <Host
        acceptCustomValue
        onValue={onValue}
        onCustomItemCreating={(event) => {
          event.customItem = { id: 99, name: event.text, area: 'Custom' };
        }}
      />,
    );
    fireEvent.change(combo(), { target: { value: 'Rust' } });
    fireEvent.keyDown(combo(), { key: 'Enter' });
    expect(onValue).toHaveBeenLastCalledWith([99]);
    expect(screen.getByText('Rust')).toHaveClass('oge-tag-text');
  });

  it('select all reports mixed, selects the enabled items and clears them', () => {
    const onValue = vi.fn();
    render(<Host showSelectAll initial={[1]} onValue={onValue} />);
    fireEvent.click(combo());
    const row = () =>
      document.querySelector('.oge-tag-select-all-option') as HTMLElement;
    expect(row()).toHaveAttribute('aria-checked', 'mixed');
    fireEvent.click(row());
    expect(onValue).toHaveBeenLastCalledWith([1, 2, 3]);
    expect(row()).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(row());
    expect(onValue).toHaveBeenLastCalledWith([]);
  });

  it('ArrowUp from the first option reaches the select-all row', () => {
    const onValue = vi.fn();
    render(<Host showSelectAll onValue={onValue} />);
    fireEvent.click(combo());
    fireEvent.keyDown(combo(), { key: 'ArrowUp' });
    expect(combo().getAttribute('aria-activedescendant')).toMatch(
      /-select-all$/,
    );
    fireEvent.keyDown(combo(), { key: 'Enter' });
    expect(onValue).toHaveBeenLastCalledWith([1, 2, 3]);
  });

  it('maxSelectedItems caps the selection and says why', () => {
    const onValue = vi.fn();
    render(<Host maxSelectedItems={2} initial={[1, 2]} onValue={onValue} />);
    fireEvent.click(combo());
    expect(document.querySelector('.oge-select-limit')?.textContent).toContain(
      'up to 2',
    );
    const nx = screen.getByRole('option', { name: 'Nx' });
    expect(nx).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(nx);
    expect(onValue).not.toHaveBeenCalled();
  });

  it('folds overflow chips into "+N more"', () => {
    render(<Host maxDisplayedTags={1} initial={[1, 2, 3]} />);
    expect(document.querySelector('.oge-tag-more')?.textContent).toBe(
      '+2 more',
    );
  });

  it('pages remote data and keeps picked chips across searches', async () => {
    const searches: unknown[] = [];
    const source: OgeListDataSource<Skill> = {
      load: async (options) => {
        searches.push(options.searchText);
        const term = (options.searchText ?? '').toLowerCase();
        const rows = SKILLS.filter((s) => s.name.toLowerCase().includes(term));
        return { data: rows, totalCount: rows.length };
      },
    };
    render(<Host items={[]} dataSource={source} searchTimeout={0} />);
    fireEvent.click(combo());
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(4));
    fireEvent.click(screen.getByRole('option', { name: 'Angular' }));
    fireEvent.change(combo(), { target: { value: 'nx' } });
    await waitFor(() => expect(searches).toEqual([undefined, 'nx']));
    expect(screen.getByText('Angular')).toHaveClass('oge-tag-text');
  });
});
