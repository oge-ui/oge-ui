import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/timeline/src/** and
 * packages/behavior/src/lib/layout/timeline-core.ts — keep in sync with the
 * source TSDoc when the public API changes.
 */

const ITEM_FIELDS =
  '<code>key?</code>, <code>title?</code>, <code>description?</code>, <code>time?: Date | string</code>, <code>opposite?</code>, <code>severity?</code>, <code>variant?</code>, <code>icon?</code> (SVG path data)';

export const OGE_TIMELINE_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeTimelineItem[]',
          default: '[]',
          description: `The entries, in display order — the list's order is its meaning. Fields: ${ITEM_FIELDS}.`,
        },
        {
          name: 'orientation',
          type: "'vertical' | 'horizontal'",
          default: "config ?? 'vertical'",
          description:
            'Axis of the timeline. Horizontal entries share a row and the list scrolls inline when they do not fit.',
        },
        {
          name: 'align',
          type: "'start' | 'end' | 'alternate' | 'alternate-reverse'",
          default: "config ?? 'end'",
          description:
            'Side of the axis the content sits on — logical, so RTL mirrors. <code>alternate</code> starts at the end side and swaps per entry, <code>alternate-reverse</code> starts at the start side; both render the opposite column (the entry&rsquo;s <code>opposite</code>, else its time).',
        },
        {
          name: 'dateFormat',
          type: 'Intl.DateTimeFormatOptions | undefined',
          default: "config ?? { dateStyle: 'medium', timeStyle: 'short' }",
          description:
            'Format of <code>Date</code> times (through the core Intl cache). String times are shown verbatim.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          default: 'config ?? LOCALE_ID',
          description: 'BCP 47 locale of <code>Date</code> times.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name of the <code>&lt;ol&gt;</code> ("Order history"). Recommended when a page has more than one list.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Template slots',
      entries: [
        {
          name: 'OgeTimelineContentTemplate',
          type: '[ogeTimelineContentTemplate]',
          description:
            'Structural directive replacing the built-in time / title / description block of every entry. Interactive content stays in the Tab order.',
        },
        {
          name: 'OgeTimelineMarkerTemplate',
          type: '[ogeTimelineMarkerTemplate]',
          description:
            'Replaces the dot on the axis (a step number, an avatar). The marker column is <code>aria-hidden</code>, so say the same thing in the content.',
        },
        {
          name: 'OgeTimelineOppositeTemplate',
          type: '[ogeTimelineOppositeTemplate]',
          description:
            'Replaces the opposite-side text of an alternating timeline.',
        },
        {
          name: 'OgeTimelineItemTemplateContext',
          type: "{ $implicit: OgeTimelineItem; index: number; side: 'start' | 'end'; first: boolean; last: boolean }",
          description: 'Context of all three slots.',
        },
      ],
    },
    {
      title: 'Vocabulary',
      entries: [
        {
          name: 'OgeTimelineItem',
          type: 'interface',
          description: `One entry: ${ITEM_FIELDS}. A <code>Date</code> time is written into <code>&lt;time datetime&gt;</code> from its local fields (never <code>toISOString</code>).`,
        },
        {
          name: 'OgeTimelineOrientation',
          type: "'vertical' | 'horizontal'",
          description: 'Axis union.',
        },
        {
          name: 'OgeTimelineAlign',
          type: "'start' | 'end' | 'alternate' | 'alternate-reverse'",
          description: 'Content side union.',
        },
        {
          name: 'OgeTimelineSeverity',
          type: "'accent' | 'neutral' | 'success' | 'warning' | 'danger'",
          description: 'Marker colour union (default <code>accent</code>).',
        },
        {
          name: 'OgeTimelineMarkerVariant',
          type: "'filled' | 'outlined'",
          description: 'Solid marker, or a ring for pending / future entries.',
        },
      ],
    },
  ],
};

const CONFIG_GROUPS: readonly ApiGroup[] = [
  {
    entries: [
      {
        name: 'provideOgeTimelineConfig(config)',
        type: '(config: OgeTimelineConfigInput | (() => OgeTimelineConfigInput)) => Provider',
        description:
          'Application- or component-scoped defaults for <code>orientation</code>, <code>align</code>, <code>dateFormat</code> and <code>locale</code> (a function makes it live). There is deliberately no <code>messages</code> block: the timeline renders no user-facing strings of its own.',
      },
      {
        name: 'OGE_TIMELINE_CONFIG',
        type: 'InjectionToken<OgeTimelineConfig>',
        description:
          'The token behind <code>provideOgeTimelineConfig()</code>, with <code>OGE_DEFAULT_TIMELINE_CONFIG</code> as its factory default.',
      },
    ],
  },
];

export const OGE_TIMELINE_CONFIG_API: ApiSections = {
  properties: CONFIG_GROUPS,
  types: [
    {
      entries: [
        {
          name: 'OgeTimelineConfig / OgeTimelineConfigInput',
          type: 'interface',
          description:
            'The config shape (<code>orientation?</code>, <code>align?</code>, <code>dateFormat?</code>, <code>locale?</code>) and its partial input; <code>OGE_DEFAULT_TIMELINE_CONFIG</code> is the resolved default.',
        },
      ],
    },
  ],
};
