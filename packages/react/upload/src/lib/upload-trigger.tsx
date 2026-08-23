'use client';

import type { ButtonHTMLAttributes } from 'react';
import { useUploadZoneTarget } from './upload-registry';

export interface OgeUploadTriggerProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'onClick'
> {
  /** The `dropZone` name of the uploader to open. */
  zone: string;
  disabled?: boolean;
}

/**
 * Opens an uploader's file dialog from a button somewhere else on the page —
 * the React render of the Angular `[ogeUploadTrigger]` directive (dx's
 * `dialogTrigger`):
 *
 * ```tsx
 * <OgeUploadTrigger zone="attachments">Attach files</OgeUploadTrigger>
 * <OgeFileUploader dropZone="attachments" />
 * ```
 *
 * Renders a real `<button>`, so the keyboard behaviour comes for free; it is
 * disabled until an uploader registers under that name.
 */
export function OgeUploadTrigger({
  zone,
  disabled = false,
  children,
  ...rest
}: OgeUploadTriggerProps) {
  const target = useUploadZoneTarget(zone);
  const unavailable = disabled || target === null;
  return (
    <button
      type="button"
      {...rest}
      disabled={unavailable}
      onClick={() => {
        if (!unavailable) target?.openFileDialog();
      }}
    >
      {children}
    </button>
  );
}
