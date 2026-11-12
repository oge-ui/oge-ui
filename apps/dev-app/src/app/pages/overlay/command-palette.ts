import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeCommandPalette,
  type OgeCommand,
  type OgeCommandExecuteEvent,
} from '@oge-ui/overlay';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_OVERLAY_COMMAND_PALETTE_SECTIONS,
  ReactOverlayCommandPaletteDemos,
} from '../react-overlay/command-palette';
import {
  COMMAND_PALETTE_COMMANDS,
  COMMAND_PALETTE_COUNTER_COMMANDS,
} from './command-palette-demo-data';
import {
  COMMAND_PALETTE_BASIC_SNIPPET,
  COMMAND_PALETTE_RECENT_SNIPPET,
} from './command-palette-snippets';

const SECTIONS = ['Basics', 'Recent commands & keepOpen'] as const;

const BUTTON =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700';

@Component({
  selector: 'app-overlay-command-palette',
  imports: [
    OgeCommandPalette,
    DemoCard,
    DocHeader,
    PageToc,
    ReactOverlayCommandPaletteDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Command Palette"
      category="Overlay"
      categoryLink="/components/overlay"
      [chips]="['Ctrl+K', 'fuzzy search', 'combobox', 'recent']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeCommandPalette&gt;</code> from
          <code>&#64;oge-ui/react-overlay</code> is a modal search box over
          every action of an app, with the same matcher, markup and stylesheet
          as the Angular component.
        </p>
      } @else {
        <p>
          <code>oge-command-palette</code> is a modal search box over every
          action of an app — opened with Ctrl+K (⌘K on a Mac) or from code.
        </p>
      }
      <p>
        The query fuzzy-matches the labels — accent- and case-insensitive,
        prefixes and word starts first — plus each command's keywords and
        description; matches stay in their groups and the matched letters are
        highlighted. An empty query lists the recently run commands first. The
        search box is an APG combobox over a listbox, the dialog the shared
        modal shell: focus trap, scroll lock, Escape and a backdrop press to
        close, focus back where it was.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-overlay-command-palette-demos />
    } @else {
      <app-demo-card
        [chips]="['commands', 'hotkey', 'commandExecute', 'open()']"
        heading="Basics"
        description="Commands carry a label, an optional group, keywords, description, shortcut and icon; a disabled one is listed but never runs. Type &ldquo;gtst&rdquo; or &ldquo;prefs&rdquo; to see the fuzzy match. The default hotkey is <kbd>Mod+K</kbd>; this site already uses Ctrl+K for its search, so the demo listens for <kbd>Ctrl+/</kbd> (<kbd>⌘/</kbd>)."
        [code]="basicSnippet"
        language="ts"
      >
        <button
          type="button"
          [class]="button"
          data-testid="open-palette"
          (click)="palette.open()"
        >
          Open the palette
        </button>
        <oge-command-palette
          #palette
          [commands]="commands"
          hotkey="Mod+/"
          (commandExecute)="ran($event)"
        />
        <p class="mt-2 text-sm" data-testid="palette-last">{{ last() }}</p>
      </app-demo-card>

      <app-demo-card
        [chips]="['recent', 'recentLimit', 'keepOpen', 'placeholder']"
        heading="Recent commands & keepOpen"
        description="<code>[(recent)]</code> is two-way — store it to keep the &ldquo;Recent&rdquo; section across visits. A handler that sets <code>keepOpen</code> leaves the palette open, for commands people repeat."
        [code]="recentSnippet"
        language="ts"
      >
        <button
          type="button"
          [class]="button"
          data-testid="open-counter"
          (click)="counter.open()"
        >
          Open with recent commands
        </button>
        <oge-command-palette
          #counter
          [commands]="counterCommands"
          [(recent)]="recent"
          [recentLimit]="3"
          [hotkey]="null"
          placeholder="Search counter commands…"
          (commandExecute)="count($event)"
        />
        <p class="mt-2 text-sm" data-testid="palette-count">
          Count: {{ counterValue() }} · recent:
          {{ recent().join(', ') || 'none' }}
        </p>
      </app-demo-card>
    }
  `,
})
export class OverlayCommandPalettePage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_OVERLAY_COMMAND_PALETTE_SECTIONS;
  protected readonly basicSnippet = COMMAND_PALETTE_BASIC_SNIPPET;
  protected readonly recentSnippet = COMMAND_PALETTE_RECENT_SNIPPET;
  protected readonly button = BUTTON;
  protected readonly commands: OgeCommand[] = COMMAND_PALETTE_COMMANDS;
  protected readonly counterCommands = COMMAND_PALETTE_COUNTER_COMMANDS;
  protected readonly last = signal('Nothing run yet');
  protected readonly counterValue = signal(0);
  protected readonly recent = signal<readonly string[]>([]);

  protected ran(event: OgeCommandExecuteEvent): void {
    this.last.set(`Ran "${event.command.label}"`);
  }

  protected count(event: OgeCommandExecuteEvent): void {
    const id = event.command.id;
    if (id === 'reset') this.counterValue.set(0);
    else this.counterValue.update((n) => n + (id === 'increment' ? 1 : -1));
    event.keepOpen = id !== 'reset';
  }
}
