import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/layout/src/lib/{avatar,badge}.tsx — keep
 * in sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../layout/avatar-api-data.ts` (the parity gate
 * diffs the two member by member): the same props, `onImageLoaded` /
 * `onImageFailed` for the outputs, `children` for the projected content and
 * the context providers in place of the DI ones.
 */
export const OGE_REACT_AVATAR_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'name',
          type: 'string | undefined',
          description:
            'Person or entity name — the accessible name and the initials source (first letter of the first and last word, upper-cased in the locale).',
        },
        {
          name: 'src',
          type: 'string | undefined',
          description:
            'Image URL. A failed load falls back to the initials, then the icon; a new <code>src</code> gets a fresh attempt.',
        },
        {
          name: 'initials',
          type: 'string | undefined',
          description:
            'Explicit initials, overriding the ones derived from <code>name</code>.',
        },
        {
          name: 'icon',
          type: 'string | undefined',
          default: 'person glyph',
          description:
            'SVG path data (<code>d</code>, 24×24 viewBox) of the last fallback; <code>OGE_AVATAR_ICON_PATH</code> by default.',
        },
        {
          name: 'size',
          type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'",
          default: "config → group → 'md'",
          description: 'Size preset — 24 / 32 / 40 / 48 / 64 px.',
        },
        {
          name: 'shape',
          type: "'circle' | 'rounded' | 'square'",
          default: "config → group → 'circle'",
          description:
            'Outline; <code>rounded</code> uses <code>--oge-radius-lg</code>.',
        },
        {
          name: 'status',
          type: "'online' | 'away' | 'busy' | 'offline' | undefined",
          description:
            'Presence dot (<code>aria-hidden</code>) — the presence label joins the accessible name through the <code>withStatus</code> message. Offline is a hollow ring, so the state never rides on colour alone.',
        },
        {
          name: 'decorative',
          type: 'boolean',
          default: 'false',
          description:
            'The name is already visible beside it: the host becomes <code>aria-hidden</code> with no role, so it is not read twice.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name override; otherwise <code>name</code>, else the catalog&rsquo;s <code>avatar</code> (the host is <code>role="img"</code>).',
        },
        {
          name: 'imageLoading',
          type: "'lazy' | 'eager'",
          default: "'lazy'",
          description: 'Native <code>loading</code> of the image.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'BCP 47 locale of the initials casing; <code>undefined</code> = config <code>locale</code> → the runtime default.',
        },

        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description:
            'Host styling, merged onto the <code>.oge-avatar</code> element.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onImageLoaded',
          type: '(event: OgeAvatarImageLoadedEvent) =&gt; void',
          description: 'The image at <code>src</code> loaded.',
        },
        {
          name: 'onImageFailed',
          type: '(event: OgeAvatarImageFailedEvent) =&gt; void',
          description:
            'The image at <code>src</code> failed; the avatar now shows its initials or icon.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeAvatarSize',
          type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'",
          description: 'Size vocabulary.',
        },
        {
          name: 'OgeAvatarShape',
          type: "'circle' | 'rounded' | 'square'",
          description: 'Shape vocabulary.',
        },
        {
          name: 'OgeAvatarStatus',
          type: "'online' | 'away' | 'busy' | 'offline'",
          description: 'Presence vocabulary.',
        },
        {
          name: 'OgeAvatarImageLoadedEvent',
          type: '{ src: string; event: Event }',
          description: 'Payload of <code>onImageLoaded</code>.',
        },
        {
          name: 'OgeAvatarImageFailedEvent',
          type: '{ src: string; event: Event }',
          description: 'Payload of <code>onImageFailed</code>.',
        },
        {
          name: 'OgeAvatarProps',
          type: 'interface',
          description: 'Props of <code>&lt;OgeAvatar&gt;</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_AVATAR_GROUP_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeAvatarItem[]',
          default: '[]',
          description:
            'Data-driven avatars, rendered before any <code>&lt;OgeAvatar&gt;</code> children.',
        },
        {
          name: 'max',
          type: 'number | undefined',
          description:
            'Rendered circles <strong>including</strong> the "+N" one (minimum 2), so the row never grows past it; <code>undefined</code> renders all.',
        },
        {
          name: 'total',
          type: 'number | undefined',
          description:
            'Full population of a partially loaded list — the members not in the list count into "+N".',
        },
        {
          name: 'size',
          type: 'OgeAvatarSize | undefined',
          default: "config → 'md'",
          description:
            'Size of every avatar in the group (a child&rsquo;s own <code>size</code> wins).',
        },
        {
          name: 'shape',
          type: 'OgeAvatarShape | undefined',
          default: "config → 'circle'",
          description:
            'Shape of every avatar in the group (a child&rsquo;s own <code>shape</code> wins).',
        },
        {
          name: 'overlap',
          type: 'boolean',
          default: 'true',
          description:
            'Stack the avatars with a ring in the page surface; <code>false</code> spaces them.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name; the host becomes <code>role="group"</code> once it has one. The surplus avatar is a <code>role="img"</code> named by the <code>overflow</code> message ("4 more").',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'BCP 47 locale of the "+N" digits and its plural label; <code>undefined</code> = config → the runtime default.',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description:
            '<code>&lt;OgeAvatar&gt;</code> children, rendered after <code>items</code>; the ones beyond the window are not rendered.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description:
            'Host styling, merged onto the <code>.oge-avatar-group</code> element.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeAvatarItem',
          type: '{ key?; name?; src?; initials?; status?; icon? }',
          description: 'One avatar of the data-driven <code>items</code>.',
        },
        {
          name: 'OgeAvatarGroupProps',
          type: 'interface',
          description: 'Props of <code>&lt;OgeAvatarGroup&gt;</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_BADGE_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'value',
          type: 'number | string | null | undefined',
          default: 'null',
          description:
            'A count (digits in the locale), a short text shown verbatim, or <code>null</code> — no badge.',
        },
        {
          name: 'max',
          type: 'number | undefined',
          default: 'config → 99',
          description:
            'Counts above it show the <code>overflow</code> pattern ("99+").',
        },
        {
          name: 'dot',
          type: 'boolean',
          default: 'false',
          description:
            'A small dot instead of a value; described by the <code>dot</code> message.',
        },
        {
          name: 'showZero',
          type: 'boolean',
          default: 'false',
          description:
            'Show a <code>0</code> count — hidden by default, "nothing new" needs no badge.',
        },
        {
          name: 'invisible',
          type: 'boolean',
          default: 'false',
          description: 'Force-hide the badge, e.g. while a count loads.',
        },
        {
          name: 'severity',
          type: "'danger' | 'accent' | 'success' | 'warning' | 'neutral' | undefined",
          default: "config → 'danger'",
          description:
            'Colour; <code>danger</code> paints the <code>--oge-badge-bg</code> / <code>--oge-badge-color</code> tokens.',
        },
        {
          name: 'size',
          type: "'sm' | 'md'",
          default: "'md'",
          description: 'Size preset of the count badge (the dot has one size).',
        },
        {
          name: 'position',
          type: "'top-end' | 'top-start' | 'bottom-end' | 'bottom-start' | undefined",
          default: "config → 'top-end'",
          description:
            'Corner of the wrapped content — logical, so RTL mirrors it.',
        },
        {
          name: 'overlap',
          type: "'rectangle' | 'circle'",
          default: "'rectangle'",
          description:
            '<code>circle</code> pulls the badge onto the outline of a round host (an avatar) instead of its bounding box.',
        },
        {
          name: 'description',
          type: 'string | undefined',
          description:
            'Accessible text override. The default reads the catalog: "5 new items", "More than 99 new items", "New" for a dot, a text value itself. An overlay badge points the wrapped control&rsquo;s <code>aria-describedby</code> at it; a standalone one renders it visually hidden.',
        },
        {
          name: 'announce',
          type: 'boolean',
          default: 'false',
          description:
            'Speak later changes of the description through a polite live region. The initial value is never announced.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'BCP 47 locale of the digits and the plural description; <code>undefined</code> = config → the runtime default.',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description:
            'The content the badge overlays (its anchor); without children the badge is standalone.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description:
            'Host styling, merged onto the <code>.oge-badge</code> element.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeBadgeValue',
          type: 'number | string | null | undefined',
          description: 'What a badge shows.',
        },
        {
          name: 'OgeBadgeSeverity',
          type: "'danger' | 'accent' | 'success' | 'warning' | 'neutral'",
          description: 'Colour vocabulary.',
        },
        {
          name: 'OgeBadgePosition',
          type: "'top-end' | 'top-start' | 'bottom-end' | 'bottom-start'",
          description: 'Logical corner vocabulary.',
        },
        {
          name: 'OgeBadgeOverlap',
          type: "'rectangle' | 'circle'",
          description: 'Shape of the wrapped content.',
        },
        {
          name: 'OgeBadgeSize',
          type: "'sm' | 'md'",
          description: 'Size vocabulary.',
        },
        {
          name: 'OgeBadgeProps',
          type: 'interface',
          description: 'Props of <code>&lt;OgeBadge&gt;</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_AVATAR_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgeAvatarConfigProvider',
      entries: [
        {
          name: 'messages',
          type: 'OgeAvatarMessages',
          description:
            'Every user-facing string: <code>avatar</code> (fallback name, "Avatar"), <code>withStatus</code> ("{name} ({status})"), the presence labels <code>online</code> / <code>away</code> / <code>busy</code> / <code>offline</code>, and <code>overflow</code> — the ICU plural naming the surplus avatar ("{count, plural, one {# more} other {# more}}").',
        },
        {
          name: 'size / shape',
          type: '—',
          description:
            'Defaults for the matching inputs of the avatar and the group.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'Default locale of the initials casing and the "+N" digits (<code>&lt;OgeLocaleProvider&gt;</code> sets it from the pack).',
        },
      ],
    },
    {
      title: 'OgeBadgeConfigProvider',
      entries: [
        {
          name: 'messages',
          type: 'OgeBadgeMessages',
          description:
            'Every user-facing string: <code>count</code> (ICU plural, "5 new items"), <code>overflow</code> ("{max}+"), <code>overflowCount</code> ("More than 99 new items") and <code>dot</code> ("New").',
        },
        {
          name: 'max / severity / position',
          type: '—',
          description: 'Defaults for the matching inputs.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'Default locale of the digits and the plural description.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeAvatarConfig / OgeAvatarConfigInput',
          type: 'interface',
          description:
            'Resolved config and its partial input (<code>messages</code> merged one level deep).',
        },
        {
          name: 'OgeAvatarMessages',
          type: 'interface',
          description:
            'The avatar catalog (<code>layout.avatar</code> in the locale packs).',
        },
        {
          name: 'OgeBadgeConfig / OgeBadgeConfigInput',
          type: 'interface',
          description: 'Resolved config and its partial input.',
        },
        {
          name: 'OgeBadgeMessages',
          type: 'interface',
          description:
            'The badge catalog (<code>layout.badge</code> in the locale packs).',
        },
        {
          name: 'useOgeAvatarConfig / useOgeBadgeConfig',
          type: 'hook',
          description: 'Read the resolved config of the nearest provider.',
        },
        {
          name: 'OGE_DEFAULT_AVATAR_CONFIG / OGE_DEFAULT_AVATAR_MESSAGES / OGE_DEFAULT_BADGE_CONFIG / OGE_DEFAULT_BADGE_MESSAGES',
          type: 'const',
          description:
            'The English defaults (from <code>&#64;oge-ui/behavior</code>).',
        },
      ],
    },
  ],
};
