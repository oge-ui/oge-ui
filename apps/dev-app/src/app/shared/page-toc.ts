import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { slugify } from './demo-card';
import { Icon } from './icon';

/**
 * "On this page" rail. Docks into the right gutter that `.doc-shell`
 * reserves whenever a page renders this component (see tailwind.css) and
 * follows the scroll, highlighting the section currently in view.
 *
 * Pass the demo headings verbatim — anchor ids are derived with the same
 * slugifier the demo cards use.
 *
 * ```html
 * <app-page-toc [sections]="['Severities & styling modes', 'Sizes']" />
 * ```
 */
@Component({
  selector: 'app-page-toc',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'absolute inset-y-0 right-0 hidden w-52 xl:block' },
  template: `
    <nav
      class="scrollbar-hide sticky top-20 max-h-[calc(100vh-6.5rem)] overflow-y-auto pb-6"
      aria-label="On this page"
    >
      <p
        class="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400"
      >
        <app-icon name="list" [size]="12" />
        On this page
      </p>
      <ul class="border-l border-gray-200 text-[13px] dark:border-gray-800">
        @for (item of items(); track item.id) {
          <li>
            <a
              [href]="'#' + item.id"
              (click)="scrollTo(item.id, $event)"
              class="-ml-px block border-l-2 py-1 pl-3 leading-snug transition-colors duration-150"
              [class]="
                activeId() === item.id
                  ? 'border-indigo-500 font-medium text-indigo-600 dark:border-indigo-400 dark:text-indigo-300'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-100'
              "
              >{{ item.label }}</a
            >
          </li>
        }
      </ul>
    </nav>
  `,
})
export class PageToc {
  /** Section headings, exactly as passed to the demo cards. */
  readonly sections = input.required<readonly string[]>();

  protected readonly items = computed(() =>
    this.sections().map((label) => ({ label, id: slugify(label) })),
  );

  /** Id of the section currently under the reading line (scroll spy). */
  protected readonly activeId = signal('');

  /**
   * Fragment hrefs resolve against `<base href="/">` and would route away
   * from the page — scroll manually and only update the hash in place.
   */
  protected scrollTo(id: string, event: Event): void {
    event.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', location.pathname + '#' + id);
    this.activeId.set(id);
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // Deep link: honor an incoming #fragment once the page has rendered.
      const hash = location.hash.slice(1);
      if (hash) {
        document
          .getElementById(hash)
          ?.scrollIntoView({ behavior: 'instant', block: 'start' });
      }

      const headings = this.items()
        .map((item) => document.getElementById(item.id))
        .filter((el): el is HTMLElement => el !== null);
      if (headings.length === 0) return;

      // The active section is the last heading above the reading line
      // (viewport top + sticky header offset), re-evaluated on scroll.
      let framePending = false;
      const pick = () => {
        framePending = false;
        let current = headings[0].id;
        for (const el of headings) {
          if (el.getBoundingClientRect().top <= 96) current = el.id;
        }
        // At the very bottom, the last section may never reach the reading
        // line — treat it as active anyway.
        const doc = document.documentElement;
        if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) {
          current = headings[headings.length - 1].id;
        }
        this.activeId.set(current);
      };
      const onScroll = () => {
        if (framePending) return;
        framePending = true;
        requestAnimationFrame(pick);
      };
      pick();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
    });
  }
}
