import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useRef } from 'react';
import type {
  OgeUploadAdapter,
  OgeUploadCallbacks,
  OgeUploadPart,
  OgeUploadRequest,
} from '@oge-ui/behavior';
import {
  OgeFileUploader,
  type OgeFileUploaderHandle,
  type OgeFileUploaderProps,
} from './file-uploader';
import { OgeUploadTransportProvider } from './upload-config';

function makeFile(name: string, size = 10, type = 'text/plain'): File {
  return new File([new Uint8Array(size)], name, { type });
}

/** A transport that records every request and settles on command. */
function fakeTransport() {
  const calls: {
    parts: readonly OgeUploadPart[];
    request: OgeUploadRequest;
    callbacks: OgeUploadCallbacks;
  }[] = [];
  const adapter: OgeUploadAdapter = {
    send(parts, request, callbacks) {
      calls.push({ parts, request, callbacks });
      return { abort: () => undefined };
    },
  };
  return { adapter, calls };
}

function Host(
  props: Partial<OgeFileUploaderProps> & {
    onHandle?: (h: OgeFileUploaderHandle) => void;
  },
) {
  const { onHandle, ...rest } = props;
  const ref = useRef<OgeFileUploaderHandle>(null);
  return (
    <OgeFileUploader
      ref={(h) => {
        ref.current = h;
        if (h) onHandle?.(h);
      }}
      {...rest}
    />
  );
}

const input = () =>
  document.querySelector('.oge-upload-input') as HTMLInputElement;

function pick(files: File[]): void {
  const element = input();
  Object.defineProperty(element, 'files', { value: files, configurable: true });
  fireEvent.change(element);
}

const rows = () => document.querySelectorAll('.oge-upload-file');

describe('OgeFileUploader', () => {
  it('renders the accessible chrome: group, file input, button drop zone', () => {
    render(<Host />);
    const group = screen.getByRole('group', { name: 'File upload' });
    expect(group).toHaveClass('oge-upload');
    expect(input()).toHaveAttribute('type', 'file');
    expect(
      screen.getByRole('button', {
        name: 'Drop files here, or press Enter to browse',
      }),
    ).toHaveClass('oge-upload-dropzone');
    expect(screen.getByText('No files selected')).toHaveClass(
      'oge-upload-empty',
    );
  });

  it('lists picked files, reports the selection and the value', () => {
    const onFilesSelected = vi.fn();
    const onValueChange = vi.fn();
    render(
      <Host
        uploadMode="select"
        onFilesSelected={onFilesSelected}
        onValueChange={onValueChange}
      />,
    );
    pick([makeFile('one.txt'), makeFile('two.txt')]);
    expect(rows()).toHaveLength(2);
    expect(screen.getByText('one.txt')).toBeInTheDocument();
    expect(onFilesSelected).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'dialog' }),
    );
    expect(onValueChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(File)]),
    );
    expect(
      screen.getByRole('list', { name: 'Selected files (2)' }),
    ).toBeInTheDocument();
    // the live region announced the addition
    expect(document.querySelector('.oge-upload-live')?.textContent).toContain(
      '2 files added',
    );
  });

  it('keeps a rejected file on the list with its reason', () => {
    const onFileRejected = vi.fn();
    render(
      <Host
        uploadMode="select"
        allowedFileExtensions={['.png']}
        onFileRejected={onFileRejected}
      />,
    );
    pick([makeFile('notes.txt')]);
    const row = rows()[0];
    expect(row).toHaveClass('oge-upload-file-invalid');
    expect(row).toHaveAttribute('aria-invalid', 'true');
    expect(row.querySelector('.oge-upload-file-error')?.textContent).toContain(
      'File type is not allowed',
    );
    expect(onFileRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: [expect.objectContaining({ kind: 'extension' })],
      }),
    );
  });

  it('uploads through the transport and patches the row as it settles', () => {
    const { adapter, calls } = fakeTransport();
    const onUploaded = vi.fn();
    const onUploading = vi.fn();
    render(
      <Host
        uploadUrl="/api/upload"
        uploadAdapter={adapter}
        uploadHeaders={{ Authorization: 'Bearer demo' }}
        onUploading={onUploading}
        onUploaded={onUploaded}
      />,
    );
    pick([makeFile('report.pdf', 100)]);
    expect(calls).toHaveLength(1);
    expect(calls[0].request.url).toBe('/api/upload');
    expect(calls[0].request.headers).toEqual({ Authorization: 'Bearer demo' });
    expect(onUploading).toHaveBeenCalledTimes(1);
    expect(rows()[0]).toHaveClass('oge-upload-file-uploading');

    act(() => calls[0].callbacks.progress(50, 100));
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '50',
    );

    act(() =>
      calls[0].callbacks.done({ response: { id: 7 }, httpStatus: 201 }),
    );
    expect(rows()[0]).toHaveClass('oge-upload-file-uploaded');
    expect(onUploaded).toHaveBeenCalledWith(
      expect.objectContaining({ response: { id: 7 }, httpStatus: 201 }),
    );
    expect(screen.getByText(/Uploaded/)).toBeInTheDocument();
  });

  it('the default transport comes from the provider', () => {
    const { adapter, calls } = fakeTransport();
    render(
      <OgeUploadTransportProvider adapter={adapter}>
        <Host uploadUrl="/api/upload" />
      </OgeUploadTransportProvider>,
    );
    pick([makeFile('a.txt')]);
    expect(calls).toHaveLength(1);
  });

  it('useButtons waits for the Upload button and Clear empties the list', () => {
    const { adapter, calls } = fakeTransport();
    const onCleared = vi.fn();
    render(
      <Host
        uploadUrl="/api/upload"
        uploadAdapter={adapter}
        uploadMode="useButtons"
        onCleared={onCleared}
      />,
    );
    pick([makeFile('a.txt')]);
    expect(calls).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    expect(calls).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(rows()).toHaveLength(0);
    expect(onCleared).toHaveBeenCalledTimes(1);
  });

  it('removes the focused row from the keyboard and moves the roving tab stop', () => {
    render(<Host uploadMode="select" />);
    pick([makeFile('one.txt'), makeFile('two.txt')]);
    const list = screen.getByRole('list');
    const first = rows()[0] as HTMLElement;
    expect(first).toHaveAttribute('tabindex', '0');
    expect(rows()[1]).toHaveAttribute('tabindex', '-1');

    first.focus();
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(rows()[1]).toHaveAttribute('tabindex', '0');
    expect(rows()[1]).toHaveFocus();

    fireEvent.keyDown(list, { key: 'Delete' });
    expect(rows()).toHaveLength(1);
    expect(screen.getByText('one.txt')).toBeInTheDocument();
  });

  it('render props replace the row and the drop zone', () => {
    render(
      <Host
        uploadMode="select"
        renderDropZone={({ over }) => <em>zone {over ? 'hot' : 'idle'}</em>}
        renderFile={({ file, size }) => (
          <strong>
            {file.name} · {size}
          </strong>
        )}
      />,
    );
    expect(screen.getByText('zone idle')).toBeInTheDocument();
    pick([makeFile('big.bin', 2048)]);
    // the size arrives pre-formatted (locale-dependent decimal separator)
    expect(screen.getByText(/big\.bin · 2[.,]0 KB/)).toBeInTheDocument();
  });

  it('exposes the imperative handle', () => {
    let handle!: OgeFileUploaderHandle;
    render(<Host uploadMode="select" onHandle={(h) => (handle = h)} />);
    act(() => handle.addFiles([makeFile('api.txt')]));
    expect(handle.files).toHaveLength(1);
    expect(handle.fileCount).toBe(1);
    expect(handle.valid).toBe(true);
    act(() => handle.removeFile(handle.files[0].uid));
    expect(rows()).toHaveLength(0);
  });

  it('a controlled value written from the outside replaces the list', () => {
    const { rerender } = render(<Host uploadMode="select" value={[]} />);
    expect(rows()).toHaveLength(0);
    rerender(<Host uploadMode="select" value={[makeFile('seeded.txt')]} />);
    expect(screen.getByText('seeded.txt')).toBeInTheDocument();
  });

  it('works under StrictMode (a fresh machine survives the remount)', () => {
    render(
      <StrictMode>
        <Host uploadMode="select" />
      </StrictMode>,
    );
    pick([makeFile('strict.txt')]);
    expect(rows()).toHaveLength(1);
  });
});
