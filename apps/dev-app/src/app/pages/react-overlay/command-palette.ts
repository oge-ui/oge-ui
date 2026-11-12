import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import {
  OgeCommandPalette,
  type OgeCommandExecuteEvent,
  type OgeCommandPaletteHandle,
} from '@oge-ui/react-overlay';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  COMMAND_PALETTE_COMMANDS,
  COMMAND_PALETTE_COUNTER_COMMANDS,
} from '../overlay/command-palette-demo-data';
import { OVERLAY_COMMAND_PALETTE_DEMOS } from './command-palette-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_OVERLAY_COMMAND_PALETTE_SECTIONS = [
  'Basics',
  'Recent commands & keepOpen',
] as const;

const BUTTON =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700';

function BasicsDemo(): ReactNode {
  const palette = useRef<OgeCommandPaletteHandle>(null);
  const [last, setLast] = useState('Nothing run yet');
  return createElement(
    'div',
    null,
    createElement(
      'button',
      {
        key: 'open',
        type: 'button',
        className: BUTTON,
        'data-testid': 'open-palette',
        onClick: () => palette.current?.open(),
      },
      'Open the palette',
    ),
    createElement(OgeCommandPalette, {
      key: 'palette',
      ref: palette,
      commands: COMMAND_PALETTE_COMMANDS,
      hotkey: 'Mod+/',
      onCommandExecute: (e: OgeCommandExecuteEvent) =>
        setLast(`Ran "${e.command.label}"`),
    }),
    createElement(
      'p',
      { key: 'last', className: 'mt-2 text-sm', 'data-testid': 'palette-last' },
      last,
    ),
  );
}

function RecentDemo(): ReactNode {
  const palette = useRef<OgeCommandPaletteHandle>(null);
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState<readonly string[]>([]);
  return createElement(
    'div',
    null,
    createElement(
      'button',
      {
        key: 'open',
        type: 'button',
        className: BUTTON,
        'data-testid': 'open-counter',
        onClick: () => palette.current?.open(),
      },
      'Open with recent commands',
    ),
    createElement(OgeCommandPalette, {
      key: 'palette',
      ref: palette,
      commands: COMMAND_PALETTE_COUNTER_COMMANDS,
      recent,
      onRecentChange: setRecent,
      recentLimit: 3,
      hotkey: null,
      placeholder: 'Search counter commands…',
      onCommandExecute: (event: OgeCommandExecuteEvent) => {
        const id = event.command.id;
        setCount((n) =>
          id === 'reset' ? 0 : n + (id === 'increment' ? 1 : -1),
        );
        event.keepOpen = id !== 'reset';
      },
    }),
    createElement(
      'p',
      {
        key: 'count',
        className: 'mt-2 text-sm',
        'data-testid': 'palette-count',
      },
      `Count: ${count} · recent: ${recent.join(', ') || 'none'}`,
    ),
  );
}

/**
 * The React half of the command palette page — rendered inside
 * `/components/overlay/command-palette` when the reader has chosen React
 * (ADR 0002).
 */
@Component({
  selector: 'app-react-overlay-command-palette-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the one stylesheet the React palette needs
  encapsulation: ViewEncapsulation.None,
  styleUrl:
    '../../../../../../packages/overlay/src/lib/command-palette/command-palette.scss',
  template: `
    <app-demo-card
      [chips]="['commands', 'hotkey', 'onCommandExecute', 'ref.open()']"
      heading="Basics"
      description="Commands carry a label, an optional group, keywords, description, shortcut and icon; a disabled one is listed but never runs. Type &ldquo;gtst&rdquo; or &ldquo;prefs&rdquo; to see the fuzzy match. The default hotkey is <kbd>Mod+K</kbd>; this site already uses Ctrl+K for its search, so the demo listens for <kbd>Ctrl+/</kbd> (<kbd>⌘/</kbd>)."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basics" />
    </app-demo-card>

    <app-demo-card
      [chips]="['recent', 'onRecentChange', 'keepOpen', 'placeholder']"
      heading="Recent commands & keepOpen"
      description="<code>recent</code> / <code>onRecentChange</code> keep the &ldquo;Recent&rdquo; section — persist them to keep it across visits. A handler that sets <code>keepOpen</code> leaves the palette open, for commands people repeat."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="recent" />
    </app-demo-card>
  `,
})
export class ReactOverlayCommandPaletteDemos {
  protected readonly demos = OVERLAY_COMMAND_PALETTE_DEMOS;
  protected readonly basics = () => createElement(BasicsDemo);
  protected readonly recent = () => createElement(RecentDemo);
}
