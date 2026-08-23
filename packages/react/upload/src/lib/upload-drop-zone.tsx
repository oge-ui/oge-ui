'use client';

import {
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type ReactNode,
} from 'react';
import {
  DragDepthCounter,
  dataTransferHasFiles,
  dropEffectFor,
  readDataTransferFiles,
} from '@oge-ui/behavior';
import { useUploadZoneTarget } from './upload-registry';

export interface OgeUploadDropZoneProps {
  /** The `dropZone` name of the uploader that should receive the files. */
  zone: string;
  disabled?: boolean;
  /** Reports the hover state — bind it to your own styling. */
  onOverChange?: (over: boolean) => void;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Turns an element into a drop target for an uploader elsewhere on the page
 * — the React render of the Angular `[ogeUploadDropZone]` directive:
 *
 * ```tsx
 * <OgeUploadDropZone zone="attachments">Drop anywhere in this panel</OgeUploadDropZone>
 * <OgeFileUploader dropZone="attachments" />
 * ```
 *
 * dx calls it `dropZone`, Kendo `zoneId`, Syncfusion `dropArea`; all three
 * exist because the drop surface is often the whole page or a panel that has
 * nothing to do with the uploader's own markup. The element carries the same
 * `.oge-upload-external-zone` / `-over` classes the Angular directive sets.
 */
export function OgeUploadDropZone({
  zone,
  disabled = false,
  onOverChange,
  className,
  style,
  children,
}: OgeUploadDropZoneProps) {
  const target = useUploadZoneTarget(zone);
  const depth = useRef(new DragDepthCounter());
  const [over, setOverState] = useState(false);
  const setOver = (next: boolean): void => {
    setOverState(next);
    onOverChange?.(next);
  };

  const accepts = (event: ReactDragEvent): boolean =>
    !disabled && target !== null && dataTransferHasFiles(event.dataTransfer);

  const onDragEnter = (event: ReactDragEvent): void => {
    if (!accepts(event)) return;
    event.preventDefault();
    if (depth.current.enter()) setOver(true);
  };

  const onDragOver = (event: ReactDragEvent): void => {
    if (!accepts(event)) return;
    // Without this the browser never fires `drop` on the element at all.
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = dropEffectFor('copy');
    }
  };

  const onDragLeave = (): void => {
    if (depth.current.leave()) setOver(false);
  };

  const onDrop = (event: ReactDragEvent): void => {
    if (!accepts(event)) return;
    event.preventDefault();
    depth.current.reset();
    setOver(false);
    if (!target) return;
    void readDataTransferFiles(event.dataTransfer, {
      directory: target.directory,
    }).then((files) => {
      if (files.length > 0) target.addFiles(files);
    });
  };

  return (
    <div
      className={[
        'oge-upload-external-zone',
        over && 'oge-upload-external-zone-over',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
    </div>
  );
}
