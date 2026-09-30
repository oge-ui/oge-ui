import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactGanttApiSections } from '../react-gantt/api';
import { OGE_GANTT_API, OGE_GANTT_CONFIG_API } from './gantt-api-data';

const SECTIONS = ['OgeGantt', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactGanttApiSections`' titles. */
const SECTIONS_REACT = ['<OgeGantt>', 'Configuration'] as const;

@Component({
  selector: 'app-gantt-api',
  imports: [
    ApiReference,
    DocHeader,
    PageToc,
    RouterLink,
    ReactGanttApiSections,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Gantt API"
      category="Gantt"
      categoryLink="/components/gantt"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Complete API reference for <code>&#64;oge-ui/react-gantt</code> —
          props, callbacks, the <code>ref</code> handle, render props and the
          supporting types, compiled from the source TSDoc. The kernel and the
          controller — the task-tree index, calendar-true time scales, forward
          auto-scheduling, the critical-path backward pass, orthogonal
          dependency routing, the gesture math and <code>OgeGanttCore</code> —
          are the framework-free <code>&#64;oge-ui/gantt-engine</code>, the same
          package the Angular Gantt runs; live demos are on the
          <a
            routerLink="/components/gantt"
            class="text-indigo-600 underline dark:text-indigo-400"
            >overview</a
          >
          page.
        </p>
      } @else {
        <p>
          Complete API reference for <code>&#64;oge-ui/gantt</code>. The kernel
          — the task-tree index, calendar-true time scales, forward
          auto-scheduling, the critical-path backward pass, orthogonal
          dependency routing and the gesture math — is pure TypeScript in the
          framework-free <code>&#64;oge-ui/gantt-engine</code> package, which
          the React Gantt runs too; live demos are on the
          <a
            routerLink="/components/gantt"
            class="text-indigo-600 underline dark:text-indigo-400"
            >overview</a
          >
          page.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-gantt-api />
    } @else {
      <app-api-reference
        title="OgeGantt"
        selector="oge-gantt"
        [sections]="ganttApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }

    <h3>Notes</h3>
    <ul>
      <li>
        Dates are plain local <code>Date</code>s throughout (Intl-only house
        rule — no date library, no adapter, no timezone database). The time
        scales are calendar-true: month ticks span real month lengths and DST
        transitions never shift a bar.
      </li>
      <li>
        No WAI-ARIA APG gantt pattern exists. The widget composes the treegrid
        pattern: the task pane is a <code>role="treegrid"</code> with
        roving-tabindex rows (arrows, Left/Right collapse/expand, Enter opens
        the dialog, Delete deletes), and the focused row drives its bar:
        <strong>Ctrl+Left/Right moves, Ctrl+Shift+Left/Right resizes</strong> as
        the keyboard equivalent of drag, announced through a polite live region.
        The chart itself is a focusable scroll region.
      </li>
      @if (fw.isReact()) {
        <li>
          Binding plain arrays never mutates them — edits land in an internal
          working set and the past-tense callbacks carry the data to persist; a
          new <code>tasks</code> array reference resets that working set (and
          the undo history), so keep the array stable between renders. Every
          applied edit, interactive or programmatic, is exactly one snapshot
          undo/redo step.
        </li>
      } @else {
        <li>
          Binding plain arrays never mutates them — edits land in an internal
          working set and the past-tense events carry the data to persist. Every
          applied edit, interactive or programmatic, is exactly one snapshot
          undo/redo step.
        </li>
      }
    </ul>
  `,
})
export class GanttApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly ganttApi = OGE_GANTT_API;
  protected readonly configApi = OGE_GANTT_CONFIG_API;
}
