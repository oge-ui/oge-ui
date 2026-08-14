import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/navigation/src/lib/stepper.tsx — keep in
 * sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../navigation/stepper-api-data.ts` (the parity
 * gate diffs the two member by member): the same groups in the same order, the
 * Angular `[(activeIndex)]` / `[(activeKey)]` models as controlled pairs, the
 * outputs as `on*` callbacks, the public methods on the imperative handle, and
 * the declarative `<oge-step>` child as an `OgeStepDefinition` entry of the
 * `steps` prop.
 */
export const OGE_REACT_STEPPER_API: ApiSections = {
  properties: [
    {
      title: 'Steps & selection',
      entries: [
        {
          name: 'activeIndex / defaultActiveIndex / onActiveIndexChange',
          type: 'number | (index: number) =&gt; void',
          default: '0',
          description:
            'Index of the active step — controlled through <code>activeIndex</code> + <code>onActiveIndexChange</code>, uncontrolled through <code>defaultActiveIndex</code>.',
        },
        {
          name: 'activeKey / defaultActiveKey / onActiveKeyChange',
          type: 'string | undefined | (key: string | undefined) =&gt; void',
          description:
            'Key of the active step. Resolved before the index, so an initial key binding wins over the index default on first run.',
        },
        {
          name: 'steps',
          type: 'readonly OgeStepDefinition[] | undefined',
          description:
            'The steps, in render order — the shared <code>OgeStepData</code> fields plus the React content slots. React has no declarative <code>&lt;oge-step&gt;</code> child to project, so this array is the only step source.',
        },
        {
          name: 'linear',
          type: 'boolean',
          default: 'false',
          description:
            'Blocks moving past a step that is neither <code>completed</code> nor <code>optional</code>. The default matches Material and PrimeNG; Kendo is the outlier at <code>true</code>.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Blocks every step change.',
        },
      ],
    },
    {
      title: 'Layout & chrome',
      entries: [
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical'",
          default: "'horizontal'",
          description:
            'Main axis of the step list. <strong>The ARIA semantics do not change with it</strong> — see the accessibility group.',
        },
        {
          name: 'display',
          type: "'full' | 'label' | 'indicator'",
          default: "'full'",
          description:
            'How much of each header renders: label plus description, label only, or just the round indicator.',
        },
        {
          name: 'showNavigation',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the built-in Back / Next bar, which becomes Finish on the last step. None of the three reference steppers ships one.',
        },
        {
          name: 'deferRendering',
          type: 'boolean',
          default: 'false',
          description: "Creates a step's body on first activation.",
        },
        {
          name: 'keepAlive',
          type: 'boolean',
          default: 'true',
          description: 'Keeps a body mounted after the user leaves it.',
        },
        {
          name: 'className / style',
          type: 'string | CSSProperties',
          description:
            'Merged onto the stepper host. <code>className</code> is appended to the generated <code>oge-stepper*</code> classes; the Angular host takes <code>class</code>/<code>style</code> natively.',
        },
      ],
    },
    {
      title: 'Accessibility',
      entries: [
        {
          name: 'keyboardNavigation',
          type: 'boolean',
          default: 'false',
          description:
            'Adds arrow / Home / End over the headers. Off by default because the headers are buttons in a list, not tabs, so they are already Tab-reachable. It moves focus only, and deliberately does <strong>not</strong> wrap.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name of the step list. Falls back to the <code>stepper</code> message.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeStepperMessages&gt; | undefined',
          description:
            'Per-instance overrides of the config strings — the list&rsquo;s accessible name, the optional/completed/invalid announcements and the navigation bar&rsquo;s labels.',
        },
        {
          name: 'stepperId',
          type: 'string (handle)',
          description:
            'id prefix of the generated header / panel pairs, read from the ref.',
        },
        {
          name: 'changePending',
          type: 'boolean (handle)',
          description:
            'True while an async <code>stepGuard</code> is in flight. <code>onChangePendingChange</code> reports the same transitions as a callback.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        {
          name: 'next(event?: Event)',
          type: 'void',
          description:
            'Advances one step, or confirms the finish when already on the last one. The guard runs either way, so a final step can still veto.',
        },
        {
          name: 'previous(event?: Event)',
          type: 'void',
          description: 'Goes back one step, through the same pipeline.',
        },
        {
          name: 'goTo(target: number | string, event?: Event)',
          type: 'void',
          description: 'Moves to a step by index or key.',
        },
        {
          name: 'reset()',
          type: 'void',
          description:
            'Clears the rendered-body cache and returns to the first step.',
        },
        {
          name: 'focus()',
          type: 'void',
          description: "Focuses the active step's header.",
        },
      ],
    },
  ],
  events: [
    {
      title: 'Callbacks',
      entries: [
        {
          name: 'onStepChanging',
          type: '(event: OgeStepChangingEvent) =&gt; void',
          description:
            'Cancelable, called before the leaving step&rsquo;s <code>stepGuard</code> runs.',
        },
        {
          name: 'onStepChanged',
          type: '(event: OgeStepChangedEvent) =&gt; void',
          description: 'The active step changed.',
        },
        {
          name: 'onStepBlocked',
          type: '(event: OgeStepBlockedEvent) =&gt; void',
          description:
            "A move was refused, carrying <code>reason: 'linear' | 'editable' | 'guard' | 'disabled'</code>. Angular Material refuses silently.",
        },
        {
          name: 'onFinished',
          type: '(event: OgeStepperFinishEvent) =&gt; void',
          description: '<code>next()</code> was confirmed on the last step.',
        },
        {
          name: 'onChangePendingChange',
          type: '(pending: boolean) =&gt; void',
          description:
            'Fires whenever an async <code>stepGuard</code> starts or settles — the callback half of the handle&rsquo;s <code>changePending</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'OgeStepDefinition (a steps entry)',
      entries: [
        {
          name: 'key / label / description',
          type: 'string',
          description: 'Identity and header text.',
        },
        {
          name: 'icon / iconClass',
          type: 'string | undefined',
          description:
            'SVG path data, or class(es) for an icon font — replacing the step number.',
        },
        {
          name: 'completed / optional / editable',
          type: 'boolean',
          description:
            'The linear gate: <code>completed</code> lets a linear stepper past, <code>optional</code> lets it past regardless, and <code>editable: false</code> blocks coming <em>back</em>.',
        },
        {
          name: 'errorMessage',
          type: 'string | undefined',
          description:
            'Shown under the label while <code>invalid</code>, replacing <code>description</code> so two sub-lines never compete. Angular Material has this; Kendo and PrimeNG do not.',
        },
        {
          name: 'invalid / disabled / visible',
          type: 'boolean',
          description:
            'Error state, non-activatable, and removal from the list.',
        },
        {
          name: 'stepGuard',
          type: '() =&gt; boolean | Promise&lt;boolean&gt;',
          description:
            'Veto hook run when leaving this step. A throw and a rejection both veto.',
        },
        {
          name: 'content',
          type: 'ReactNode',
          description:
            'The step body — the React counterpart of what an <code>&lt;oge-step&gt;</code> projects.',
        },
      ],
    },
    {
      title: 'Types & render props',
      entries: [
        {
          name: 'OgeStepState',
          type: "'number' | 'active' | 'done' | 'error'",
          description:
            'Derived indicator state; error outranks done, so a completed step that later fails still reads as needing attention.',
        },
        {
          name: 'OgeStepperOrientation',
          type: "'horizontal' | 'vertical'",
          description: 'Main axis; the ARIA model is the same for both.',
        },
        {
          name: 'OgeStepperDisplay',
          type: "'full' | 'label' | 'indicator'",
          description: 'How much of a header renders.',
        },
        {
          name: 'OgeStepData',
          type: '{ key?; label?; description?; icon?; iconClass?; disabled?; visible?; completed?; optional?; editable?; invalid?; cssClass?; stepGuard? }',
          description:
            'One step&rsquo;s shared data — the same shape the Angular layer uses, from <code>&#64;oge-ui/behavior</code>. <code>OgeStepDefinition</code> adds the React slots on top.',
        },
        {
          name: 'OgeStepGuard',
          type: '() =&gt; boolean | Promise&lt;boolean&gt;',
          description:
            "Behavior's <code>OgeAsyncGuard</code>, the same veto contract the tabs' close guard and the accordion's expand guard use.",
        },
        {
          name: 'next() / previous() on the handle',
          type: 'OgeStepperHandle',
          description:
            'The React counterpart of the <code>[ogeStepperNext]</code> / <code>[ogeStepperPrevious]</code> directives: any button drives the stepper through the same pipeline by calling the ref, from inside a step body or from outside — which Material&rsquo;s equivalents cannot do.',
        },
        {
          name: 'renderHeader / renderIndicator / renderContent',
          type: '(context) =&gt; ReactNode',
          description:
            'Render props replacing <code>[ogeStepHeaderTemplate]</code>, <code>[ogeStepIndicatorTemplate]</code> and <code>[ogeStepContentTemplate]</code>: the label block, the round indicator, or a lazily built body. Set on the stepper for all steps, or on one <code>steps</code> entry.',
        },
        {
          name: 'Stepper inside a form',
          type: '@oge-ui/react-inputs',
          description:
            "Angular&rsquo;s <code>&lt;oge-form-steps&gt;</code> wrapper has no React counterpart yet — <code>&#64;oge-ui/forms</code> ships no React layer. Bind the editors to your own state and compute each step's <code>completed</code> / <code>invalid</code> from it; the linear gate and the per-step error display are the stepper's own.",
        },
      ],
    },
  ],
};

export const OGE_REACT_STEPPER_CONFIG_API: ApiSections = {
  properties: [
    {
      title: '&lt;OgeStepperConfigProvider&gt;',
      entries: [
        {
          name: 'orientation / display / linear',
          type: 'defaults',
          description: 'Defaults for the matching props.',
        },
        {
          name: 'messages.stepper',
          type: 'string',
          default: "'Steps'",
          description: 'Accessible name of the step list.',
        },
        {
          name: 'messages.optional',
          type: 'string',
          default: "'Optional'",
          description:
            'Sub-label of an optional step, wired through <code>aria-describedby</code>.',
        },
        {
          name: 'messages.completed / messages.invalid',
          type: 'string',
          default: "'Completed' / 'Has errors'",
          description:
            'Announced in visually hidden text, because the indicator glyph is <code>aria-hidden</code>.',
        },
        {
          name: 'messages.previous / next / finish',
          type: 'string',
          default: "'Back' / 'Next' / 'Finish'",
          description: 'Labels of the built-in navigation bar.',
        },
        {
          name: 'useOgeStepperConfig()',
          type: '() =&gt; OgeStepperConfig',
          description:
            'Reads the resolved config of the nearest provider, merged over <code>OGE_DEFAULT_STEPPER_CONFIG</code> — the hook behind the component, exported for steppers you compose yourself.',
        },
      ],
    },
  ],
};
