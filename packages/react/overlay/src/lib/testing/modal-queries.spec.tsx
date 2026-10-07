import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { resetScrollLockForTests } from '@oge-ui/behavior';
import { OgeModal } from '../modal';
import { OgeModalProvider, useOgeModals } from '../modal-provider';
import { getAllModals, getModal } from './modal-queries';

function NoteEditor() {
  const [opened, setOpened] = useState(true);
  const [result, setResult] = useState('');
  const [answer, setAnswer] = useState('');
  const modals = useOgeModals();
  return (
    <>
      <OgeModal<string>
        title="Edit note"
        opened={opened}
        onOpenedChange={setOpened}
        onClosed={(event) => setResult(String(event.result ?? event.reason))}
        renderFooter={({ close }) => (
          <>
            <button type="button" onClick={() => close('cancel')}>
              Cancel
            </button>
            <button type="button" onClick={() => close('save')}>
              Save
            </button>
          </>
        )}
      >
        <p>Change the note text.</p>
      </OgeModal>
      <button type="button" onClick={() => setOpened(true)}>
        Reopen
      </button>
      <button
        type="button"
        onClick={() =>
          void modals
            .confirm({
              title: 'Delete row?',
              message: 'This cannot be undone.',
              okText: 'Delete',
            })
            .then((ok) => setAnswer(String(ok)))
        }
      >
        Delete
      </button>
      <output data-testid="result">{result}</output>
      <output data-testid="answer">{answer}</output>
    </>
  );
}

function setup() {
  return render(
    <StrictMode>
      <OgeModalProvider>
        <NoteEditor />
      </OgeModalProvider>
    </StrictMode>,
  );
}

describe('getModal', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    resetScrollLockForTests();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
  });

  it('reads the title, role, content and buttons', () => {
    setup();
    const modal = getModal(document.body, { title: /note/i });
    expect(modal.isOpen()).toBe(true);
    expect(modal.getRole()).toBe('dialog');
    expect(modal.isBusy()).toBe(false);
    expect(modal.getContentText()).toBe('Change the note text.');
    expect(modal.getButtonTexts()).toEqual(['Cancel', 'Save']);
    expect(getAllModals(document.body, { title: 'Other' })).toEqual([]);
  });

  it('closes through a footer button', async () => {
    setup();
    const modal = getModal();
    modal.clickButton('Save');
    await waitFor(() => expect(modal.isOpen()).toBe(false));
    expect(screen.getByTestId('result')).toHaveTextContent('save');
    expect(() => getModal()).toThrow(/expected one open modal, found 0/);
  });

  it('closes with Escape, the close button and the backdrop', async () => {
    setup();
    getModal().pressEscape();
    await waitFor(() => expect(getAllModals()).toHaveLength(0));
    expect(screen.getByTestId('result')).toHaveTextContent('escape');

    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    getModal().close();
    await waitFor(() => expect(getAllModals()).toHaveLength(0));

    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    getModal().clickBackdrop();
    await waitFor(() => expect(getAllModals()).toHaveLength(0));
    expect(screen.getByTestId('result')).toHaveTextContent('backdrop');
  });

  it('finds dialog-helper modals rendered into document.body', async () => {
    setup();
    getModal().pressEscape();
    await waitFor(() => expect(getAllModals()).toHaveLength(0));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = getModal(document.body, { title: 'Delete row?' });
    expect(dialog.getContentText()).toContain('This cannot be undone.');
    expect(dialog.getButtonTexts()).toEqual(['Cancel', 'Delete']);
    dialog.clickButton('Delete');
    await waitFor(() =>
      expect(screen.getByTestId('answer')).toHaveTextContent('true'),
    );
  });
});
