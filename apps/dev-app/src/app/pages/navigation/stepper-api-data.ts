import type { ApiSections } from '../../shared/api-reference';

export const OGE_STEPPER_API: ApiSections = {
  properties: [
    {
      title: 'Steps & selection',
      entries: [
        {
          name: 'activeIndex',
          type: 'number (two-way)',
          default: '0',
          description: 'Index of the active step.',
        },
        {
          name: 'activeKey',
          type: 'string | undefined (two-way)',
          description:
            'Key of the active step. Reconciled before the index, so an initial key binding wins over the index default on first run.',
        },
        {
          name: 'steps',
          type: 'readonly OgeStepData[] | undefined',
          description:
            'Data-driven steps, merged <em>after</em> any declarative <code>&lt;oge-step&gt;</code> children.',
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
          name: 'stepperId',
          type: 'string (readonly)',
          description: 'id prefix of the generated header / panel pairs.',
        },
        {
          name: 'changePending',
          type: 'Signal&lt;boolean&gt;',
          description:
            'True while an async <code>stepGuard</code> is in flight.',
        },
      ],
    },
  ],
  methods: [
    {
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
      entries: [
        {
          name: 'stepChanging',
          type: 'OgeStepChangingEvent',
          description:
            'Cancelable, emitted before the leaving step&rsquo;s <code>stepGuard</code> runs.',
        },
        {
          name: 'stepChanged',
          type: 'OgeStepChangedEvent',
          description: 'The active step changed.',
        },
        {
          name: 'stepBlocked',
          type: 'OgeStepBlockedEvent',
          description:
            "A move was refused, carrying <code>reason: 'linear' | 'editable' | 'guard' | 'disabled'</code>. Angular Material refuses silently.",
        },
        {
          name: 'finished',
          type: 'OgeStepperFinishEvent',
          description: '<code>next()</code> was confirmed on the last step.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'OgeStep (declarative child)',
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
      ],
    },
    {
      title: 'Types & directives',
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
          description: 'One data-driven step.',
        },
        {
          name: 'OgeStepGuard',
          type: '() =&gt; boolean | Promise&lt;boolean&gt;',
          description:
            "Core's <code>OgeAsyncGuard</code>, the same veto contract the tabs' close guard and the accordion's expand guard use.",
        },
        {
          name: '[ogeStepperNext] / [ogeStepperPrevious]',
          type: 'directive',
          description:
            'Turn any button into a navigation control. They find the stepper by DI when written inside it, or take one explicitly (<code>ogeStepperNext [ogeStepperTarget]="wizard"</code>) from outside — which Material&rsquo;s equivalents cannot do.',
        },
        {
          name: '[ogeStepHeaderTemplate] / [ogeStepIndicatorTemplate] / [ogeStepContentTemplate]',
          type: 'directive',
          description:
            'Replace the label block, the round indicator, or supply lazy body content.',
        },
        {
          name: '&lt;oge-form-steps&gt;',
          type: 'directive (@oge-ui/forms)',
          description:
            "Wraps this component inside <code>&lt;oge-form&gt;</code>. Step completion comes from the form's own per-step error rollup, so it behaves identically in all three binding modes, and leaving a step touches only that step's fields.",
        },
      ],
    },
  ],
};

export const OGE_STEPPER_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeStepperConfig()',
      entries: [
        {
          name: 'orientation / display / linear',
          type: 'defaults',
          description: 'Defaults for the matching inputs.',
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
      ],
    },
  ],
};
