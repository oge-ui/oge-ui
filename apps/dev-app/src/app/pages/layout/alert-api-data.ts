import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/alert/src/** and the shared core
 * (packages/behavior/src/lib/layout/alert-core.ts) — keep in sync with the
 * source TSDoc when the public API changes.
 */
export const OGE_ALERT_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'severity',
          type: "'info' | 'success' | 'warning' | 'error' | undefined",
          default: "config ?? 'info'",
          description:
            'Meaning of the message — the colour, the glyph, the visually hidden prefix and (with <code>live: auto</code>) the role: <code>error</code> / <code>warning</code> are <code>role="alert"</code>, <code>info</code> / <code>success</code> <code>role="status"</code>.',
        },
        {
          name: 'title',
          type: 'string | undefined',
          description:
            'Bold first line above the message; the severity prefix moves into it.',
        },
        {
          name: 'stylingMode',
          type: "'soft' | 'outlined' | 'filled' | undefined",
          default: "config ?? 'soft'",
          description:
            '<code>soft</code> is a tinted surface with a severity rail, <code>outlined</code> a coloured frame, <code>filled</code> the solid severity colour with <code>--oge-severity-contrast</code> text.',
        },
        {
          name: 'dismissible',
          type: 'boolean',
          default: 'false',
          description:
            'Renders a real dismiss button (name from the <code>dismiss</code> message) that runs the cancelable close. When the alert held focus, focus moves to the next tabbable element (<code>ogeAlertFocusAfterClose</code>).',
        },
        {
          name: 'live',
          type: "'auto' | 'polite' | 'assertive' | 'off'",
          default: "'auto'",
          description:
            '<code>auto</code> derives <code>alert</code> / <code>status</code> from the severity, <code>assertive</code> / <code>polite</code> force one, <code>off</code> renders no role (a permanent note). The role stays while the alert is hidden, so showing it again is announced (<code>ogeAlertRole</code>).',
        },
        {
          name: 'showIcon',
          type: 'boolean',
          default: 'true',
          description:
            'Shows the severity glyph (or the projected <code>[ogeAlertIcon]</code>); <code>false</code> drops the icon column.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name of the live region — only written while the alert has a role.',
        },
        {
          name: 'visible',
          type: 'boolean (model)',
          default: 'true',
          description:
            'Whether the alert is shown — two-way. <code>false</code> renders nothing and sets <code>hidden</code> on the host.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'show()',
          type: '() => void',
          description: 'Shows the alert again.',
        },
        {
          name: 'close()',
          type: '() => void',
          description:
            'Runs the cancelable close (<code>closing</code> → <code>closed</code>), as the dismiss button does.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'visibleChange',
          type: 'boolean',
          description: 'The banana half of <code>[(visible)]</code>.',
        },
        {
          name: 'closing',
          type: 'OgeAlertClosingEvent',
          description:
            'Cancelable: the alert is about to close. Set <code>cancel</code> to keep it.',
        },
        {
          name: 'closed',
          type: 'OgeAlertClosedEvent',
          description:
            'The alert closed (<code>visible</code> is now <code>false</code>).',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeAlertActions',
          type: 'directive [ogeAlertActions]',
          description:
            'Marks a row of real controls rendered under the message (in the Tab order).',
        },
        {
          name: 'OgeAlertIcon',
          type: 'directive [ogeAlertIcon]',
          description:
            'Replaces the default glyph; rendered inside an <code>aria-hidden</code> wrapper.',
        },
        {
          name: 'OgeAlertSeverity',
          type: "'info' | 'success' | 'warning' | 'error'",
          description: 'Severity vocabulary.',
        },
        {
          name: 'OgeAlertStylingMode',
          type: "'soft' | 'outlined' | 'filled'",
          description: 'Surface presets.',
        },
        {
          name: 'OgeAlertLive',
          type: "'auto' | 'polite' | 'assertive' | 'off'",
          description: 'Live-region behaviour.',
        },
        {
          name: 'OgeAlertClosingEvent',
          type: '{ event?: Event; cancel: boolean }',
          description: 'Payload of <code>closing</code>.',
        },
        {
          name: 'OgeAlertClosedEvent',
          type: '{ event?: Event }',
          description: 'Payload of <code>closed</code>.',
        },
      ],
    },
  ],
};

export const OGE_ALERT_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeAlertConfig()',
      entries: [
        {
          name: 'messages',
          type: 'OgeAlertMessages',
          description:
            'Every user-facing string: <code>dismiss</code> (default <code>Dismiss</code>) and the visually hidden severity prefixes <code>info</code> / <code>success</code> / <code>warning</code> / <code>error</code> (default <code>Information</code>, <code>Success</code>, <code>Warning</code>, <code>Error</code>). Translated in every <code>&#64;oge-ui/locales</code> pack (<code>layout.alert</code>).',
        },
        {
          name: 'severity / stylingMode',
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
          name: 'provideOgeAlertConfig',
          type: '(config: OgeAlertConfigInput | (() => OgeAlertConfigInput)) => Provider',
          description:
            'Application- or component-scoped defaults; a function makes the config live.',
        },
        {
          name: 'OGE_ALERT_CONFIG',
          type: 'InjectionToken<OgeAlertConfig>',
          description: 'The resolved config the alert injects.',
        },
        {
          name: 'OGE_DEFAULT_ALERT_CONFIG',
          type: 'OgeAlertConfig',
          description: 'The defaults (from <code>&#64;oge-ui/behavior</code>).',
        },
        {
          name: 'OGE_DEFAULT_ALERT_MESSAGES',
          type: 'OgeAlertMessages',
          description: 'The English catalog.',
        },
        {
          name: 'OgeAlertConfig',
          type: '{ messages: OgeAlertMessages; severity?; stylingMode? }',
          description: 'Resolved config shape.',
        },
        {
          name: 'OgeAlertConfigInput',
          type: 'Partial<OgeAlertConfig> with partial messages',
          description: 'What the provider accepts.',
        },
        {
          name: 'OgeAlertMessages',
          type: '{ dismiss; info; success; warning; error }',
          description: 'The alert catalog.',
        },
      ],
    },
  ],
};
