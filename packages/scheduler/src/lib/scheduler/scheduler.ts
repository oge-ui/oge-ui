import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import {
  rangesOverlap,
  resolveFirstDayOfWeek,
  type DataSource,
} from '@oge-ui/core';
import type { OgeSchedulerMessages } from '../config';
import { OGE_SCHEDULER_CONFIG } from '../config';
import {
  normalizeAppointment,
  resolveSchedulerFields,
  type SchedulerAppointment,
  type SchedulerFieldExpr,
} from '../engine/scheduler-model';
import { navigateDate, viewRange } from '../engine/view-model';
import type {
  OgeSchedulerView,
  OgeSchedulerViewOptions,
} from '../scheduler-types';
import { OgeSchedulerDayWeekView } from './day-week-view';
import { OgeSchedulerMonthView } from './month-view';
import {
  OgeAppointmentTemplate,
  OgeDateHeaderTemplate,
  OgeSchedulerCellTemplate,
} from './scheduler-templates';

/** A resolved view-switcher entry. */
interface ResolvedView {
  readonly type: OgeSchedulerView;
  readonly name: string;
  readonly dayStartHour: number;
  readonly dayEndHour: number;
  readonly cellDuration: number;
}

/**
 * Signal-based scheduler / event calendar with day, week and month views —
 * commercial (`@oge-ui/scheduler`).
 *
 * ```html
 * <oge-scheduler
 *   [dataSource]="appointments"
 *   [(currentDate)]="date"
 *   [(currentView)]="view"
 *   [dayStartHour]="8"
 *   [dayEndHour]="19"
 * />
 * ```
 */
@Component({
  selector: 'oge-scheduler',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeSchedulerDayWeekView, OgeSchedulerMonthView],
  host: { class: 'oge-scheduler' },
  styleUrl: './scheduler.scss',
  template: `
    <div
      class="oge-scheduler-toolbar"
      role="toolbar"
      [attr.aria-label]="msg().toolbar.label"
    >
      <div class="oge-scheduler-nav">
        <button
          type="button"
          class="oge-scheduler-btn"
          (click)="goToday()"
        >
          {{ msg().toolbar.today }}
        </button>
        <button
          type="button"
          class="oge-scheduler-btn oge-scheduler-btn-icon"
          [attr.aria-label]="msg().toolbar.previous"
          (click)="navigate(-1)"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m10 3.5-4.5 4.5L10 12.5" />
          </svg>
        </button>
        <button
          type="button"
          class="oge-scheduler-btn oge-scheduler-btn-icon"
          [attr.aria-label]="msg().toolbar.next"
          (click)="navigate(1)"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 3.5 4.5 4.5L6 12.5" />
          </svg>
        </button>
      </div>
      <span class="oge-scheduler-title" aria-live="polite">{{
        periodTitle()
      }}</span>
      <div
        class="oge-scheduler-views"
        role="group"
        [attr.aria-label]="msg().toolbar.viewSwitcherLabel"
      >
        @for (entry of resolvedViews(); track entry.type) {
          <button
            type="button"
            class="oge-scheduler-btn oge-scheduler-view-btn"
            [class.oge-scheduler-view-active]="entry.type === currentView()"
            [attr.aria-pressed]="entry.type === currentView()"
            (click)="currentView.set(entry.type)"
          >
            {{ entry.name }}
          </button>
        }
      </div>
    </div>

    @switch (currentView()) {
      @case ('month') {
        <oge-scheduler-month-view
          [anchorDate]="currentDate()"
          [appointments]="visibleAppointments()"
          [firstDayOfWeek]="resolvedFirstDayOfWeek()"
          [maxAppointmentsPerCell]="maxAppointmentsPerCell()"
          [locale]="locale()"
          [messages]="msg().grid"
          [appointmentTemplate]="appointmentTemplate() ?? null"
          [cellTemplate]="cellTemplate() ?? null"
          (moreClick)="drillIntoDay($event)"
        />
      }
      @default {
        <oge-scheduler-day-week-view
          [view]="dayWeekView()"
          [anchorDate]="currentDate()"
          [appointments]="visibleAppointments()"
          [firstDayOfWeek]="resolvedFirstDayOfWeek()"
          [dayStartHour]="activeView().dayStartHour"
          [dayEndHour]="activeView().dayEndHour"
          [cellDuration]="activeView().cellDuration"
          [showAllDayPanel]="showAllDayPanel()"
          [showCurrentTimeIndicator]="showCurrentTimeIndicator()"
          [minAppointmentMinutes]="minAppointmentMinutes()"
          [locale]="locale()"
          [messages]="msg().grid"
          [appointmentTemplate]="appointmentTemplate() ?? null"
          [cellTemplate]="cellTemplate() ?? null"
          [dateHeaderTemplate]="dateHeaderTemplate() ?? null"
        />
      }
    }
  `,
})
export class OgeScheduler<T extends object = Record<string, unknown>> {
  private readonly config = inject(OGE_SCHEDULER_CONFIG);
  private readonly destroyRef = inject(DestroyRef);

  /** Appointment items: a plain array or any `@oge-ui/core` `DataSource`. */
  readonly dataSource = input<readonly T[] | DataSource<T> | null>(null);
  /** Key field or selector; defaults to `id`, falling back to the item index. */
  readonly keyExpr = input<string | ((item: T) => unknown) | undefined>(
    undefined,
  );

  readonly textExpr = input<SchedulerFieldExpr<T, unknown>>('text');
  readonly startDateExpr = input<SchedulerFieldExpr<T, unknown>>('startDate');
  readonly endDateExpr = input<SchedulerFieldExpr<T, unknown>>('endDate');
  readonly allDayExpr = input<SchedulerFieldExpr<T, unknown>>('allDay');
  readonly colorExpr = input<SchedulerFieldExpr<T, unknown>>('color');
  readonly descriptionExpr =
    input<SchedulerFieldExpr<T, unknown>>('description');
  readonly recurrenceRuleExpr =
    input<SchedulerFieldExpr<T, unknown>>('recurrenceRule');
  readonly recurrenceExceptionExpr = input<SchedulerFieldExpr<T, unknown>>(
    'recurrenceException',
  );
  readonly disabledExpr = input<SchedulerFieldExpr<T, unknown>>('disabled');

  /** The anchor date of the visible period (two-way). */
  readonly currentDate = model<Date>(new Date());
  /** The active view (two-way). */
  readonly currentView = model<OgeSchedulerView>('week');

  /** The views offered by the switcher, optionally with per-view overrides. */
  readonly views = input<
    readonly (OgeSchedulerView | OgeSchedulerViewOptions)[]
  >(['day', 'week', 'month']);

  /** First day of week (0 = Sunday); `undefined` resolves from the locale. */
  readonly firstDayOfWeek = input<number | undefined>(undefined);
  readonly dayStartHour = input(0);
  readonly dayEndHour = input(24);
  /** Slot raster in minutes. */
  readonly cellDuration = input(30);
  readonly showAllDayPanel = input(true);
  readonly showCurrentTimeIndicator = input(true);
  /** Month-view lane budget per cell; `'auto'` picks a sensible default. */
  readonly maxAppointmentsPerCell = input<number | 'auto'>('auto');
  /** BCP 47 locale for every `Intl` format; defaults to the browser locale. */
  readonly locale = input<string | undefined>(undefined);
  /** Per-instance overrides of the DI-configured messages. */
  readonly messages = input<Partial<OgeSchedulerMessages>>({});

  protected readonly appointmentTemplate = contentChild(
    OgeAppointmentTemplate<T>,
    { descendants: false },
  );
  protected readonly cellTemplate = contentChild(OgeSchedulerCellTemplate, {
    descendants: false,
  });
  protected readonly dateHeaderTemplate = contentChild(OgeDateHeaderTemplate, {
    descendants: false,
  });

  protected readonly msg = computed<OgeSchedulerMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly minAppointmentMinutes = computed(
    () => this.config.minAppointmentMinutes ?? 15,
  );

  protected readonly resolvedFirstDayOfWeek = computed(() =>
    resolveFirstDayOfWeek(this.firstDayOfWeek(), this.locale()),
  );

  protected readonly resolvedViews = computed<readonly ResolvedView[]>(() =>
    this.views().map((entry) => {
      const options: OgeSchedulerViewOptions =
        typeof entry === 'string' ? { type: entry } : entry;
      return {
        type: options.type,
        name: options.name ?? this.msg().toolbar.viewNames[options.type],
        dayStartHour: options.dayStartHour ?? this.dayStartHour(),
        dayEndHour: options.dayEndHour ?? this.dayEndHour(),
        cellDuration: options.cellDuration ?? this.cellDuration(),
      };
    }),
  );

  protected readonly activeView = computed<ResolvedView>(() => {
    const view = this.currentView();
    return (
      this.resolvedViews().find((entry) => entry.type === view) ?? {
        type: view,
        name: this.msg().toolbar.viewNames[view],
        dayStartHour: this.dayStartHour(),
        dayEndHour: this.dayEndHour(),
        cellDuration: this.cellDuration(),
      }
    );
  });

  protected readonly dayWeekView = computed<'day' | 'week'>(() =>
    this.currentView() === 'day' ? 'day' : 'week',
  );

  private readonly fields = computed(() =>
    resolveSchedulerFields<T>({
      textExpr: this.textExpr(),
      startDateExpr: this.startDateExpr(),
      endDateExpr: this.endDateExpr(),
      allDayExpr: this.allDayExpr(),
      colorExpr: this.colorExpr(),
      descriptionExpr: this.descriptionExpr(),
      recurrenceRuleExpr: this.recurrenceRuleExpr(),
      recurrenceExceptionExpr: this.recurrenceExceptionExpr(),
      disabledExpr: this.disabledExpr(),
    }),
  );

  /** Items loaded from a `DataSource` (arrays bypass this signal). */
  private readonly loadedItems = signal<readonly T[]>([]);
  private loadEpoch = 0;

  constructor() {
    // reload whenever the DataSource instance changes; arrays are pass-through
    effect(() => {
      const source = this.dataSource();
      if (source === null || Array.isArray(source)) return;
      const epoch = ++this.loadEpoch;
      void (source as DataSource<T>)
        .load({})
        .then((result) => {
          if (epoch !== this.loadEpoch) return;
          this.loadedItems.set(result.data as readonly T[]);
        })
        .catch(() => {
          if (epoch === this.loadEpoch) this.loadedItems.set([]);
        });
    });
    this.destroyRef.onDestroy(() => {
      this.loadEpoch++;
    });
  }

  private readonly items = computed<readonly T[]>(() => {
    const source = this.dataSource();
    if (source === null) return [];
    if (Array.isArray(source)) return source;
    return this.loadedItems();
  });

  private readonly keyOf = computed<(item: T, index: number) => unknown>(() => {
    const keyExpr = this.keyExpr();
    if (typeof keyExpr === 'function') return (item) => keyExpr(item);
    const field = keyExpr ?? 'id';
    return (item, index) => {
      const value = (item as Record<string, unknown>)[field];
      return value === undefined ? index : value;
    };
  });

  /** Every normalized appointment (unfiltered). */
  private readonly appointments = computed<
    readonly SchedulerAppointment<T>[]
  >(() => {
    const fields = this.fields();
    const keyOf = this.keyOf();
    const result: SchedulerAppointment<T>[] = [];
    this.items().forEach((item, index) => {
      const appointment = normalizeAppointment(item, keyOf(item, index), fields);
      if (appointment !== null) result.push(appointment);
    });
    return result;
  });

  /** Appointments overlapping the visible period (client-side window). */
  protected readonly visibleAppointments = computed<
    readonly SchedulerAppointment<T>[]
  >(() => {
    const { start, end } = viewRange(
      this.currentView(),
      this.currentDate(),
      this.resolvedFirstDayOfWeek(),
    );
    return this.appointments().filter(
      (appointment) =>
        rangesOverlap(appointment.startDate, appointment.endDate, start, end) ||
        (appointment.startDate.getTime() === appointment.endDate.getTime() &&
          appointment.startDate.getTime() >= start.getTime() &&
          appointment.startDate.getTime() < end.getTime()),
    );
  });

  protected readonly periodTitle = computed(() => {
    const view = this.currentView();
    const date = this.currentDate();
    const locale = this.locale();
    if (view === 'day') {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(
        date,
      );
    }
    if (view === 'month') {
      return new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
      }).format(date);
    }
    const { start, end } = viewRange(
      'week',
      date,
      this.resolvedFirstDayOfWeek(),
    );
    const last = new Date(end.getTime() - 1);
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).formatRange(start, last);
  });

  /** Moves the visible period to today. */
  goToday(): void {
    this.currentDate.set(new Date());
  }

  /** Steps the visible period backwards (`-1`) or forwards (`1`). */
  navigate(direction: -1 | 1): void {
    this.currentDate.set(
      navigateDate(this.currentView(), untracked(this.currentDate), direction),
    );
  }

  protected drillIntoDay(date: Date): void {
    this.currentDate.set(date);
    this.currentView.set('day');
  }
}
