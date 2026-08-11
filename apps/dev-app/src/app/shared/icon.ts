import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'book'
  | 'sliders'
  | 'table'
  | 'sort'
  | 'zap'
  | 'activity'
  | 'infinity'
  | 'globe'
  | 'search'
  | 'filter'
  | 'layout'
  | 'palette'
  | 'gauge'
  | 'package'
  | 'lightbulb'
  | 'pages'
  | 'chevron-down'
  | 'check-square'
  | 'sun'
  | 'moon'
  | 'pencil'
  | 'columns'
  | 'pointer'
  | 'text-cursor'
  | 'code'
  | 'layers'
  | 'github'
  | 'heart'
  | 'list'
  | 'copy'
  | 'check'
  | 'arrow-right'
  | 'shield'
  | 'toggle'
  | 'calendar'
  | 'tabs'
  | 'accordion'
  | 'card'
  | 'splitter'
  | 'breadcrumb'
  | 'drawer'
  | 'loader'
  | 'menubar'
  | 'stepper'
  | 'toolbar'
  | 'tree'
  | 'workflow';

/** Lucide-style inline SVG icons — no emoji, no icon-font dependency. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0 items-center justify-center' },
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.width]="size()"
      [attr.height]="size()"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('book') {
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path
            d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
          />
        }
        @case ('sliders') {
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        }
        @case ('table') {
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
          <path d="M12 3v18" />
        }
        @case ('sort') {
          <path d="m21 16-4 4-4-4" />
          <path d="M17 20V4" />
          <path d="m3 8 4-4 4 4" />
          <path d="M7 4v16" />
        }
        @case ('zap') {
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        }
        @case ('activity') {
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        }
        @case ('infinity') {
          <path
            d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"
          />
        }
        @case ('globe') {
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        }
        @case ('filter') {
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        }
        @case ('layout') {
          <rect x="3" y="3" width="18" height="7" rx="1" />
          <rect x="3" y="14" width="9" height="7" rx="1" />
          <rect x="16" y="14" width="5" height="7" rx="1" />
        }
        @case ('palette') {
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
          <path
            d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
          />
        }
        @case ('gauge') {
          <path d="m12 14 4-4" />
          <path d="M3.34 19a10 10 0 1 1 17.32 0" />
        }
        @case ('package') {
          <path d="m7.5 4.27 9 5.15" />
          <path
            d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
          />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        }
        @case ('lightbulb') {
          <path
            d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
          />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        }
        @case ('pages') {
          <path d="M2 3v18" />
          <rect x="6" y="3" width="12" height="18" rx="2" />
          <path d="M22 3v18" />
        }
        @case ('chevron-down') {
          <path d="m6 9 6 6 6-6" />
        }
        @case ('check-square') {
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        }
        @case ('toggle') {
          <rect x="1" y="5" width="22" height="14" rx="7" />
          <circle cx="16" cy="12" r="3" />
        }
        @case ('calendar') {
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18M8 2v4M16 2v4" />
        }
        @case ('tabs') {
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M2 9h20" />
          <path d="M8 4v5" />
          <path d="M14 4v5" />
        }
        @case ('tree') {
          <rect x="3" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="10" width="7" height="5" rx="1" />
          <rect x="14" y="17" width="7" height="4" rx="1" />
          <path d="M6.5 8v9.5a1.5 1.5 0 0 0 1.5 1.5h6" />
          <path d="M6.5 12.5h7.5" />
        }
        @case ('accordion') {
          <rect x="3" y="3" width="18" height="5" rx="1" />
          <rect x="3" y="10" width="18" height="11" rx="1" />
          <path d="M15 5.5h3" />
          <path d="M15 12.5h3" />
        }
        @case ('splitter') {
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <path d="M12 4v16" />
          <path d="M9.5 10.5 7.5 12l2 1.5" />
          <path d="m14.5 10.5 2 1.5-2 1.5" />
        }
        @case ('stepper') {
          <circle cx="5" cy="12" r="2.5" />
          <circle cx="12" cy="12" r="2.5" />
          <circle cx="19" cy="12" r="2.5" />
          <path d="M7.5 12h2" />
          <path d="M14.5 12h2" />
        }
        @case ('breadcrumb') {
          <circle cx="4" cy="12" r="1.5" />
          <path d="m8.5 9.5 2.5 2.5-2.5 2.5" />
          <circle cx="14" cy="12" r="1.5" />
          <path d="m17.5 9.5 2.5 2.5-2.5 2.5" />
        }
        @case ('loader') {
          <path d="M12 3a9 9 0 1 1-9 9" />
        }
        @case ('menubar') {
          <rect x="3" y="5" width="18" height="5" rx="1" />
          <path d="M6 7.5h3" />
          <path d="M11 7.5h3" />
          <path d="M16 7.5h2" />
          <path d="M5 13h7v6H5z" />
        }
        @case ('drawer') {
          <rect x="3" y="4" width="18" height="16" rx="1" />
          <path d="M9 4v16" />
          <path d="M5.5 9h1.5" />
          <path d="M5.5 12h1.5" />
          <path d="M5.5 15h1.5" />
        }
        @case ('card') {
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 15h6" />
        }
        @case ('toolbar') {
          <rect x="3" y="4" width="18" height="6" rx="1" />
          <path d="M6.5 7h2" />
          <path d="M11 7h2" />
          <path d="M18 7h.01" />
          <path d="M3 14h18" />
          <path d="M3 18h12" />
        }
        @case ('workflow') {
          <circle cx="5" cy="7" r="2.5" />
          <rect x="10" y="4" width="7" height="6" rx="1.5" />
          <path d="M7.5 7h2.5" />
          <path d="M13.5 10v3" />
          <path d="M13.5 13.5 17 17l-3.5 3.5L10 17z" />
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
          />
        }
        @case ('moon') {
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        }
        @case ('pencil') {
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        }
        @case ('columns') {
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18" />
          <path d="M15 3v18" />
        }
        @case ('text-cursor') {
          <path d="M5 4h1a3 3 0 0 1 3 3 3 3 0 0 1 3-3h1" />
          <path d="M13 20h-1a3 3 0 0 1-3-3 3 3 0 0 1-3 3H5" />
          <path d="M9 7v10" />
          <rect x="15" y="9" width="6" height="6" rx="1" />
        }
        @case ('code') {
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        }
        @case ('layers') {
          <path
            d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"
          />
          <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
          <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
        }
        @case ('github') {
          <path
            d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
          />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        }
        @case ('heart') {
          <path
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          />
        }
        @case ('list') {
          <path d="M3 6h.01" />
          <path d="M8 6h13" />
          <path d="M3 12h.01" />
          <path d="M8 12h13" />
          <path d="M3 18h.01" />
          <path d="M8 18h13" />
        }
        @case ('copy') {
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        }
        @case ('check') {
          <path d="M20 6 9 17l-5-5" />
        }
        @case ('arrow-right') {
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        }
        @case ('shield') {
          <path
            d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
          />
        }
        @case ('pointer') {
          <path d="M22 14a8 8 0 0 1-8 8" />
          <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
          <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
          <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
          <path
            d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"
          />
        }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(16);
}
