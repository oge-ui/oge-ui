import { StrictMode } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OgePresentation } from './presentation';

const deck = new Uint8Array(
  readFileSync(
    resolve(
      __dirname,
      '../../../../spreadsheet-engine/testing/corpus/pptx/slides.pptx',
    ),
  ),
);

describe('<OgePresentation>', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:picture');
    URL.revokeObjectURL = vi.fn();
  });

  async function open(extra = {}) {
    const onLoaded = vi.fn();
    const view = render(
      <OgePresentation source={deck} onLoaded={onLoaded} {...extra} />,
    );
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    return { ...view, onLoaded };
  }

  it('draws the current slide and a thumbnail per slide', async () => {
    const { container, onLoaded } = await open();
    expect(onLoaded.mock.calls[0][0].slideCount).toBe(5);
    expect(container.querySelectorAll('.oge-presentation-thumb')).toHaveLength(
      5,
    );
    const stage = container.querySelector('.oge-presentation-stage');
    expect(stage?.getAttribute('aria-label')).toBe('Slide 1 of 5');
    expect(stage?.querySelector('text')?.textContent).toBe('Quarterly results');
  });

  it('navigates with buttons and the keyboard', async () => {
    const onSlideIndexChange = vi.fn();
    const { container } = await open({ onSlideIndexChange });
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(onSlideIndexChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(container.querySelector('.oge-presentation') as Element, {
      key: 'End',
    });
    expect(onSlideIndexChange).toHaveBeenLastCalledWith(4);
  });

  it('follows a controlled index', async () => {
    const { container, rerender } = await open({ slideIndex: 0 });
    await act(async () => {
      rerender(<OgePresentation source={deck} slideIndex={3} />);
    });
    expect(
      container
        .querySelector('.oge-presentation-stage')
        ?.getAttribute('aria-label'),
    ).toBe('Slide 4 of 5');
    expect(
      container
        .querySelector('.oge-presentation-stage image')
        ?.getAttribute('href'),
    ).toBe('blob:picture');
  });

  it('survives StrictMode', async () => {
    const onLoaded = vi.fn();
    const { container } = render(
      <StrictMode>
        <OgePresentation source={deck} onLoaded={onLoaded} />
      </StrictMode>,
    );
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    expect(
      container.querySelector('.oge-presentation-stage text'),
    ).not.toBeNull();
  });

  it('shows the empty state without a source', () => {
    render(<OgePresentation />);
    expect(screen.getByRole('status').textContent).toContain('No presentation');
  });
});
