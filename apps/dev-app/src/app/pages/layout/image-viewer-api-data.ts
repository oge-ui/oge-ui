import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/image-viewer/src/** and
 * packages/behavior/src/lib/layout/image-viewer-core.ts — keep in sync with
 * the source TSDoc when the public API changes.
 */

export const IMAGE_ITEM_FIELDS =
  '<code>src</code>, <code>alt</code> (read out, and shown when the file fails), <code>caption?</code> (under the image), <code>thumbnail?</code> (a smaller file for the strip, default <code>src</code>)';

export const IMAGE_VIEWER_KEYS =
  'Arrow Left / Right page (they pan while zoomed, as do Up / Down), Home / End and Page Up / Down jump, <kbd>+</kbd> / <kbd>-</kbd> zoom, <kbd>0</kbd> fits, <kbd>R</kbd> / <kbd>Shift+R</kbd> rotate and <kbd>F</kbd> toggles full screen.';

export const IMAGE_VIEWER_MESSAGES_DOC =
  'Every user-facing string: <code>label</code>, <code>previous</code>, <code>next</code>, <code>zoomIn</code>, <code>zoomOut</code>, <code>resetZoom</code>, <code>rotateLeft</code>, <code>rotateRight</code>, <code>fullscreen</code>, <code>exitFullscreen</code>, <code>thumbnails</code>, <code>empty</code>, and the templates <code>counter</code> (<code>{index} of {count}</code>), <code>zoomLevel</code> (<code>{zoom}%</code>) and <code>announce</code> (<code>{alt}, image {index} of {count}</code>, the live-region text). Translated in every <code>&#64;oge-ui/locales</code> pack (<code>layout.imageViewer</code>).';

export const OGE_IMAGE_VIEWER_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'images',
          type: 'readonly OgeImageViewerItem[] (required)',
          description: `The gallery. Fields: ${IMAGE_ITEM_FIELDS}. A new array keeps the index when it still fits.`,
        },
        {
          name: 'index',
          type: 'number (model)',
          default: '0',
          description:
            'The shown image — two-way. Changing image resets zoom, pan and rotation.',
        },
        {
          name: 'loop',
          type: 'boolean | undefined',
          default: 'config ?? false',
          description:
            'Pages from the last image to the first and back (buttons, keys, thumbnails stay direct).',
        },
        {
          name: 'maxZoom',
          type: 'number | undefined',
          default: 'config ?? 8',
          description:
            'Largest zoom factor (8 = 800 %). Zoom steps through 1, 1.5, 2, 3, 4, 6, 8; the wheel and pinch zoom smoothly, always around the pointer.',
        },
        {
          name: 'thumbnails',
          type: 'boolean',
          default: 'true',
          description:
            'The thumbnail strip under the image — shown for two images or more; the current one carries <code>aria-current</code>.',
        },
        {
          name: 'toolbar',
          type: 'boolean',
          default: 'true',
          description:
            'The toolbar: previous / counter / next, zoom out / level / zoom in / fit, rotate left / right and full screen. Without it the keyboard, the wheel, a double click and pinch still work.',
        },
        {
          name: 'messages',
          type: 'Partial<OgeImageViewerMessages>',
          default: '{}',
          description: 'Per-instance overrides of the config catalog.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'next()',
          type: '() => void',
          description:
            'Shows the next image (wraps only with <code>loop</code>).',
        },
        {
          name: 'previous()',
          type: '() => void',
          description:
            'Shows the previous image (wraps only with <code>loop</code>).',
        },
        {
          name: 'resetView()',
          type: '() => void',
          description: 'Back to fit: zoom 1, no pan, no rotation.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'indexChange',
          type: 'number',
          description: 'The banana half of <code>[(index)]</code>.',
        },
        {
          name: 'zoomChange',
          type: 'number',
          description:
            'The zoom factor changed (1 = fit) — from the toolbar, the keys, the wheel, a double click (fit ↔ 2×) or a two-finger pinch.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Interaction',
      entries: [
        {
          name: 'Keyboard',
          type: 'role="group", tabindex="0"',
          description: `With focus on the viewer: ${IMAGE_VIEWER_KEYS} A polite live region announces each image.`,
        },
        {
          name: 'Pointer',
          type: 'drag · wheel · double click · pinch',
          description:
            'While zoomed, dragging pans (clamped so the image never leaves the stage); the wheel zooms, a double click toggles fit and 2×, two fingers pinch. Full screen uses the Fullscreen API and follows <code>fullscreenchange</code>, so Esc keeps the state in sync.',
        },
        {
          name: 'OgeImageViewerItem',
          type: 'interface',
          description: `One image: ${IMAGE_ITEM_FIELDS}.`,
        },
        {
          name: 'OgeImageViewerCore',
          type: 'class (@oge-ui/behavior)',
          description:
            'The framework-free state machine both render layers drive: index, zoom, pan, rotation, full screen and the key map.',
        },
        {
          name: 'OgeImageViewerCoreOptions',
          type: '{ reactivity; messages; onIndexChange?; onZoomChange?; requestFullscreen? }',
          description:
            'What the core takes: a reactivity adapter, the catalog, and the callbacks a render layer wires to its outputs and to the Fullscreen API.',
        },
        {
          name: 'OGE_IMAGE_ZOOM_STEPS',
          type: 'readonly number[]',
          description: 'The zoom stops of the buttons and keys.',
        },
      ],
    },
  ],
};

export const OGE_IMAGE_VIEWER_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeImageViewerConfig()',
      entries: [
        {
          name: 'messages',
          type: 'OgeImageViewerMessages',
          description: IMAGE_VIEWER_MESSAGES_DOC,
        },
        {
          name: 'loop / maxZoom',
          type: '—',
          description:
            'Defaults for the matching inputs. Pass a function for a live config.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'provideOgeImageViewerConfig',
          type: '(config: OgeImageViewerConfigInput | (() => OgeImageViewerConfigInput)) => Provider',
          description:
            'Application- or component-scoped defaults; a function makes the config live.',
        },
        {
          name: 'OGE_IMAGE_VIEWER_CONFIG',
          type: 'InjectionToken<OgeImageViewerConfig>',
          description: 'The resolved config the viewer injects.',
        },
        {
          name: 'OGE_DEFAULT_IMAGE_VIEWER_CONFIG',
          type: 'OgeImageViewerConfig',
          description: 'The defaults (from <code>&#64;oge-ui/behavior</code>).',
        },
        {
          name: 'OGE_DEFAULT_IMAGE_VIEWER_MESSAGES',
          type: 'OgeImageViewerMessages',
          description: 'The English catalog.',
        },
        {
          name: 'resolveOgeImageViewerConfig',
          type: '(input?, base?) => OgeImageViewerConfig',
          description: 'Merges a partial config over a base (the defaults).',
        },
        {
          name: 'OgeImageViewerConfig',
          type: '{ messages: OgeImageViewerMessages; loop?: boolean; maxZoom?: number }',
          description: 'Resolved config shape.',
        },
        {
          name: 'OgeImageViewerConfigInput',
          type: 'Partial<OgeImageViewerConfig> with partial messages',
          description: 'What the provider accepts.',
        },
        {
          name: 'OgeImageViewerMessages',
          type: '{ label; previous; next; zoomIn; zoomOut; resetZoom; rotateLeft; rotateRight; fullscreen; exitFullscreen; thumbnails; counter; zoomLevel; announce; empty }',
          description: 'The image viewer catalog.',
        },
      ],
    },
  ],
};
