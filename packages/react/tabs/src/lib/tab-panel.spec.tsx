import { fireEvent, render, screen } from '@testing-library/react';
import { OgeTabPanel } from './tab-panel';
import type { OgeTabDefinition } from './tabs-types';

const tabByName = (name: string) => screen.getByRole('tab', { name });
const panels = (): HTMLElement[] =>
  Array.from(document.querySelectorAll('.oge-tab-panel-body'));

const TABS: OgeTabDefinition[] = [
  { key: 'a', text: 'Alpha', content: <p>Alpha body</p> },
  { key: 'b', text: 'Beta', content: <p>Beta body</p> },
  { key: 'c', text: 'Gamma', content: <p>Gamma body</p> },
];

describe('<OgeTabPanel>', () => {
  it('pairs every tab with its panel through the APG id wiring', () => {
    render(<OgeTabPanel tabs={TABS} />);
    const tab = tabByName('Alpha');
    const panel = document.getElementById(
      tab.getAttribute('aria-controls') as string,
    );
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('role', 'tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
  });

  it('shows only the selected panel and switches on click', () => {
    render(<OgeTabPanel tabs={TABS} />);
    expect(panels()[0].hidden).toBe(false);
    expect(panels()[1].hidden).toBe(true);
    fireEvent.click(tabByName('Beta'));
    expect(panels()[0].hidden).toBe(true);
    expect(panels()[1].hidden).toBe(false);
  });

  it('defers content until first activation', () => {
    render(<OgeTabPanel tabs={TABS} />);
    expect(screen.queryByText('Beta body')).toBeNull();
    fireEvent.click(tabByName('Beta'));
    expect(screen.getByText('Beta body')).toBeInTheDocument();
  });

  it('keepAlive keeps a rendered panel mounted while hidden', () => {
    render(<OgeTabPanel tabs={TABS} />);
    fireEvent.click(tabByName('Beta'));
    fireEvent.click(tabByName('Alpha'));
    // still in the DOM, just hidden
    expect(screen.getByText('Beta body')).toBeInTheDocument();
    expect(panels()[1].hidden).toBe(true);
  });

  it('keepAlive=false unmounts lazy content on deactivation', () => {
    render(<OgeTabPanel tabs={TABS} keepAlive={false} />);
    fireEvent.click(tabByName('Beta'));
    expect(screen.getByText('Beta body')).toBeInTheDocument();
    fireEvent.click(tabByName('Alpha'));
    expect(screen.queryByText('Beta body')).toBeNull();
  });

  it('deferRendering=false renders every panel up front', () => {
    render(<OgeTabPanel tabs={TABS} deferRendering={false} />);
    expect(screen.getByText('Beta body')).toBeInTheDocument();
    expect(screen.getByText('Gamma body')).toBeInTheDocument();
  });

  it('data-driven items render through renderTabContent', () => {
    render(
      <OgeTabPanel
        items={[{ key: 'x', text: 'Item' }]}
        renderTabContent={({ item, index }) => (
          <p>
            {item.text} #{index}
          </p>
        )}
      />,
    );
    expect(screen.getByText('Item #0')).toBeInTheDocument();
  });

  it('tabsPosition drives the host class and the strip orientation', () => {
    const { unmount } = render(
      <OgeTabPanel tabs={TABS} tabsPosition="bottom" />,
    );
    expect(document.querySelector('.oge-tab-panel-bottom')).not.toBeNull();
    unmount();

    render(<OgeTabPanel tabs={TABS} tabsPosition="start" />);
    expect(document.querySelector('.oge-tab-panel-start')).not.toBeNull();
    expect(screen.getByRole('tablist')).toHaveAttribute(
      'aria-orientation',
      'vertical',
    );
  });

  it('a declarative tab may render its own header', () => {
    render(
      <OgeTabPanel
        tabs={[
          {
            key: 'a',
            text: 'Alpha',
            renderHeader: ({ text, selected }) => (
              <span data-selected={selected}>{text.toUpperCase()}</span>
            ),
            content: <p>Body</p>,
          },
        ]}
      />,
    );
    expect(screen.getByText('ALPHA')).toHaveAttribute('data-selected', 'true');
  });
});
