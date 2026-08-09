import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/src/lib/card/** — keep in sync with the
 * source TSDoc when the public API changes.
 */

const CARD_PROPERTY_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'header',
        type: 'string | undefined',
        description:
          'Header title. Named after the PrimeNG input rather than <code>title</code> — a static <code>title</code> attribute would double as a native tooltip.',
      },
      {
        name: 'subheader',
        type: 'string | undefined',
        description:
          'Line rendered under <code>header</code> in the muted color.',
      },
      {
        name: 'stylingMode',
        type: "'outlined' | 'raised' | 'filled' | 'flat'",
        default: "'outlined'",
        description:
          'Chrome preset: <code>outlined</code> (border), <code>raised</code> (rests on the <code>--oge-shadow-card</code> token), <code>filled</code> (tinted surface) or <code>flat</code> (no chrome — for a card nested in another surface). Falls back to <code>provideOgeCardConfig({ stylingMode })</code>.',
      },
      {
        name: 'orientation',
        type: "'vertical' | 'horizontal'",
        default: "'vertical'",
        description:
          '<code>horizontal</code> turns the card into a two-column grid with the <code>[ogeCardMedia]</code> element spanning the inline-start column, sized by <code>--oge-card-media-size</code>. Falls back to <code>provideOgeCardConfig({ orientation })</code>.',
      },
      {
        name: 'size',
        type: "'sm' | 'md' | 'lg'",
        default: "'md'",
        description:
          'Density preset — scales the section padding and type ramp together (<code>--oge-card-pad</code> is the per-card escape hatch). Falls back to <code>provideOgeCardConfig({ size })</code>.',
      },
      {
        name: 'severity',
        type: "'accent' | 'success' | 'warning' | 'danger' | undefined",
        default: 'undefined',
        description:
          'Colored status rail on the inline-start edge — the toast&rsquo;s rail idiom on a static surface. <code>undefined</code> renders no rail.',
      },
      {
        name: 'interactive',
        type: 'boolean',
        default: 'false',
        description:
          'Purely visual affordance for the documented clickable-card pattern: a hover/focus-within lift and a keyboard focus ring on the surface. Adds <strong>no</strong> role, tabindex or wrapper — pair it with one primary <code>&lt;a&gt;</code> in the content.',
      },
      {
        name: 'loading',
        type: 'boolean',
        default: 'false',
        description:
          'Replaces the content and action row with a shimmer skeleton and marks the card <code>aria-busy</code>. Header, media and footer stay, so the card keeps its footprint while the data arrives.',
      },
    ],
  },
  {
    title: 'Accessibility contract',
    entries: [
      {
        name: '(no role, no clickable input)',
        type: '—',
        description:
          'There is no WAI-ARIA card pattern, so the card renders no role and no <code>tabindex</code>, and ships no clickable-card API — wrapping the card in a link or button is the <code>nested-interactive</code> trap. Add <code>role="article"</code> / <code>role="region"</code> on the host yourself, and make a card clickable with one primary <code>&lt;a&gt;</code> in the content plus a CSS-stretched hit area.',
      },
    ],
  },
];

const SLOT_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: '[ogeCardMedia]',
        type: 'OgeCardMedia',
        description:
          'Marks the full-bleed media element — an <code>&lt;img&gt;</code>, <code>&lt;video&gt;</code> or a wrapper. Sized by consumer CSS (<code>aspect-ratio</code>, <code>block-size</code>); there is deliberately no size input.',
      },
      {
        name: '[ogeCardAvatar]',
        type: 'OgeCardAvatar',
        description:
          'The round image before the header titles — the counterpart of Material&rsquo;s <code>mat-card-avatar</code>.',
      },
      {
        name: '[ogeCardHeaderActions]',
        type: 'OgeCardHeaderActions',
        description:
          'Controls at the inline end of the header row. Real controls in the Tab sequence — the card never wraps them in anything interactive.',
      },
      {
        name: '[ogeCardActions]',
        type: 'OgeCardActions',
        description:
          'The action row under the content. Its <code>align</code> input takes <code>&#39;start&#39; | &#39;center&#39; | &#39;end&#39; | &#39;stretched&#39;</code> (default <code>&#39;start&#39;</code>) — the Kendo superset of Material&rsquo;s two values.',
      },
      {
        name: '[ogeCardFooter]',
        type: 'OgeCardFooter',
        description:
          'A divided strip on the header surface after the actions — metadata rather than commands.',
      },
      {
        name: '[ogeCardSeparator]',
        type: 'OgeCardSeparator',
        description:
          'A full-bleed hairline between content sections — put it on an <code>&lt;hr&gt;</code> inside the default projection.',
      },
    ],
  },
];

const CONFIG_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'provideOgeCardConfig(config)',
        type: '(config: OgeCardConfigInput) => Provider',
        description:
          'Application- or component-scoped defaults for <code>stylingMode</code>, <code>orientation</code> and <code>size</code>. There is deliberately no <code>messages</code> block: the card renders no user-facing strings and no interactive chrome of its own.',
      },
      {
        name: 'OGE_CARD_CONFIG',
        type: 'InjectionToken<OgeCardConfig>',
        description:
          'The token behind <code>provideOgeCardConfig()</code>, with <code>OGE_DEFAULT_CARD_CONFIG</code> as its factory default.',
      },
    ],
  },
];

const TYPE_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'OgeCardStylingMode',
        type: "'outlined' | 'raised' | 'filled' | 'flat'",
        description:
          'Chrome preset union — the layout family&rsquo;s <code>stylingMode</code> vocabulary plus Material&rsquo;s <code>raised</code>.',
      },
      {
        name: 'OgeCardOrientation',
        type: "'vertical' | 'horizontal'",
        description: 'Section flow union.',
      },
      {
        name: 'OgeCardSize',
        type: "'sm' | 'md' | 'lg'",
        description: 'Density preset union.',
      },
      {
        name: 'OgeCardSeverity',
        type: "'accent' | 'success' | 'warning' | 'danger'",
        description: 'Status rail union for the <code>severity</code> input.',
      },
      {
        name: 'OgeCardActionsAlign',
        type: "'start' | 'center' | 'end' | 'stretched'",
        description: 'Justification of the <code>[ogeCardActions]</code> row.',
      },
      {
        name: 'OgeCardConfig / OgeCardConfigInput',
        type: '{ stylingMode?; orientation?; size? }',
        description:
          'The config shape and its partial input for <code>provideOgeCardConfig()</code>.',
      },
    ],
  },
];

export const OGE_CARD_API: ApiSections = {
  properties: CARD_PROPERTY_GROUPS,
  types: TYPE_GROUPS,
};

export const OGE_CARD_SLOTS_API: ApiSections = {
  properties: SLOT_GROUPS,
};

export const OGE_CARD_CONFIG_API: ApiSections = {
  properties: CONFIG_GROUPS,
};
