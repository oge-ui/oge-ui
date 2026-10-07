import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocHeader } from '../../shared/doc-header';
import { Icon, type IconName } from '../../shared/icon';

interface GuideLink {
  readonly path: string;
  readonly title: string;
  readonly icon: IconName;
  readonly summary: string;
}

interface GuideGroup {
  readonly id: string;
  readonly heading: string;
  readonly guides: readonly GuideLink[];
}

/** `/guides` — the index of the task-oriented guides. */
@Component({
  selector: 'app-guides',
  imports: [DocHeader, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header title="Guides" category="Guides" categoryLink="/guides">
      <p>
        Task-oriented guides for shipping OGE UI: rendering on a server, fitting
        it into your toolchain, testing, keeping it fast and secure, using the
        engines on their own, and what the accessibility and versioning promises
        cover. Each page follows the Angular / React switch.
      </p>
    </app-doc-header>

    @for (group of groups; track group.id) {
      <h2 [id]="group.id" class="scroll-mt-20">{{ group.heading }}</h2>
      <ul class="!my-3 grid list-none gap-3 !pl-0 sm:grid-cols-2">
        @for (guide of group.guides; track guide.path) {
          <li class="!my-0">
            <a
              [routerLink]="guide.path"
              class="flex h-full gap-3 rounded-lg border border-gray-200 p-4 no-underline transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 dark:border-gray-800 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30"
            >
              <app-icon
                [name]="guide.icon"
                [size]="18"
                class="mt-0.5 text-indigo-600 dark:text-indigo-400"
              />
              <span>
                <span
                  class="block font-semibold text-gray-900 dark:text-gray-100"
                  >{{ guide.title }}</span
                >
                <span
                  class="mt-1 block text-[13.5px] text-gray-600 dark:text-gray-400"
                  >{{ guide.summary }}</span
                >
              </span>
            </a>
          </li>
        }
      </ul>
    }
  `,
})
export class GuidesIndexPage {
  protected readonly groups: readonly GuideGroup[] = [
    {
      id: 'frameworks-and-tooling',
      heading: 'Frameworks and tooling',
      guides: [
        {
          path: '/guides/angular-ssr',
          title: 'Angular SSR, hydration and zoneless',
          icon: 'layers',
          summary:
            'Hydration with event replay, the replay fold for projected tabs and steps, ids, locale and zoneless apps.',
        },
        {
          path: '/guides/nextjs',
          title: 'Next.js App Router',
          icon: 'zap',
          summary:
            'Client boundaries, server rendering and hydration, locale on the server, CSS and providers.',
        },
        {
          path: '/guides/build-tools',
          title: 'Vite, Angular CLI and Nx',
          icon: 'package',
          summary:
            'Install, stylesheets and themes, ng add and its Nx fallback, shared setup facts.',
        },
        {
          path: '/guides/testing',
          title: 'Testing',
          icon: 'check-square',
          summary:
            'CDK harnesses and Testing Library helpers, TestBed and RTL recipes, stable selectors, jsdom gaps, Playwright tips.',
        },
      ],
    },
    {
      id: 'production',
      heading: 'Production',
      guides: [
        {
          path: '/guides/performance',
          title: 'Performance',
          icon: 'gauge',
          summary:
            'Virtualization knobs, remote data sources, loadSync, deferred families and bundle sizes.',
        },
        {
          path: '/guides/security',
          title: 'CSP and Trusted Types',
          icon: 'shield',
          summary:
            'A tested strict policy, nonces, the oge-ui#… policy names, URL and rich-text sanitizing.',
        },
        {
          path: '/guides/headless',
          title: 'Headless engines',
          icon: 'code',
          summary:
            'The framework-free cores in @oge-ui/core, @oge-ui/behavior and the family engines, and their licences.',
        },
      ],
    },
    {
      id: 'policies',
      heading: 'Accessibility and policies',
      guides: [
        {
          path: '/guides/accessibility',
          title: 'Accessibility',
          icon: 'user',
          summary:
            'WAI-ARIA patterns, keyboard maps per family, screen readers, user preferences and the axe gates.',
        },
        {
          path: '/guides/accessibility/conformance',
          title: 'Conformance report (ACR)',
          icon: 'check',
          summary:
            'WCAG 2.2 A and AA in the VPAT 2.5 format, self-assessed, with a remark per criterion.',
        },
        {
          path: '/guides/versioning',
          title: 'Versioning and deprecation',
          icon: 'tag',
          summary:
            'What a release may change, how deprecations are announced, supported versions and end of life.',
        },
      ],
    },
  ];
}
