import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/layout/src/lib/alert.tsx — keep in sync
 * with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../layout/alert-api-data.ts`: the same props,
 * `onX` callbacks for the outputs, `visible` / `defaultVisible` /
 * `onVisibleChange` for the `[(visible)]` model, and the `actions` / `icon`
 * node props for the `[ogeAlertActions]` / `[ogeAlertIcon]` slots.
 */
export const OGE_REACT_ALERT_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'severity',
          type: "'info' | 'success' | 'warning' | 'error'",
          default: "config ?? 'info'",
          description:
            'Meaning of the message — colour, glyph, hidden prefix and (with <code>live: auto</code>) the role: <code>error</code> / <code>warning</code> are <code>role="alert"</code>, <code>info</code> / <code>success</code> <code>role="status"</code>.',
        },
        {
          name: 'title',
          type: 'string',
          description:
            'Bold first line above the message; the severity prefix moves into it.',
        },
        {
          name: 'stylingMode',
          type: "'soft' | 'outlined' | 'filled'",
          default: "config ?? 'soft'",
          description:
            '<code>soft</code> is a tinted surface with a severity rail, <code>outlined</code> a coloured frame, <code>filled</code> the solid severity colour.',
        },
        {
          name: 'dismissible',
          type: 'boolean',
          default: 'false',
          description:
            'Renders a real dismiss button that runs the cancelable close; focus moves to the next tabbable element when the alert held it.',
        },
        {
          name: 'live',
          type: "'auto' | 'polite' | 'assertive' | 'off'",
          default: "'auto'",
          description:
            '<code>auto</code> derives the role from the severity, <code>assertive</code> / <code>polite</code> force one, <code>off</code> renders none. The role stays while hidden, so showing again is announced.',
        },
        {
          name: 'showIcon',
          type: 'boolean',
          default: 'true',
          description:
            'Shows the severity glyph (or <code>icon</code>); <code>false</code> drops the icon column.',
        },
        {
          name: 'icon',
          type: 'ReactNode',
          description:
            'Replaces the default glyph inside an <code>aria-hidden</code> wrapper — the Angular <code>[ogeAlertIcon]</code>.',
        },
        {
          name: 'actions',
          type: 'ReactNode',
          description:
            'A row of real controls under the message — the Angular <code>[ogeAlertActions]</code>.',
        },
        {
          name: 'ariaLabel',
          type: 'string',
          description:
            'Accessible name of the live region — only written while it has a role.',
        },
        {
          name: 'visible',
          type: 'boolean',
          description:
            'Whether the alert is shown (controlled); <code>false</code> renders nothing and sets <code>hidden</code>.',
        },
        {
          name: 'defaultVisible',
          type: 'boolean',
          default: 'true',
          description: 'Initial visibility when uncontrolled.',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description: 'The message.',
        },
        {
          name: 'className',
          type: 'string',
          description: 'Extra classes on the host element.',
        },
        {
          name: 'style',
          type: 'CSSProperties',
          description: 'Inline styles on the host element.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Ref handle (OgeAlertHandle)',
      entries: [
        {
          name: 'show()',
          type: '() => void',
          description: 'Shows the alert again.',
        },
        {
          name: 'close()',
          type: '() => void',
          description: 'Runs the cancelable close, as the dismiss button does.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onVisibleChange',
          type: '(visible: boolean) => void',
          description: 'The visibility a close / show committed.',
        },
        {
          name: 'onClosing',
          type: '(event: OgeAlertClosingEvent) => void',
          description:
            'Cancelable: the alert is about to close. Set <code>cancel</code> to keep it.',
        },
        {
          name: 'onClosed',
          type: '(event: OgeAlertClosedEvent) => void',
          description: 'The alert closed.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeAlertProps',
          type: 'interface',
          description: 'Props of <code>&lt;OgeAlert&gt;</code>.',
        },
        {
          name: 'OgeAlertHandle',
          type: '{ show(): void; close(): void }',
          description: 'The ref handle.',
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
          description: 'Payload of <code>onClosing</code>.',
        },
        {
          name: 'OgeAlertClosedEvent',
          type: '{ event?: Event }',
          description: 'Payload of <code>onClosed</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_ALERT_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'OgeAlertConfigProvider',
      entries: [
        {
          name: 'messages',
          type: 'OgeAlertMessages',
          description:
            'Every user-facing string: <code>dismiss</code> and the visually hidden severity prefixes <code>info</code> / <code>success</code> / <code>warning</code> / <code>error</code>. Translated in every <code>&#64;oge-ui/locales</code> pack (<code>layout.alert</code>).',
        },
        {
          name: 'severity / stylingMode',
          type: '—',
          description:
            'Defaults for the matching props. <code>useOgeAlertConfig()</code> reads the resolved value.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeAlertConfigProvider',
          type: '({ config?, children }) => JSX.Element',
          description: 'Subtree-scoped defaults.',
        },
        {
          name: 'useOgeAlertConfig',
          type: '() => OgeAlertConfig',
          description: 'Reads the resolved config.',
        },
        {
          name: 'OGE_DEFAULT_ALERT_CONFIG',
          type: 'OgeAlertConfig',
          description: 'The defaults.',
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
