import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeAvatar,
  OgeAvatarConfigProvider,
  OgeAvatarGroup,
  OgeBadge,
  OgeBadgeConfigProvider,
  type OgeAvatarItem,
} from '@oge-ui/react-layout';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { LAYOUT_AVATAR_DEMOS } from './avatar-snippets';

/**
 * TOC of the React view — the same eight sections as the Angular avatar page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_LAYOUT_AVATAR_SECTIONS = [
  'Image, initials & icon',
  'Sizes & shapes',
  'Presence status',
  'Avatar group',
  'Badge on an element',
  'Standalone badge & dot',
  'Live announcements',
  'Configuration',
] as const;

const TEAM: readonly OgeAvatarItem[] = [
  { key: 1, name: 'Ada Lovelace', status: 'online' },
  { key: 2, name: 'Grace Hopper' },
  { key: 3, name: 'Alan Turing', status: 'away' },
  { key: 4, name: 'Edsger Dijkstra' },
  { key: 5, name: 'Barbara Liskov' },
  { key: 6, name: 'Donald Knuth' },
];
const REVIEWERS = TEAM.slice(0, 3);
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const BUTTON = 'rounded border px-3 py-1.5 text-sm';

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

function ContentDemo(): ReactNode {
  const [failed, setFailed] = useState('');
  return createElement(
    'div',
    null,
    row(
      createElement(OgeAvatar, {
        key: 'logo',
        name: 'OGE UI',
        src: '/logo.png',
      }),
      createElement(OgeAvatar, {
        key: 'ada',
        name: 'Ada Lovelace',
        src: '/missing-avatar.png',
        onImageFailed: (event) => setFailed(event.src),
      }),
      createElement(OgeAvatar, {
        key: 'gh',
        name: 'Grace Hopper',
        initials: 'GH',
      }),
      createElement(OgeAvatar, { key: 'guest', ariaLabel: 'Guest' }),
    ),
    createElement(
      'p',
      { className: 'mt-2 text-sm opacity-70', 'data-testid': 'avatar-failed' },
      `imageFailed → ${failed || '—'}`,
    ),
  );
}

function OverlayDemo(): ReactNode {
  const [unread, setUnread] = useState(5);
  return createElement(
    'div',
    { className: 'demo-row demo-row-start gap-6' },
    createElement(
      OgeBadge,
      { key: 'inbox', value: unread },
      createElement(
        'button',
        {
          type: 'button',
          className: BUTTON,
          onClick: () => setUnread(unread + 1),
        },
        'Inbox',
      ),
    ),
    createElement(
      OgeBadge,
      { key: 'notes', value: 120, severity: 'accent', position: 'bottom-end' },
      createElement(
        'button',
        { type: 'button', className: BUTTON },
        'Notifications',
      ),
    ),
    createElement(
      OgeBadge,
      {
        key: 'avatar',
        dot: true,
        severity: 'success',
        overlap: 'circle',
        description: 'Available',
      },
      createElement(OgeAvatar, { name: 'Grace Hopper' }),
    ),
  );
}

function AnnounceDemo(): ReactNode {
  const [cart, setCart] = useState(1);
  return createElement(
    'div',
    { className: 'demo-row demo-row-start gap-4' },
    createElement(
      OgeBadge,
      {
        key: 'cart',
        value: cart,
        announce: true,
        description: `${cart} items in cart`,
      },
      createElement('button', { type: 'button', className: BUTTON }, 'Cart'),
    ),
    createElement(
      'button',
      {
        key: 'add',
        type: 'button',
        className: BUTTON,
        onClick: () => setCart(cart + 1),
      },
      'Add item',
    ),
  );
}

/**
 * The React half of the avatar & badge page — the same eight demo sections
 * as the Angular page, rendered as real React trees inside
 * `/components/avatar` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-layout-avatar-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // the React components carry the class names but no styles of their own —
  // the docs pull the same SCSS the package build compiles
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../shared/react-layout-demo-base.scss',
  template: `
    @for (demo of demos; track demo.title; let i = $index) {
      <app-demo-card
        [heading]="demo.title"
        [description]="demo.description"
        [code]="demo.source"
        language="tsx"
      >
        <app-react-host [render]="renders[i]" />
      </app-demo-card>
    }
  `,
})
export class ReactLayoutAvatarDemos {
  protected readonly demos = LAYOUT_AVATAR_DEMOS;

  protected readonly renders: readonly (() => ReactNode)[] = [
    () => createElement(ContentDemo),
    () =>
      row(
        ...SIZES.map((size) =>
          createElement(OgeAvatar, { key: size, name: 'Ada Lovelace', size }),
        ),
        createElement(OgeAvatar, {
          key: 'rounded',
          name: 'Grace Hopper',
          size: 'lg',
          shape: 'rounded',
        }),
        createElement(OgeAvatar, {
          key: 'square',
          name: 'Alan Turing',
          size: 'lg',
          shape: 'square',
        }),
      ),
    () =>
      row(
        createElement(OgeAvatar, {
          key: 'a',
          name: 'Ada Lovelace',
          status: 'online',
        }),
        createElement(OgeAvatar, {
          key: 'g',
          name: 'Grace Hopper',
          status: 'away',
        }),
        createElement(OgeAvatar, {
          key: 't',
          name: 'Alan Turing',
          status: 'busy',
        }),
        createElement(OgeAvatar, {
          key: 'd',
          name: 'Edsger Dijkstra',
          status: 'offline',
        }),
        createElement(
          'span',
          { key: 'named', className: 'inline-flex items-center gap-2 text-sm' },
          createElement(OgeAvatar, {
            name: 'Ada Lovelace',
            size: 'sm',
            decorative: true,
          }),
          'Ada Lovelace',
        ),
      ),
    () =>
      createElement(
        'div',
        { className: 'flex flex-col items-start gap-3' },
        createElement(OgeAvatarGroup, {
          key: 'team',
          items: TEAM,
          max: 4,
          ariaLabel: 'Project team',
        }),
        createElement(OgeAvatarGroup, {
          key: 'reviewers',
          items: REVIEWERS,
          max: 4,
          total: 24,
          size: 'sm',
          ariaLabel: 'Reviewers',
        }),
        createElement(
          OgeAvatarGroup,
          { key: 'oncall', overlap: false, ariaLabel: 'On call' },
          createElement(OgeAvatar, {
            key: 'a',
            name: 'Ada Lovelace',
            status: 'online',
          }),
          createElement(OgeAvatar, {
            key: 'g',
            name: 'Grace Hopper',
            status: 'busy',
          }),
        ),
      ),
    () => createElement(OverlayDemo),
    () =>
      createElement(
        'div',
        { className: 'demo-row demo-row-start gap-6 text-sm' },
        createElement(
          'span',
          { key: 'm' },
          'Messages ',
          createElement(OgeBadge, { value: 3 }),
        ),
        createElement(
          'span',
          { key: 'p' },
          'Plan ',
          createElement(OgeBadge, { value: 'Beta', severity: 'accent' }),
        ),
        createElement(
          'span',
          { key: 'u' },
          'Updates ',
          createElement(OgeBadge, { dot: true, description: 'New updates' }),
        ),
        createElement(
          'span',
          { key: 'e' },
          'Errors ',
          createElement(OgeBadge, {
            value: 0,
            showZero: true,
            severity: 'neutral',
            size: 'sm',
          }),
        ),
      ),
    () => createElement(AnnounceDemo),
    () =>
      createElement(
        OgeAvatarConfigProvider,
        { config: { size: 'sm', messages: { busy: 'In a meeting' } } },
        createElement(
          OgeBadgeConfigProvider,
          { config: { max: 9, severity: 'accent' } },
          row(
            createElement(OgeAvatar, {
              key: 'a',
              name: 'Ada Lovelace',
              status: 'busy',
            }),
            createElement(OgeBadge, { key: 'b', value: 12 }),
          ),
        ),
      ),
  ];
}
