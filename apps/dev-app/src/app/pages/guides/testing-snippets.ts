/** Code samples rendered on the testing guide. */
import { demoSource } from '../../shared/demo-source';
import { reactDemoSource } from '../../shared/react-demo-source';

/** The screen the harness spec below drives — compiled by `docs-tools:typecheck`. */
export const HARNESS_COMPONENT = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton'],
    '@oge-ui/grid': ['OgeGrid', 'OgeColumn'],
    '@oge-ui/inputs': ['OgeSelectBox'],
    '@oge-ui/tabs': ['OgeTabPanel', 'OgeTab'],
  },
  helpers: { '@oge-ui/overlay': ['OgeModalService'] },
  selector: 'app-team',
  className: 'TeamPage',
  dataset: 'employees',
  template: `<oge-tab-panel>
  <oge-tab text="People">
    <oge-select-box label="Department" [items]="departments" [(value)]="department" />
    <oge-grid
      [data]="employees"
      keyField="id"
      [filterRow]="true"
      [paging]="{ pageSize: 3 }"
      selectionMode="checkbox"
    >
      <oge-column field="firstName" caption="First name" />
      <oge-column field="department" caption="Department" />
    </oge-grid>
    <oge-button text="Remove" (clicked)="remove()" />
  </oge-tab>
  <oge-tab text="Settings"><p>Notification settings</p></oge-tab>
</oge-tab-panel>`,
  body: `private readonly modals = inject(OgeModalService);
readonly departments = ['Engineering', 'Finance', 'Sales', 'Support'];
readonly department = signal<unknown>(null);
readonly removed = signal(false);

async remove(): Promise<void> {
  const ok = await this.modals.confirm({
    title: 'Remove people?',
    message: 'They lose access at once.',
    okText: 'Remove',
  });
  this.removed.set(ok);
}`,
});

export const HARNESS_SPEC = `// team.spec.ts — the CDK harnesses (npm i -D @angular/cdk)
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideOgeGridConfig } from '@oge-ui/grid';
import { OgeGridHarness } from '@oge-ui/grid/testing';
import { OgeSelectBoxHarness } from '@oge-ui/inputs/testing';
import { OgeModalHarness } from '@oge-ui/overlay/testing';
import { OgeTabsHarness } from '@oge-ui/tabs/testing';
import { TeamPage } from './team';

describe('TeamPage', () => {
  beforeEach(() => {
    // a zoneless TestBed waits for change detection, not for timers: apply
    // filter-row input at once instead of after the 300 ms debounce
    TestBed.configureTestingModule({
      providers: [provideOgeGridConfig({ filterDebounce: 0 })],
    });
    // popups position in requestAnimationFrame — stub it *asynchronously*
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 0) as unknown as number);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('filters, sorts, pages and selects people', async () => {
    const fixture = TestBed.createComponent(TeamPage);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const grid = await loader.getHarness(OgeGridHarness.with({ column: 'First name' }));

    await grid.sortBy('First name');
    expect(await grid.getSortDirection('First name')).toBe('asc');
    expect(await grid.getCellText(0, 'First name')).toBe('Ali');

    await grid.nextPage();
    expect(await grid.getCurrentPage()).toBe(2);

    await grid.setFilter('Department', 'Eng');
    expect(await grid.getCellTexts()).toEqual([['Ali', 'Engineering'], ['Mehmet', 'Engineering']]);

    await grid.toggleRowSelection(1);
    expect(await grid.getSelectedRowIndexes()).toEqual([1]);
  });

  it('picks a department and switches tabs', async () => {
    const fixture = TestBed.createComponent(TeamPage);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const department = await loader.getHarness(OgeSelectBoxHarness.with({ label: 'Department' }));
    await department.selectOption('Finance');
    expect(await department.getValue()).toBe('Finance');

    const tabs = await loader.getHarness(OgeTabsHarness);
    await tabs.selectTab('Settings');
    expect(await tabs.getPanelText()).toBe('Notification settings');
  });

  it('confirms the removal in a service dialog', async () => {
    const fixture = TestBed.createComponent(TeamPage);
    // OgeModalService renders into document.body, outside the fixture
    const root = TestbedHarnessEnvironment.documentRootLoader(fixture);
    fixture.componentInstance.remove();
    const dialog = await root.getHarness(OgeModalHarness.with({ title: 'Remove people?' }));
    expect(await dialog.getButtonTexts()).toEqual(['Cancel', 'Remove']);
    await dialog.clickButton('Remove');
    expect(fixture.componentInstance.removed()).toBe(true);
  });
});`;

/** The React screen the helper spec below drives — compiled like every React demo. */
export const RTL_COMPONENT = reactDemoSource({
  react: ['useState'],
  use: {
    '@oge-ui/react-grid': ['OgeGrid'],
    '@oge-ui/react-inputs': ['OgeSelectBox'],
    '@oge-ui/react-overlay': ['useOgeModals'],
    '@oge-ui/react-tabs': ['OgeTabPanel'],
  },
  name: 'Team',
  before: `const employees = [
  { id: 1, firstName: 'Ali', department: 'Engineering' },
  { id: 2, firstName: 'Ayşe', department: 'Sales' },
  { id: 3, firstName: 'Mehmet', department: 'Engineering' },
  { id: 4, firstName: 'Zeynep', department: 'Finance' },
  { id: 5, firstName: 'Emre', department: 'Support' },
];
const columns = [
  { field: 'firstName', caption: 'First name' },
  { field: 'department', caption: 'Department' },
];
const departments = ['Engineering', 'Finance', 'Sales', 'Support'];`,
  body: `const [department, setDepartment] = useState<unknown>(null);
const [removed, setRemoved] = useState(false);
const modals = useOgeModals(); // inside an <OgeModalProvider>
const remove = async () =>
  setRemoved(
    await modals.confirm({
      title: 'Remove people?',
      message: 'They lose access at once.',
      okText: 'Remove',
    }),
  );
const people = (
  <>
    <OgeSelectBox label="Department" items={departments} value={department} onValueChange={setDepartment} />
    <OgeGrid
      data={employees}
      keyField="id"
      columns={columns}
      filterRow
      paging={{ pageSize: 3 }}
      selectionMode="checkbox"
    />
    <button type="button" onClick={remove}>
      Remove
    </button>
    {removed ? <p>Removed</p> : null}
  </>
);`,
  jsx: `<OgeTabPanel
  tabs={[
    { text: 'People', content: people },
    { text: 'Settings', content: <p>Notification settings</p> },
  ]}
/>`,
});

export const RTL_SPEC = `// Team.test.tsx — React Testing Library helpers (@testing-library/dom is their peer)
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getGrid } from '@oge-ui/react-grid/testing';
import { getSelectBox, selectOption } from '@oge-ui/react-inputs/testing';
import { OgeModalProvider } from '@oge-ui/react-overlay';
import { getModal } from '@oge-ui/react-overlay/testing';
import { getTabs, selectTab } from '@oge-ui/react-tabs/testing';
import { Team } from './Team';

const renderTeam = () => render(<OgeModalProvider><Team /></OgeModalProvider>);

it('filters, sorts, pages and selects people', async () => {
  const { container } = renderTeam();
  const grid = getGrid(container, { column: 'First name' });

  grid.sortBy('First name');
  await waitFor(() => expect(grid.getSortDirection('First name')).toBe('asc'));

  grid.nextPage();
  await waitFor(() => expect(grid.getCurrentPage()).toBe(2));

  grid.setFilter('Department', 'Eng'); // the filter applies after the debounce
  await waitFor(() =>
    expect(grid.getCellTexts()).toEqual([['Ali', 'Engineering'], ['Mehmet', 'Engineering']]),
  );

  grid.toggleRowSelection(1);
  await waitFor(() => expect(grid.getSelectedRowIndexes()).toEqual([1]));
});

it('picks a department and switches tabs', async () => {
  const { container } = renderTeam();
  selectOption(screen.getByRole('combobox', { name: 'Department' }), 'Finance');
  await waitFor(() => expect(getSelectBox(container).getValue()).toBe('Finance'));

  selectTab('Settings');
  await waitFor(() => expect(getTabs(container).getPanelText()).toBe('Notification settings'));
});

it('confirms the removal in a dialog', async () => {
  renderTeam();
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  const dialog = getModal(document.body, { title: 'Remove people?' });
  expect(dialog.getButtonTexts()).toEqual(['Cancel', 'Remove']);
  dialog.clickButton('Remove');
  expect(await screen.findByText('Removed')).toBeInTheDocument();
});`;

export const ANGULAR_SPEC = `// orders.spec.ts — vitest (or Jasmine) + TestBed, zoneless
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeSelectBox } from '@oge-ui/inputs/select-box';

@Component({
  imports: [OgeSelectBox],
  template: \`<oge-select-box label="City" [items]="cities" [(value)]="city" />\`,
})
class Host {
  readonly cities = ['Lisbon', 'Oslo', 'Rome'];
  readonly city = signal<unknown>(null);
}

/** Render, let signals and effects flush, render again. */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('city picker', () => {
  beforeEach(() => {
    // popups position in requestAnimationFrame — stub it *asynchronously*;
    // a synchronous stub re-enters change detection mid-tick (NG0100)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 0) as unknown as number);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('is a combobox that starts closed', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('oge-select-box input');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
});`;

export const REACT_SPEC = `// Orders.test.tsx — vitest + jsdom + React Testing Library
import { fireEvent, render, screen } from '@testing-library/react';
import { OgeButton } from '@oge-ui/react-buttons';

it('fires onClick', () => {
  const onClick = vi.fn();
  render(<OgeButton text="Save" onClick={onClick} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

it('opens a select box from the keyboard', () => {
  render(<Cities />); // your component rendering <OgeSelectBox label="City" …>
  const combo = screen.getByRole('combobox');
  fireEvent.keyDown(combo, { key: 'ArrowDown' });
  expect(combo).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('listbox')).toBeInTheDocument();
});`;

export const VITEST_SETUP = `// vitest.setup.ts — React Testing Library under vitest's globals
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// RTL does not auto-clean under \`globals: true\` unless registered explicitly
afterEach(() => cleanup());`;

export const JSDOM_STUBS = `// only in the specs that need them — the gaps jsdom leaves
// <canvas>: signature pad, chart and Gantt image export
vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

// URL.createObjectURL / revokeObjectURL: upload thumbnails, file downloads
URL.createObjectURL = () => 'blob:test';
URL.revokeObjectURL = () => undefined;

// ResizeObserver: toolbars and breadcrumbs that collapse into overflow menus
class FakeResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal('ResizeObserver', FakeResizeObserver);

// matchMedia: prefers-reduced-motion, adaptive popups
window.matchMedia = (query: string) =>
  ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;

// PointerEvent: jsdom has no constructor — dispatch a MouseEvent with the pointer type
const down = new MouseEvent('pointerdown', { bubbles: true, button: 0 });
Object.defineProperty(down, 'pointerId', { value: 1 });
Object.defineProperty(down, 'pointerType', { value: 'mouse' });
element.dispatchEvent(down);`;

export const PLAYWRIGHT = `import { expect, test } from '@playwright/test';

// a fixed locale and time zone: number and date formatting follow the browser
test.use({ locale: 'en-US', timezoneId: 'UTC' });

test('select box: arrows and Enter pick a city', async ({ page }) => {
  await page.goto('/orders');
  const input = page.getByRole('combobox', { name: 'City' });
  await input.click();
  await input.press('ArrowDown');
  await input.press('Enter');
  // web-first assertions retry until the component has re-rendered
  await expect(input).toHaveValue('Lisbon');
  await expect(input).toBeFocused();
});

test('grid: sorting announces itself', async ({ page }) => {
  await page.goto('/orders');
  await page.getByRole('columnheader', { name: 'Total' }).click();
  // poll values that are not a locator state (a computed style, a count)
  await expect
    .poll(() => page.locator('.oge-row').count())
    .toBeGreaterThan(0);
  await expect(page.locator('[data-oge-live-announcer="polite"]')).toContainText(
    'Sorted by Total',
  );
});`;
