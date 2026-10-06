import type { OgeActionSheetItem } from '@oge-ui/overlay';

/** Lucide-style icon paths (24×24, stroked) shared by both demo views. */
export const ACTION_SHEET_ICONS = {
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13',
  link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  flag: 'M4 22V4M4 4h13l-2 4 2 4H4',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
} as const;

/** The photo actions of the basics demo. */
export const ACTION_SHEET_PHOTO_ACTIONS: readonly OgeActionSheetItem[] = [
  { key: 'share', text: 'Share', icon: ACTION_SHEET_ICONS.share },
  { key: 'link', text: 'Copy link', icon: ACTION_SHEET_ICONS.link },
  { key: 'edit', text: 'Edit', icon: ACTION_SHEET_ICONS.edit },
  {
    key: 'delete',
    text: 'Delete photo',
    icon: ACTION_SHEET_ICONS.trash,
    destructive: true,
  },
];

/** The file actions of the groups demo: a disabled row and a bottom group. */
export const ACTION_SHEET_FILE_ACTIONS: readonly OgeActionSheetItem[] = [
  {
    key: 'download',
    text: 'Download',
    description: 'PDF, 2.4 MB',
    icon: ACTION_SHEET_ICONS.download,
  },
  {
    key: 'share',
    text: 'Share with team',
    description: 'Only owners can share this file',
    icon: ACTION_SHEET_ICONS.share,
    disabled: true,
  },
  {
    key: 'report',
    text: 'Report a problem',
    icon: ACTION_SHEET_ICONS.flag,
    group: 'bottom',
  },
  {
    key: 'delete',
    text: 'Move to trash',
    icon: ACTION_SHEET_ICONS.trash,
    destructive: true,
    group: 'bottom',
  },
];
