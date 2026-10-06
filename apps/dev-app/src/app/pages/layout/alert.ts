import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeAlert, OgeAlertActions, OgeAlertIcon } from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_ALERT_SECTIONS,
  ReactLayoutAlertDemos,
} from '../react-layout/alert';
import {
  DISMISS_SNIPPET,
  ICON_SNIPPET,
  LIVE_SNIPPET,
  MODES_SNIPPET,
  SEVERITIES_SNIPPET,
} from './alert-snippets';

const SECTIONS = [
  'Severities',
  'Styling modes',
  'Title, actions & dismiss',
  'Live regions',
  'Custom icon',
] as const;

@Component({
  selector: 'app-layout-alert',
  imports: [
    OgeAlert,
    OgeAlertActions,
    OgeAlertIcon,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutAlertDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Alert"
      category="Layout"
      categoryLink="/components/alert"
      [chips]="['role=alert / status', 'dismissible', 'actions', 'RTL']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeAlert&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> renders the same markup and the
          same role rule as the Angular alert, on the shared alert core in
          <code>&#64;oge-ui/behavior</code>.
        </p>
      } @else {
        <p>
          <code>oge-alert</code> is an inline message in the page flow — an
          information note, a success, a warning or an error — with an optional
          title, an actions row and a dismiss button.
        </p>
      }
      <p>
        <strong>The role follows the severity:</strong> errors and warnings are
        <code>role="alert"</code> (assertive), information and success
        <code>role="status"</code> (polite). Both only announce content that
        <em>changes</em>, so the role stays on the host while the alert is
        hidden — showing it again is what screen readers announce. The glyph is
        decoration: a visually hidden prefix carries the severity, so it never
        rides on colour alone.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-alert-demos />
    } @else {
      <app-demo-card
        [chips]="['info', 'success', 'warning', 'error']"
        heading="Severities"
        description='Four severities, four glyphs, four live-region roles: <code>info</code> / <code>success</code> are <code>role="status"</code>, <code>warning</code> / <code>error</code> <code>role="alert"</code>.'
        [code]="severitiesSnippet"
        language="ts"
      >
        <div class="grid gap-3">
          <oge-alert severity="info">A new version is available.</oge-alert>
          <oge-alert severity="success">Your changes were saved.</oge-alert>
          <oge-alert severity="warning"
            >Your trial ends in three days.</oge-alert
          >
          <oge-alert severity="error"
            >The payment could not be processed.</oge-alert
          >
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['soft', 'outlined', 'filled']"
        heading="Styling modes"
        description="<code>soft</code> (default) is a tinted surface with a severity rail, <code>outlined</code> a coloured frame, <code>filled</code> the solid severity colour with <code>--oge-severity-contrast</code> text."
        [code]="modesSnippet"
        language="ts"
      >
        <div class="grid gap-3">
          <oge-alert severity="success" stylingMode="soft">Soft</oge-alert>
          <oge-alert severity="success" stylingMode="outlined"
            >Outlined</oge-alert
          >
          <oge-alert severity="success" stylingMode="filled">Filled</oge-alert>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['title', '[ogeAlertActions]', 'dismissible', 'closing']"
        heading="Title, actions & dismiss"
        description="<code>dismissible</code> adds a real dismiss button named from the messages catalog. <code>closing</code> is cancelable; when the alert held focus, focus moves to the next control instead of dropping to the page body."
        [code]="dismissSnippet"
        language="ts"
      >
        <oge-alert
          severity="warning"
          title="Storage almost full"
          [dismissible]="true"
          [(visible)]="storageVisible"
        >
          You have used 92% of your quota.
          <div ogeAlertActions>
            <button type="button" class="demo-btn">Manage storage</button>
          </div>
        </oge-alert>
        @if (!storageVisible()) {
          <button
            type="button"
            class="demo-btn"
            (click)="storageVisible.set(true)"
          >
            Show again
          </button>
        }
      </app-demo-card>

      <app-demo-card
        [chips]="['live', 'announce on show', 'live: off']"
        heading="Live regions"
        description='The role stays on the host while it is hidden, so showing the alert inserts its text into an existing live region and is announced. <code>live="off"</code> renders no role for a permanent note; <code>assertive</code> / <code>polite</code> force one.'
        [code]="liveSnippet"
        language="ts"
      >
        <button
          type="button"
          class="demo-btn mb-3"
          (click)="saved.set(!saved())"
        >
          Toggle saved
        </button>
        <div class="grid gap-3">
          <oge-alert severity="success" [(visible)]="saved"
            >Draft saved.</oge-alert
          >
          <oge-alert severity="info" live="off"
            >This page is read-only.</oge-alert
          >
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['[ogeAlertIcon]', 'showIcon']"
        heading="Custom icon"
        description='<code>[ogeAlertIcon]</code> replaces the default glyph inside an <code>aria-hidden</code> wrapper; <code>[showIcon]="false"</code> drops the icon column.'
        [code]="iconSnippet"
        language="ts"
      >
        <div class="grid gap-3">
          <oge-alert severity="info" title="Tip">
            <svg
              ogeAlertIcon
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z"
              />
            </svg>
            Press <kbd>?</kbd> to see every keyboard shortcut.
          </oge-alert>
          <oge-alert severity="info" [showIcon]="false"
            >No icon at all.</oge-alert
          >
        </div>
      </app-demo-card>
    }
  `,
})
export class LayoutAlertPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_ALERT_SECTIONS;
  protected readonly severitiesSnippet = SEVERITIES_SNIPPET;
  protected readonly modesSnippet = MODES_SNIPPET;
  protected readonly dismissSnippet = DISMISS_SNIPPET;
  protected readonly liveSnippet = LIVE_SNIPPET;
  protected readonly iconSnippet = ICON_SNIPPET;

  protected readonly storageVisible = signal(true);
  protected readonly saved = signal(false);
}
