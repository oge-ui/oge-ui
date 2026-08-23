import { fireEvent, render, screen } from '@testing-library/react';
import { OgeFileUploader } from './file-uploader';
import { OgeUploadDropZone } from './upload-drop-zone';
import { OgeUploadTrigger } from './upload-trigger';

function makeFile(name: string): File {
  return new File([new Uint8Array(4)], name, { type: 'text/plain' });
}

/** jsdom has no DataTransfer — a structural stand-in is enough for the engine. */
function transferWith(files: File[]) {
  return {
    types: ['Files'],
    files,
    items: [],
    dropEffect: 'none',
  };
}

describe('OgeUploadDropZone / OgeUploadTrigger', () => {
  it('feeds the uploader registered under the zone name', () => {
    render(
      <>
        <OgeUploadDropZone zone="attachments" data-testid="zone">
          Drop here
        </OgeUploadDropZone>
        <OgeFileUploader dropZone="attachments" uploadMode="select" />
      </>,
    );
    const zone = screen.getByText('Drop here');
    expect(zone).toHaveClass('oge-upload-external-zone');

    const transfer = transferWith([makeFile('panel.txt')]);
    fireEvent.dragEnter(zone, { dataTransfer: transfer });
    expect(zone).toHaveClass('oge-upload-external-zone-over');
    fireEvent.dragLeave(zone);
    expect(zone).not.toHaveClass('oge-upload-external-zone-over');

    fireEvent.drop(zone, { dataTransfer: transfer });
    return screen.findByText('panel.txt').then((row) => {
      expect(row).toBeInTheDocument();
    });
  });

  it('the trigger opens the uploader dialog and is disabled until one registers', () => {
    const { rerender } = render(
      <OgeUploadTrigger zone="later">Attach</OgeUploadTrigger>,
    );
    const button = screen.getByRole('button', { name: 'Attach' });
    expect(button).toBeDisabled();

    rerender(
      <>
        <OgeUploadTrigger zone="later">Attach</OgeUploadTrigger>
        <OgeFileUploader dropZone="later" uploadMode="select" />
      </>,
    );
    expect(button).toBeEnabled();
    const click = vi.spyOn(HTMLInputElement.prototype, 'click');
    fireEvent.click(button);
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
