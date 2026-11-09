import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OgeWordDocument } from './word-document';
import { OgeWordDocumentConfigProvider } from './word-document-config';

const file = new Uint8Array(
  readFileSync(
    resolve(
      __dirname,
      '../../../../spreadsheet-engine/testing/corpus/docx/document.docx',
    ),
  ),
);

describe('<OgeWordDocument>', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:picture');
    URL.revokeObjectURL = vi.fn();
  });

  async function open(extra = {}) {
    const onLoaded = vi.fn();
    const view = render(
      <OgeWordDocument source={file} onLoaded={onLoaded} {...extra} />,
    );
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    return { ...view, onLoaded };
  }

  it('lays out the pages and draws the first ones', async () => {
    const { container, onLoaded } = await open();
    const pages = container.querySelectorAll('.oge-word-page');
    expect(pages.length).toBe(onLoaded.mock.calls[0][0].pageCount);
    expect(pages[0].querySelector('text')).not.toBeNull();
  });

  it('moves between pages', async () => {
    const onPageIndexChange = vi.fn();
    await open({ onPageIndexChange });
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageIndexChange).toHaveBeenLastCalledWith(1);
  });

  it('survives StrictMode', async () => {
    const onLoaded = vi.fn();
    const { container } = render(
      <StrictMode>
        <OgeWordDocument source={file} onLoaded={onLoaded} />
      </StrictMode>,
    );
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    expect(container.querySelector('.oge-word-page text')).not.toBeNull();
  });

  it('takes its text from the provider', async () => {
    const onLoaded = vi.fn();
    const { container } = render(
      <OgeWordDocumentConfigProvider
        config={{ messages: { pageLabel: 'Sayfa {current}/{total}' } }}
      >
        <OgeWordDocument source={file} onLoaded={onLoaded} />
      </OgeWordDocumentConfigProvider>,
    );
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    expect(container.querySelector('[aria-live]')?.textContent).toContain(
      'Sayfa 1/',
    );
  });

  it('shows the empty state without a source', () => {
    render(<OgeWordDocument />);
    expect(screen.getByRole('status').textContent).toContain('No document');
  });
});
