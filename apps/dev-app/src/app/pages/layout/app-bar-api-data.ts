import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/app-bar/src/** and
 * packages/behavior/src/lib/layout/app-bar-core.ts — keep in sync with the
 * source TSDoc when the public API changes.
 */
export const OGE_APP_BAR_API: ApiSections = {
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
      ],
    },
  ],
  types: [
    {
      title: 'Section slots',
      entries: [
        {
          name: 'OgeAppBarStart',
          type: '[ogeAppBarStart]',
          description:
            'Attribute marker moving an element into the start section (a menu button, a logo).',
        },
        {
          name: 'OgeAppBarCenter',
          type: '[ogeAppBarCenter]',
          description:
            'Moves an element into the center section explicitly — rendered before unmarked content, which lands there too.',
        },
        {
          name: 'OgeAppBarEnd',
          type: '[ogeAppBarEnd]',
          description:
            'Moves an element into the end section (actions, an avatar).',
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
        name: 'provideOgeAppBarConfig(config)',
        type: '(config: OgeAppBarConfigInput | (() => OgeAppBarConfigInput)) => Provider',
        description:
          'Application- or component-scoped defaults for <code>position</code>, <code>positionMode</code>, <code>color</code> and <code>size</code>. There is deliberately no <code>messages</code> block: the bar renders no user-facing strings.',
      },
      {
        name: 'OGE_APP_BAR_CONFIG',
        type: 'InjectionToken<OgeAppBarConfig>',
        description:
          'The token behind <code>provideOgeAppBarConfig()</code>, with <code>OGE_DEFAULT_APP_BAR_CONFIG</code> as its factory default.',
      },
    ],
  },
];

export const OGE_APP_BAR_CONFIG_API: ApiSections = {
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
