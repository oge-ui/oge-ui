import { Location } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/**
 * Render layers the docs can show. Adding one — a vanilla-JavaScript layer is
 * the next candidate — means adding it here and to `FRAMEWORKS` below, plus
 * listing the families that ship it in `COVERAGE`. Nothing else in the docs
 * hard-codes the set.
 */
export type DocsFramework = 'angular' | 'react';

export interface FrameworkMeta {
  readonly id: DocsFramework;
  readonly label: string;
}

/** Order matters — this is the order the switch renders. */
export const FRAMEWORKS: readonly FrameworkMeta[] = [
  { id: 'angular', label: 'Angular' },
  { id: 'react', label: 'React' },
];

/**
 * Which pages exist in which layer. Angular is implied for everything, so only
 * the newer layers are listed. A family maps to the sub-pages its layer
 * actually covers — `''` is the overview — because "the family shipped" and
 * "every page of the family reads correctly" are different claims: a React
 * reader on an uncovered sub-page must get the shell notice, not silent
 * Angular content. When a layer reaches parity for a whole family, replace
 * the list with `'*'`.
 */
const COVERAGE: Readonly<
  Record<DocsFramework, Readonly<Record<string, readonly string[] | '*'>>>
> = {
  angular: {},
  react: {
    buttons: '*',
    // The layout package ships as five route families; each covers its
    // overview and its API page.
    accordion: ['', 'api'],
    card: ['', 'api'],
    progress: ['', 'api'],
    splitter: ['', 'api'],
    toolbar: ['', 'api'],
    // the API page is mirrored; only `routed` is Angular-router-driven, so
    // React readers get the shell notice there (see docs/REACT-PARITY.md)
    tabs: ['', 'api'],
    inputs: '*',
    // The navigation package ships as six route families. The tree view owns
    // the family's overview and API pages; the rest are single-page families.
    'tree-view': ['', 'api'],
    stepper: '*',
    drawer: '*',
    pagination: '*',
    // `routed` demos Angular-router integration on both of these, so React
    // readers get the shell notice there (see docs/REACT-PARITY.md).
    breadcrumb: [''],
    menubar: [''],
  },
};

const STORAGE_KEY = 'oge-docs-framework';

/**
 * Which render layer the docs are currently showing.
 *
 * The choice is **global and sticky**, not per page — the pattern Ionic and the
 * DevExtreme demo gallery use, and the reason the docs stay one site rather
 * than two bolted together (ADR 0001). A reader picks React once and every
 * component page follows; the sidebar never doubles up, and no navigation is
 * needed to switch.
 *
 * It also rides in the URL as `?framework=react`, so a link someone pastes into
 * a chat opens on the framework they were reading — while the route itself
 * stays framework-free, which keeps the sitemap and the SEO descriptions single.
 */
@Injectable({ providedIn: 'root' })
export class FrameworkService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  private readonly current = signal<DocsFramework>(readInitial());

  readonly frameworks = FRAMEWORKS;
  readonly framework = this.current.asReadonly();
  readonly isReact = computed(() => this.current() === 'react');

  /**
   * Component family of the page being read, derived from the URL — so the
   * shell can tell whether the current page exists in the chosen framework
   * without every page having to declare it.
   */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly currentFamily = computed(() => familyOf(this.currentUrl()));

  /**
   * `false` when the reader has chosen a framework this page does not exist in
   * — the shell then says so instead of quietly showing the Angular version and
   * letting them copy the wrong syntax. Checked per page, not per family: a
   * family can be shipped while some of its sub-pages are still Angular-only.
   */
  readonly currentPageSupported = computed(() => {
    const family = this.currentFamily();
    if (family === null) return true;
    return this.supportsPage(
      family,
      subpathOf(this.currentUrl()),
      this.current(),
    );
  });

  /** Whether `family` ships in `framework` at all (gallery badges, the switch). */
  supports(family: string, framework: DocsFramework): boolean {
    return framework === 'angular' || family in COVERAGE[framework];
  }

  /** Whether one page of `family` (`''` = overview) exists in `framework`. */
  supportsPage(
    family: string,
    subpath: string,
    framework: DocsFramework,
  ): boolean {
    if (framework === 'angular') return true;
    const pages = COVERAGE[framework][family];
    if (pages === undefined) return false;
    return pages === '*' || pages.includes(subpath);
  }

  set(framework: DocsFramework): void {
    if (framework === this.current()) return;
    this.current.set(framework);
    try {
      localStorage.setItem(STORAGE_KEY, framework);
    } catch {
      // private browsing — the in-memory choice still works for this session
    }
    // Replace rather than push: switching framework is not a new destination,
    // and Back should leave the page, not toggle the reader between layers.
    // Built from the *browser's* URL (`Location`), not `router.url`: before
    // the router's initial navigation settles, `router.url` is still `/`, so
    // a reader who clicks the switch right after load would be thrown off the
    // page they were reading. (`navigate([], { relativeTo })` with the
    // service's root ActivatedRoute has the same failure permanently.)
    const tree = this.router.parseUrl(this.location.path());
    if (framework === 'angular') delete tree.queryParams['framework'];
    else tree.queryParams['framework'] = framework;
    void this.router.navigateByUrl(tree, { replaceUrl: true });
  }
}

function isFramework(value: string | null): value is DocsFramework {
  return FRAMEWORKS.some((entry) => entry.id === value);
}

function readInitial(): DocsFramework {
  if (typeof window === 'undefined') return 'angular';
  const fromUrl = new URLSearchParams(window.location.search).get('framework');
  if (isFramework(fromUrl)) return fromUrl;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isFramework(stored)) return stored;
  } catch {
    // ignore
  }
  return 'angular';
}

/**
 * `/components/buttons/api?x=1` → `'buttons'`; anything outside `/components`
 * (guides, the home page) → `null`, meaning "not about one component".
 */
function familyOf(url: string): string | null {
  const path = url.split('?')[0].split('#')[0];
  const match = /^\/components\/([^/]+)/.exec(path);
  return match ? match[1] : null;
}

/** `/components/buttons/api` → `'api'`; the family overview → `''`. */
function subpathOf(url: string): string {
  const path = url.split('?')[0].split('#')[0];
  const match = /^\/components\/[^/]+\/(.+)$/.exec(path);
  return match ? match[1] : '';
}
