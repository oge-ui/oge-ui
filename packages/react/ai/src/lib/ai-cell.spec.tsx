import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render } from '@testing-library/react';
import {
  createOgeAiColumn,
  type OgeAiRequest,
  type OgeAiTransport,
} from '@oge-ui/behavior';
import { OgeAiCell } from './ai-cell';
import { OgeAiConfigProvider } from './ai-config';

interface Review {
  id: number;
  text: string;
}

const ROWS: Review[] = [
  { id: 1, text: 'Loved it' },
  { id: 2, text: 'Awful' },
];

class ManualTransport implements OgeAiTransport {
  readonly requests: OgeAiRequest[] = [];
  private release: ((text: string) => void)[] = [];
  complete(request: OgeAiRequest) {
    this.requests.push(request);
    return new Promise<{ text: string }>((resolve) => {
      this.release.push((text) => resolve({ text }));
    });
  }
  async reply(values: { key: number; value: unknown }[]): Promise<void> {
    await act(async () => {
      this.release.shift()?.(JSON.stringify({ values }));
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

function makeColumn() {
  return createOgeAiColumn<Review>({
    prompt: 'Classify the sentiment',
    inputs: ['text'],
    keyField: 'id',
    values: [
      { value: 'pos', text: 'Positive' },
      { value: 'neg', text: 'Negative' },
    ],
  });
}

describe('<OgeAiCell>', () => {
  it('batches cells into one request and renders the same markup as the Angular cell — under StrictMode', async () => {
    const column = makeColumn();
    const transport = new ManualTransport();
    // the grid row's own (React) click handler — the retry must not reach it
    const bubbled = vi.fn();
    const { container } = render(
      <StrictMode>
        <OgeAiConfigProvider config={{ transport, locale: 'en-US' }}>
          <div onClick={bubbled}>
            {ROWS.map((row) => (
              <OgeAiCell key={row.id} column={column} row={row} />
            ))}
          </div>
        </OgeAiConfigProvider>
      </StrictMode>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const cells = () => [...container.querySelectorAll('.oge-ai-cell')];
    expect(transport.requests).toHaveLength(1);
    expect(cells()[0]).toHaveAttribute('aria-busy', 'true');

    await transport.reply([
      { key: 1, value: 'pos' },
      { key: 2, value: 'nope' },
    ]);
    expect(cells()[0]).toHaveTextContent('Positive');
    expect(cells()[1]).toHaveClass('oge-ai-cell-failed');

    await act(async () => {
      fireEvent.click(cells()[1].querySelector('.oge-ai-cell-retry')!);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(bubbled).not.toHaveBeenCalled();
    expect(transport.requests).toHaveLength(2);
    await transport.reply([{ key: 2, value: 'neg' }]);
    expect(cells()[1]).toHaveTextContent('Negative');
  });

  it('server-renders the skeleton without requesting', () => {
    const column = makeColumn();
    const html = renderToString(<OgeAiCell column={column} row={ROWS[0]} />);
    expect(html).toContain('oge-ai-cell-skeleton');
    expect(column.state(1).status).toBe('idle');
  });
});
