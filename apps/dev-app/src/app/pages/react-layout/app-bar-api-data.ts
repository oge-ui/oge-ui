import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/layout/src/lib/app-bar.tsx — keep in sync
 * with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../layout/app-bar-api-data.ts`: the same props,
 * the `start` / `center` / `end` node props in place of the Angular attribute
 * slots, the context provider in place of the DI one.
 */
export const OGE_REACT_APP_BAR_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'position',
          type: "'top' | 'bottom'",
          default: "config ?? 'top'",
          description:
            'Edge the bar belongs to — decides the hairline and shadow side, the sticky / fixed edge and which safe-area inset pads it.',
        },
        {
          name: 'positionMode',
          type: "'static' | 'sticky' | 'fixed'",
          default: "config ?? 'static'",
          description:
            '<code>sticky</code> sticks to its edge of the nearest scroll container, <code>fixed</code> pins to the viewport (full width, inline safe-area insets). Both use the <code>--oge-z-app-bar</code> layer and pad with <code>env(safe-area-inset-*)</code> as a floor.',
        },
        {
          name: 'color',
          type: "'default' | 'primary' | 'inverse' | 'transparent'",
          default: "config ?? 'default'",
          description:
            'Surface: the page surface with a hairline, the accent, the dark tooltip surface, or none.',
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "config ?? 'md'",
          description: 'Density preset — 48 / 56 / 64 px rows.',
        },
        {
          name: 'elevated',
          type: 'boolean',
          default: 'false',
          description: 'Draws a shadow on the bar&rsquo;s content edge.',
        },
        {
          name: 'landmark',
          type: "'none' | 'banner' | 'contentinfo' | 'navigation' | 'region'",
          default: "'none'",
          description:
            'Landmark role, only on request: <code>banner</code> for the one page header, <code>contentinfo</code> for a page footer, <code>navigation</code> / <code>region</code> (with <code>ariaLabel</code>) for a named secondary bar.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name of the landmark — written only when <code>landmark</code> is not <code>none</code> (a role-less element may not carry one).',
        },
        {
          name: 'centerAlign',
          type: "'start' | 'center'",
          default: "'start'",
          description: 'Alignment of the center section&rsquo;s content.',
        },
        {
          name: 'start',
          type: 'ReactNode',
          description:
            'Start section content — the counterpart of <code>[ogeAppBarStart]</code>.',
        },
        {
          name: 'center',
          type: 'ReactNode',
          description:
            'Center section content rendered before <code>children</code> — the counterpart of <code>[ogeAppBarCenter]</code>.',
        },
        {
          name: 'end',
          type: 'ReactNode',
          description:
            'End section content — the counterpart of <code>[ogeAppBarEnd]</code>.',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description:
            'Center section content (the title) — like unmarked projected content in Angular.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description: 'Applied to the <code>.oge-app-bar</code> root.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Section props',
      entries: [
        {
          name: 'OgeAppBarProps',
          type: 'interface',
          description:
            'Props of <code>&lt;OgeAppBar&gt;</code>, including the <code>start</code> / <code>center</code> / <code>end</code> section nodes.',
        },
      ],
    },
    {
      title: 'Vocabulary',
      entries: [
        {
          name: 'OgeAppBarPosition',
          type: "'top' | 'bottom'",
          description: 'Edge union.',
        },
        {
          name: 'OgeAppBarPositionMode',
          type: "'static' | 'sticky' | 'fixed'",
          description: 'Positioning union.',
        },
        {
          name: 'OgeAppBarColor',
          type: "'default' | 'primary' | 'inverse' | 'transparent'",
          description: 'Surface union.',
        },
        {
          name: 'OgeAppBarSize',
          type: "'sm' | 'md' | 'lg'",
          description: 'Density union.',
        },
        {
          name: 'OgeAppBarLandmark',
          type: "'none' | 'banner' | 'contentinfo' | 'navigation' | 'region'",
          description: 'Landmark union.',
        },
        {
          name: 'OgeAppBarCenterAlign',
          type: "'start' | 'center'",
          description: 'Center alignment union.',
        },
      ],
    },
  ],
};

const CONFIG_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'OgeAppBarConfigProvider',
        type: '(props: { config?: OgeAppBarConfigInput; children?: ReactNode }) =&gt; JSX.Element',
        description:
          'Subtree defaults for <code>position</code>, <code>positionMode</code>, <code>color</code> and <code>size</code> — the React counterpart of <code>provideOgeAppBarConfig()</code>. There is deliberately no <code>messages</code> block: the bar renders no user-facing strings.',
      },
      {
        name: 'useOgeAppBarConfig()',
        type: '() =&gt; OgeAppBarConfig',
        description:
          'Reads the resolved config of the nearest provider, merged over <code>OGE_DEFAULT_APP_BAR_CONFIG</code>.',
      },
    ],
  },
];

export const OGE_REACT_APP_BAR_CONFIG_API: ApiSections = {
  properties: CONFIG_GROUPS,
  types: [
    {
      entries: [
        {
          name: 'OgeAppBarConfig / OgeAppBarConfigInput',
          type: 'interface',
          description:
            'The config shape and its partial input; <code>OGE_DEFAULT_APP_BAR_CONFIG</code> is the resolved default.',
        },
      ],
    },
  ],
};
