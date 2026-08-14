import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type {
  OgePaginationPageChangedEvent,
  OgePaginationPageSizeChangedEvent,
} from '@oge-ui/behavior';
import { OgePagination, type OgePaginationHandle } from './pagination';
import { OgePaginationConfigProvider } from './navigation-config';

const pageButtons = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll('.oge-pagination-page'));
const navButtons = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll('.oge-pagination-nav-btn'));
const text = (selector: string): string | undefined =>
  document.querySelector(selector)?.textContent?.trim();

describe('<OgePagination>', () => {
  it('renders the constant-width window and marks the current page', () => {
    render(
      <OgePagination itemCount={400} defaultPageIndex={10} pageSize={20} />,
    );
    expect(pageButtons().map((b) => b.textContent?.trim())).toEqual([
      '1',
      '10',
      '11',
      '12',
      '20',
    ]);
    expect(document.querySelectorAll('.oge-pagination-ellipsis')).toHaveLength(
      2,
    );
    const current = document.querySelector(
      '.oge-pagination-current',
    ) as HTMLElement;
    expect(current.textContent?.trim()).toBe('11');
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  it('controlled page state: clicks report up, prop writes re-render', () => {
    const events: OgePaginationPageChangedEvent[] = [];
    function Host() {
      const [page, setPage] = useState(0);
      return (
        <>
          <button className="jump4" onClick={() => setPage(4)}>
            go
          </button>
          <OgePagination
            pageIndex={page}
            onPageIndexChange={setPage}
            itemCount={97}
            pageSize={20}
            onPageChanged={(e) => events.push(e)}
          />
        </>
      );
    }
    render(<Host />);
    fireEvent.click(pageButtons()[2]);
    expect(text('.oge-pagination-current')).toBe('3');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      pageIndex: 2,
      previousPageIndex: 0,
      pageSize: 20,
    });

    fireEvent.click(document.querySelector('.jump4') as HTMLElement);
    expect(text('.oge-pagination-current')).toBe('5');
    // programmatic write emitted NO rich event
    expect(events).toHaveLength(1);
  });

  it('uncontrolled page state moves on its own', () => {
    render(<OgePagination itemCount={97} pageSize={20} />);
    fireEvent.click(pageButtons()[2]);
    expect(text('.oge-pagination-current')).toBe('3');
  });

  it('prev disables at the first page, next at the last', () => {
    const { rerender } = render(
      <OgePagination pageIndex={0} itemCount={97} pageSize={20} />,
    );
    expect(navButtons()[0].disabled).toBe(true);
    expect(navButtons()[1].disabled).toBe(false);
    rerender(<OgePagination pageIndex={4} itemCount={97} pageSize={20} />);
    expect(navButtons()[0].disabled).toBe(false);
    expect(navButtons()[1].disabled).toBe(true);
  });

  it('first/last buttons render on demand and jump to the rails', () => {
    const pages: number[] = [];
    function Host() {
      const [page, setPage] = useState(2);
      pages.push(page);
      return (
        <OgePagination
          pageIndex={page}
          onPageIndexChange={setPage}
          itemCount={97}
          pageSize={20}
          showFirstLastButtons
        />
      );
    }
    render(<Host />);
    const buttons = navButtons(); // first, prev, next, last
    expect(buttons).toHaveLength(4);
    fireEvent.click(buttons[3]);
    expect(pages.at(-1)).toBe(4);
    fireEvent.click(navButtons()[0]);
    expect(pages.at(-1)).toBe(0);
  });

  it('unknown total renders prev/next + "Page N" only; next never disables', () => {
    const ref = createRef<OgePaginationHandle>();
    render(
      <OgePagination
        ref={ref}
        pageIndex={6}
        itemCount={undefined}
        pageSize={20}
        showFirstLastButtons
        showInfo
        showJumpToPageInput
      />,
    );
    expect(pageButtons()).toHaveLength(0);
    expect(navButtons()).toHaveLength(2); // first/last hidden
    expect(document.querySelector('.oge-pagination-jump')).toBeNull();
    expect(document.querySelector('.oge-pagination-info')).toBeNull();
    expect(text('.oge-pagination-indicator')).toBe('Page 7');
    expect(navButtons()[1].disabled).toBe(false);
    expect(ref.current?.hasNextPage()).toBe(true);
  });

  it("page-size select commits, 'all' maps to 0 and the index re-clamps", () => {
    const sizeEvents: OgePaginationPageSizeChangedEvent[] = [];
    function Host() {
      const [page, setPage] = useState(4);
      const [size, setSize] = useState(20);
      return (
        <OgePagination
          pageIndex={page}
          onPageIndexChange={setPage}
          pageSize={size}
          onPageSizeChange={setSize}
          itemCount={97}
          pageSizes={[10, 20, 'all']}
          onPageSizeChanged={(e) => sizeEvents.push(e)}
        />
      );
    }
    render(<Host />);
    const select = document.querySelector(
      '.oge-pagination-select',
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '10' } });
    expect(sizeEvents[0]).toMatchObject({
      pageSize: 10,
      previousPageSize: 20,
      pageIndex: 4, // still valid: 97/10 = 10 pages
    });

    fireEvent.change(select, { target: { value: 'all' } });
    expect(sizeEvents[1].pageSize).toBe(0);
    expect(sizeEvents[1].pageIndex).toBe(0); // one page now
    expect(text('.oge-pagination-current')).toBe('1');
  });

  it('renders the info range text', () => {
    render(
      <OgePagination pageIndex={1} itemCount={97} pageSize={20} showInfo />,
    );
    expect(text('.oge-pagination-info')).toBe('21–40 of 97');
  });

  it('jump input commits on Enter with clamping and re-syncs its display', () => {
    function Host() {
      const [page, setPage] = useState(0);
      return (
        <OgePagination
          pageIndex={page}
          onPageIndexChange={setPage}
          itemCount={97}
          pageSize={20}
          showJumpToPageInput
        />
      );
    }
    render(<Host />);
    const jump = document.querySelector(
      '.oge-pagination-jump-input',
    ) as HTMLInputElement;
    jump.value = '3';
    fireEvent.keyDown(jump, { key: 'Enter' });
    expect(text('.oge-pagination-current')).toBe('3');

    jump.value = '99';
    fireEvent.keyDown(jump, { key: 'Enter' });
    expect(text('.oge-pagination-current')).toBe('5'); // clamped to last
    expect(jump.value).toBe('5'); // display re-synced, 1-based
  });

  it('compact mode renders the N / M indicator; adaptive stays full in jsdom', () => {
    const { rerender } = render(
      <OgePagination
        pageIndex={2}
        itemCount={97}
        pageSize={20}
        displayMode="compact"
      />,
    );
    expect(pageButtons()).toHaveLength(0);
    expect(text('.oge-pagination-indicator')).toBe('3 / 5');

    // adaptive: containerSize <= 0 (jsdom) means "not measured yet" → full
    rerender(
      <OgePagination
        pageIndex={2}
        itemCount={97}
        pageSize={20}
        displayMode="adaptive"
      />,
    );
    expect(pageButtons().length).toBeGreaterThan(0);
  });

  it('auto-clamps the page when the item count shrinks (no rich event)', () => {
    const events: OgePaginationPageChangedEvent[] = [];
    function Host() {
      const [page, setPage] = useState(4);
      const [count, setCount] = useState(97);
      return (
        <>
          <button className="shrink" onClick={() => setCount(25)}>
            shrink
          </button>
          <OgePagination
            pageIndex={page}
            onPageIndexChange={setPage}
            itemCount={count}
            pageSize={20}
            onPageChanged={(e) => events.push(e)}
          />
        </>
      );
    }
    render(<Host />);
    fireEvent.click(document.querySelector('.shrink') as HTMLElement);
    expect(text('.oge-pagination-current')).toBe('2'); // 2 pages now
    expect(events).toHaveLength(0);
  });

  it('zero items renders a single disabled-rails page and 0–0 info', () => {
    render(<OgePagination itemCount={0} pageSize={20} showInfo />);
    expect(pageButtons()).toHaveLength(1);
    expect(navButtons()[0].disabled).toBe(true);
    expect(navButtons()[1].disabled).toBe(true);
    expect(text('.oge-pagination-info')).toBe('0–0 of 0');
  });

  it('disabled disables every control', () => {
    render(
      <OgePagination
        itemCount={97}
        pageSize={20}
        pageSizes={[10, 20]}
        showJumpToPageInput
        disabled
      />,
    );
    for (const button of [...pageButtons(), ...navButtons()]) {
      expect(button.disabled).toBe(true);
    }
    expect(
      (document.querySelector('.oge-pagination-select') as HTMLSelectElement)
        .disabled,
    ).toBe(true);
    expect(
      (document.querySelector('.oge-pagination-jump-input') as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });

  it('the handle drives the page; lastPage no-ops on unknown totals', () => {
    const ref = createRef<OgePaginationHandle>();
    const { rerender } = render(
      <OgePagination ref={ref} itemCount={97} pageSize={20} />,
    );
    act(() => ref.current?.lastPage());
    expect(text('.oge-pagination-current')).toBe('5');
    act(() => ref.current?.previousPage());
    expect(text('.oge-pagination-current')).toBe('4');
    act(() => ref.current?.firstPage());
    expect(text('.oge-pagination-current')).toBe('1');
    expect(ref.current?.hasPreviousPage()).toBe(false);
    expect(ref.current?.pageCount()).toBe(5);

    rerender(<OgePagination ref={ref} itemCount={undefined} pageSize={20} />);
    act(() => ref.current?.lastPage()); // no-op
    expect(text('.oge-pagination-indicator')).toBe('Page 1');
    act(() => ref.current?.nextPage());
    expect(text('.oge-pagination-indicator')).toBe('Page 2');
  });

  it('focus() moves to the first enabled control', () => {
    const ref = createRef<OgePaginationHandle>();
    render(
      <OgePagination ref={ref} pageIndex={1} itemCount={97} pageSize={20} />,
    );
    act(() => ref.current?.focus());
    expect(document.activeElement).toBe(navButtons()[0]);
  });

  it('messages override via prop and via the config provider', () => {
    render(
      <OgePaginationConfigProvider
        config={{ maxButtons: 5, messages: { paginationLabel: 'Sayfalama' } }}
      >
        <OgePagination
          itemCount={400}
          pageSize={20}
          messages={{ nextPage: 'Sonraki' }}
        />
      </OgePaginationConfigProvider>,
    );
    expect(
      document.querySelector('.oge-pagination-nav')?.getAttribute('aria-label'),
    ).toBe('Sayfalama');
    expect(navButtons()[1].getAttribute('aria-label')).toBe('Sonraki');
    // config maxButtons 5 → window of 5 slots
    expect(
      document.querySelectorAll(
        '.oge-pagination-page, .oge-pagination-ellipsis',
      ),
    ).toHaveLength(5);
  });

  it('survives a StrictMode remount', () => {
    render(
      <StrictMode>
        <OgePagination itemCount={97} pageSize={20} />
      </StrictMode>,
    );
    expect(pageButtons()).toHaveLength(5);
  });
});

describe('<OgePagination> a11y composition', () => {
  function mount(pageIndex = 10) {
    return render(
      <OgePagination
        defaultPageIndex={pageIndex}
        itemCount={400}
        pageSize={20}
        pageSizes={[10, 20, 'all']}
        showInfo
        showFirstLastButtons
        showJumpToPageInput
      />,
    );
  }

  it('renders a labeled nav landmark', () => {
    mount();
    const nav = document.querySelector('nav.oge-pagination-nav');
    expect(nav?.getAttribute('aria-label')).toBe('Pagination');
  });

  it('exactly one aria-current="page" that follows clicks', () => {
    mount();
    const current = (): HTMLElement[] =>
      Array.from(document.querySelectorAll('[aria-current="page"]'));
    expect(current()).toHaveLength(1);
    expect(current()[0].textContent?.trim()).toBe('11');
    const target = pageButtons().find(
      (b) => b.textContent?.trim() === '12',
    ) as HTMLButtonElement;
    fireEvent.click(target);
    expect(current()).toHaveLength(1);
    expect(current()[0].textContent?.trim()).toBe('12');
  });

  it('every icon button and numeric button carries an accessible name', () => {
    mount();
    const all = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.oge-pagination-btn'),
    );
    for (const button of all) {
      const name =
        button.getAttribute('aria-label') || button.textContent?.trim();
      expect(name, button.outerHTML).toBeTruthy();
    }
    // icon buttons additionally mirror the label as a hover tooltip (dx hint)
    for (const button of navButtons()) {
      expect(button.getAttribute('title')).toBe(
        button.getAttribute('aria-label'),
      );
    }
    // numeric buttons announce "Page N"
    expect(
      document
        .querySelector('.oge-pagination-current')
        ?.getAttribute('aria-label'),
    ).toBe('Page 11');
  });

  it('the ellipsis is a non-interactive aria-hidden span', () => {
    mount();
    const ellipses = Array.from(
      document.querySelectorAll<HTMLElement>('.oge-pagination-ellipsis'),
    );
    expect(ellipses).toHaveLength(2);
    for (const ellipsis of ellipses) {
      expect(ellipsis.tagName).toBe('SPAN');
      expect(ellipsis.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('the info range lives in an aria-live region', () => {
    mount();
    expect(
      document.querySelector('.oge-pagination-info')?.getAttribute('aria-live'),
    ).toBe('polite');
  });

  it('select and jump input have visible label association', () => {
    mount();
    const sizes = document.querySelector(
      'label.oge-pagination-sizes',
    ) as HTMLLabelElement;
    expect(sizes.querySelector('select')).toBeTruthy();
    expect(sizes.textContent).toContain('Items per page');
    const jump = document.querySelector(
      'label.oge-pagination-jump',
    ) as HTMLLabelElement;
    expect(jump.querySelector('input')).toBeTruthy();
    expect(jump.textContent).toContain('Go to page');
  });
});
