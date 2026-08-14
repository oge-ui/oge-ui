import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/layout/src/lib/card.tsx — keep in sync
 * with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../layout/card-api-data.ts` (the parity gate
 * diffs the two member by member): the same props, the Angular attribute slot
 * directives as node props, and the context provider in place of the DI one.
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
          'Chrome preset: <code>outlined</code> (border), <code>raised</code> (rests on the <code>--oge-shadow-card</code> token), <code>filled</code> (tinted surface) or <code>flat</code> (no chrome — for a card nested in another surface). Falls back to <code>&lt;OgeCardConfigProvider config={{ stylingMode }}&gt;</code>.',
      },
      {
        name: 'orientation',
        type: "'vertical' | 'horizontal'",
        default: "'vertical'",
        description:
          '<code>horizontal</code> turns the card into a two-column grid with the <code>media</code> node spanning the inline-start column, sized by <code>--oge-card-media-size</code>. Falls back to the config provider.',
      },
      {
        name: 'size',
        type: "'sm' | 'md' | 'lg'",
        default: "'md'",
        description:
          'Density preset — scales the section padding and type ramp together (<code>--oge-card-pad</code> is the per-card escape hatch). Falls back to the config provider.',
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
      {
        name: 'children',
        type: 'ReactNode',
        description:
          'The card content — the React counterpart of the default <code>&lt;ng-content&gt;</code> projection.',
      },
      {
        name: 'className / style',
        type: 'string | CSSProperties',
        description:
          'Merged onto the card host. <code>className</code> is appended to the generated <code>oge-card*</code> classes; the Angular host takes <code>class</code>/<code>style</code> natively.',
      },
    ],
  },
  {
    title: 'Accessibility contract',
    entries: [
      {
        name: '(no role, no clickable prop)',
        type: '—',
        description:
          'There is no WAI-ARIA card pattern, so the card renders no role and no <code>tabIndex</code>, and ships no clickable-card API — wrapping the card in a link or button is the <code>nested-interactive</code> trap. Add <code>role="article"</code> / <code>role="region"</code> yourself, and make a card clickable with one primary <code>&lt;a&gt;</code> in the content plus a CSS-stretched hit area.',
      },
    ],
  },
];

const SLOT_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'media',
        type: 'ReactNode',
        description:
          'The full-bleed media element (<code>[ogeCardMedia]</code> in Angular) — an <code>&lt;img&gt;</code>, <code>&lt;video&gt;</code> or a wrapper carrying <code>className="oge-card-media"</code>. Sized by consumer CSS (<code>aspect-ratio</code>, <code>block-size</code>); there is deliberately no size prop.',
      },
      {
        name: 'avatar',
        type: 'ReactNode',
        description:
          'The round image before the header titles (<code>[ogeCardAvatar]</code>), rendered with <code>className="oge-card-avatar"</code>.',
      },
      {
        name: 'headerActions',
        type: 'ReactNode',
        description:
          'Controls at the inline end of the header row (<code>[ogeCardHeaderActions]</code>), in a node with <code>className="oge-card-header-actions"</code>. Real controls in the Tab sequence — the card never wraps them in anything interactive.',
      },
      {
        name: 'actions',
        type: 'ReactNode',
        description:
          'The action row under the content (<code>[ogeCardActions]</code>). Give it <code>className="oge-card-actions"</code> plus one of <code>oge-card-actions-center</code> / <code>-end</code> / <code>-stretched</code> — the alignment the Angular directive takes as its <code>align</code> input.',
      },
      {
        name: 'footer',
        type: 'ReactNode',
        description:
          'A divided strip on the header surface after the actions (<code>[ogeCardFooter]</code>, <code>className="oge-card-footer"</code>) — metadata rather than commands.',
      },
      {
        name: 'oge-card-separator',
        type: 'class',
        description:
          'A full-bleed hairline between content sections — put the class on an <code>&lt;hr&gt;</code> inside <code>children</code>.',
      },
    ],
  },
];

const CONFIG_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'OgeCardConfigProvider',
        type: '(props: { config?: OgeCardConfigInput; children?: ReactNode }) =&gt; JSX.Element',
        description:
          'Subtree defaults for <code>stylingMode</code>, <code>orientation</code> and <code>size</code> — the React counterpart of <code>provideOgeCardConfig()</code>. There is deliberately no <code>messages</code> block: the card renders no user-facing strings and no interactive chrome of its own.',
      },
      {
        name: 'useOgeCardConfig()',
        type: '() =&gt; OgeCardConfig',
        description:
          'Reads the resolved config of the nearest provider, merged over <code>OGE_DEFAULT_CARD_CONFIG</code> — the hook behind the component, exported for cards you compose yourself.',
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
        description: 'Status rail union for the <code>severity</code> prop.',
      },
      {
        name: 'OgeCardActionsAlign',
        type: "'start' | 'center' | 'end' | 'stretched'",
        description:
          'Justification vocabulary of the action row. The React <code>actions</code> node is plain markup, so this types your own state and maps to the <code>oge-card-actions-*</code> class.',
      },
      {
        name: 'OgeCardProps',
        type: 'interface',
        description:
          'Props of <code>&lt;OgeCard&gt;</code>, including the slot nodes.',
      },
      {
        name: 'OgeCardConfig / OgeCardConfigInput',
        type: '{ stylingMode?; orientation?; size? }',
        description:
          'The config shape and its partial input for <code>&lt;OgeCardConfigProvider&gt;</code>; <code>OGE_DEFAULT_CARD_CONFIG</code> is the resolved default.',
      },
    ],
  },
];

export const OGE_REACT_CARD_API: ApiSections = {
  properties: CARD_PROPERTY_GROUPS,
  types: TYPE_GROUPS,
};

export const OGE_REACT_CARD_SLOTS_API: ApiSections = {
  properties: SLOT_GROUPS,
};

export const OGE_REACT_CARD_CONFIG_API: ApiSections = {
  properties: CONFIG_GROUPS,
};
