import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { OGE_DEFAULT_GRID_MESSAGES } from '@oge-ui/behavior';
import { en, type OgeLocalePack } from '@oge-ui/locales';
import { de } from '@oge-ui/locales/de';
import { tr } from '@oge-ui/locales/tr';
import { OgeGridConfigProvider, useOgeGridConfig } from '@oge-ui/react-grid';
import { useOgeInputsConfig } from '@oge-ui/react-inputs';
import { useOgePaginationConfig } from '@oge-ui/react-navigation';
import { OgeLocaleProvider } from './locale-provider';

function Probe() {
  const grid = useOgeGridConfig();
  const inputs = useOgeInputsConfig();
  const pagination = useOgePaginationConfig();
  return (
    <ul>
      <li data-testid="noData">{grid.messages.noData}</li>
      <li data-testid="ne">{grid.messages.operators.ne}</li>
      <li data-testid="gridLocale">{grid.locale}</li>
      <li data-testid="inputsLocale">{inputs.locale}</li>
      <li data-testid="next">{pagination.messages.nextPage}</li>
      <li data-testid="rowHeight">{grid.rowHeight}</li>
    </ul>
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

describe('<OgeLocaleProvider>', () => {
  it('applies one pack to every MIT family (StrictMode)', () => {
    render(
      <StrictMode>
        <OgeLocaleProvider pack={tr}>
          <Probe />
        </OgeLocaleProvider>
      </StrictMode>,
    );
    expect(text('noData')).toBe(tr.grid?.noData);
    expect(text('gridLocale')).toBe('tr');
    expect(text('inputsLocale')).toBe('tr');
    expect(text('next')).toBe(tr.navigation?.pagination?.nextPage);
  });

  it('keeps English for keys the pack lacks, nested blocks included', () => {
    const partial: OgeLocalePack = {
      locale: 'tr',
      dir: 'ltr',
      grid: { operators: { eq: 'Eşittir' } },
    };
    render(
      <OgeLocaleProvider pack={partial}>
        <Probe />
      </OgeLocaleProvider>,
    );
    expect(text('noData')).toBe(OGE_DEFAULT_GRID_MESSAGES.noData);
    expect(text('ne')).toBe(OGE_DEFAULT_GRID_MESSAGES.operators.ne);
  });

  it('switches language when the pack changes; inner providers still apply', () => {
    const { rerender } = render(
      <OgeLocaleProvider pack={en}>
        <OgeGridConfigProvider config={{ rowHeight: 28 }}>
          <Probe />
        </OgeGridConfigProvider>
      </OgeLocaleProvider>,
    );
    expect(text('noData')).toBe(OGE_DEFAULT_GRID_MESSAGES.noData);
    rerender(
      <OgeLocaleProvider pack={de}>
        <OgeGridConfigProvider config={{ rowHeight: 28 }}>
          <Probe />
        </OgeGridConfigProvider>
      </OgeLocaleProvider>,
    );
    expect(text('noData')).toBe(de.grid?.noData);
    expect(text('rowHeight')).toBe('28');
  });
});
