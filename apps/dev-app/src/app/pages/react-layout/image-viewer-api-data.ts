import type { ApiSections } from '../../shared/api-reference';
import {
  IMAGE_ITEM_FIELDS,
  IMAGE_VIEWER_KEYS,
  IMAGE_VIEWER_MESSAGES_DOC,
} from '../layout/image-viewer-api-data';

/**
 * Hand-compiled from packages/react/layout/src/lib/image-viewer.tsx — keep in
 * sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../layout/image-viewer-api-data.ts`: the same
 * props, `onX` callbacks for the outputs and a ref handle for the methods.
 */

export const OGE_REACT_IMAGE_VIEWER_API: ApiSections = {
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
          type: 'number | undefined',
          description:
            'The shown image — controlled together with <code>onIndexChange</code>; left out, the viewer keeps its own. Changing image resets zoom, pan and rotation.',
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
          description: 'Per-instance overrides of the config catalog.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description: 'Added to the root <code>.oge-image-viewer</code>.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeImageViewerHandle)',
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
          name: 'onIndexChange',
          type: '(index: number) => void',
          description:
            'The shown image changed — the controlled half of <code>index</code>.',
        },
        {
          name: 'onZoomChange',
          type: '(zoom: number) => void',
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
          type: 'role="group", tabIndex={0}',
          description: `With focus on the viewer: ${IMAGE_VIEWER_KEYS} A polite live region announces each image.`,
        },
        {
          name: 'Pointer',
          type: 'drag · wheel · double click · pinch',
          description:
            'While zoomed, dragging pans (clamped so the image never leaves the stage); the wheel zooms, a double click toggles fit and 2×, two fingers pinch. Full screen uses the Fullscreen API and follows <code>fullscreenchange</code>, so Esc keeps the state in sync.',
        },
        {
          name: 'OgeImageViewerProps',
          type: 'interface',
          description: 'The props above.',
        },
        {
          name: 'OgeImageViewerHandle',
          type: '{ next(); previous(); resetView() }',
          description: 'What a <code>ref</code> reaches.',
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

export const OGE_REACT_IMAGE_VIEWER_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgeImageViewerConfigProvider',
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
            'Defaults for the matching props. <code>useOgeImageViewerConfig()</code> reads the resolved value.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeImageViewerConfigProvider',
          type: '({ config?, children }) => JSX.Element',
          description: 'Subtree-scoped defaults.',
        },
        {
          name: 'useOgeImageViewerConfig',
          type: '() => OgeImageViewerConfig',
          description: 'Reads the resolved config.',
        },
        {
          name: 'OGE_DEFAULT_IMAGE_VIEWER_CONFIG',
          type: 'OgeImageViewerConfig',
          description: 'The defaults.',
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
