import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { OgeAutocomplete } from './autocomplete';
import { OgeSelectBox } from './select-box';
import { OgeTagBox } from './tag-box';

interface Row {
  id: number;
  name: string;
  region: string;
}

const ITEMS: Row[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  name: `Item ${i}`,
  region: i % 2 === 0 ? 'Even' : 'Odd',
}));

const combo = () => screen.getByRole('combobox') as HTMLInputElement;
const options = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-select-option'));
const listEl = () =>
  document.querySelector<HTMLElement>('.oge-select-list') as HTMLElement;
const spacer = () =>
  document.querySelector<HTMLElement>('.oge-select-spacer') as HTMLElement;

const scrollTo = (top: number) => {
  listEl().scrollTop = top;
  fireEvent.scroll(listEl());
};

beforeEach(() => {
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 0) as unknown as number,
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('<OgeSelectBox virtualScroll>', () => {
  function Host(extra: Partial<Parameters<typeof OgeSelectBox<Row>>[0]> = {}) {
    const [value, setValue] = useState<unknown>(null);
    return (
      <OgeSelectBox
        label="Rows"
        items={ITEMS}
        displayExpr="name"
        valueExpr="id"
        virtualScroll
        dropdownMaxHeight={200}
        value={value}
        onValueChange={setValue}
        {...extra}
      />
    );
  }

  it('renders only a window of the 1000 items inside a full-height spacer', () => {
    render(<Host />);
    fireEvent.click(combo());
    const rendered = options();
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(30);
    expect(spacer().style.height).toBe(`${1000 * 34}px`);
    expect(listEl().classList).toContain('oge-select-list-virtual');
  });

  it('keeps absolute option ids, aria-posinset and aria-setsize while scrolled', () => {
    render(<Host />);
    fireEvent.click(combo());
    scrollTo(3400); // 100 rows down
    const first = options()[0];
    const index = Number(first.id.split('-option-')[1]);
    expect(index).toBe(100 - 4); // overscan above the viewport
    expect(first.getAttribute('aria-posinset')).toBe(String(index + 1));
    expect(first.getAttribute('aria-setsize')).toBe('1000');
  });

  it('scrolls the pre-selected value into the window on open', async () => {
    function Preselected() {
      const [value, setValue] = useState<unknown>(500);
      return (
        <OgeSelectBox
          label="Rows"
          items={ITEMS}
          displayExpr="name"
          valueExpr="id"
          virtualScroll
          dropdownMaxHeight={200}
          value={value}
          onValueChange={setValue}
        />
      );
    }
    render(<Preselected />);
    fireEvent.click(combo());
    await waitFor(() => {
      const active = document.querySelector('.oge-select-option-active');
      expect(active).toHaveTextContent('Item 500');
      expect(active).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('ignores groupBy in virtual mode and warns in dev mode', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Host groupBy="region" />);
    fireEvent.click(combo());
    expect(document.querySelector('.oge-select-group')).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('virtualScroll ignores groupBy'),
    );
    warn.mockRestore();
  });

  it('selects by click on an absolute index deep in the list', async () => {
    render(<Host />);
    fireEvent.click(combo());
    scrollTo(6800); // 200 rows down
    const target = options().find(
      (option) => option.textContent?.trim() === 'Item 205',
    );
    expect(target).toBeDefined();
    fireEvent.click(target as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(combo().value).toBe('Item 205');
  });
});

describe('<OgeTagBox virtualScroll>', () => {
  function Host() {
    const [value, setValue] = useState<readonly unknown[]>([]);
    return (
      <OgeTagBox
        label="Rows"
        items={ITEMS}
        displayExpr="name"
        valueExpr="id"
        virtualScroll
        dropdownMaxHeight={200}
        value={value}
        onValueChange={setValue}
      />
    );
  }

  it('windows the multiselect list and toggles a deep absolute index', () => {
    render(<Host />);
    fireEvent.click(combo());
    expect(options().length).toBeLessThan(30);
    expect(spacer().style.height).toBe(`${1000 * 34}px`);

    scrollTo(3400);
    const target = options().find(
      (option) => option.textContent?.trim() === 'Item 105',
    );
    expect(target).toBeDefined();
    expect(target?.getAttribute('aria-setsize')).toBe('1000');
    fireEvent.click(target as HTMLElement);
    // multi-select stays open; the picked row is checked
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(
      options().find((option) => option.textContent?.trim() === 'Item 105'),
    ).toHaveAttribute('aria-selected', 'true');
  });
});

describe('<OgeAutocomplete virtualScroll>', () => {
  it('windows the suggestion list inside a full-height spacer', () => {
    function Host() {
      const [value, setValue] = useState('');
      return (
        <OgeAutocomplete
          label="Rows"
          items={ITEMS}
          displayExpr="name"
          maxItemCount={1000}
          virtualScroll
          dropdownMaxHeight={200}
          defaultOpened
          value={value}
          onValueChange={setValue}
        />
      );
    }
    render(<Host />);
    const rendered = options();
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(30);
    expect(spacer().style.height).toBe(`${1000 * 34}px`);
    scrollTo(3400);
    expect(options()[0].getAttribute('aria-posinset')).toBe(
      String(100 - 4 + 1),
    );
  });
});
