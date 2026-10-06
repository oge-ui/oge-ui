import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeAvatar,
  OgeAvatarGroup,
  OgeBadge,
  type OgeAvatarItem,
} from '@oge-ui/layout';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_AVATAR_SECTIONS,
  ReactLayoutAvatarDemos,
} from '../react-layout/avatar';
import {
  ANNOUNCE_SNIPPET,
  CONFIG_SNIPPET,
  CONTENT_SNIPPET,
  GROUP_SNIPPET,
  OVERLAY_SNIPPET,
  SIZES_SNIPPET,
  STANDALONE_SNIPPET,
  STATUS_SNIPPET,
} from './avatar-snippets';

const SECTIONS = [
  'Image, initials & icon',
  'Sizes & shapes',
  'Presence status',
  'Avatar group',
  'Badge on an element',
  'Standalone badge & dot',
  'Live announcements',
  'Configuration',
] as const;

/** The demo team — shared by the group demos. */
export const AVATAR_DEMO_TEAM: readonly OgeAvatarItem[] = [
  { key: 1, name: 'Ada Lovelace', status: 'online' },
  { key: 2, name: 'Grace Hopper' },
  { key: 3, name: 'Alan Turing', status: 'away' },
  { key: 4, name: 'Edsger Dijkstra' },
  { key: 5, name: 'Barbara Liskov' },
  { key: 6, name: 'Donald Knuth' },
];

@Component({
  selector: 'app-layout-avatar',
  imports: [
    OgeAvatar,
    OgeAvatarGroup,
    OgeBadge,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutAvatarDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Avatar & Badge"
      category="Layout"
      categoryLink="/components/avatar"
      [chips]="['role=img', 'fallback chain', 'aria-describedby', '99+']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeAvatar&gt;</code>,
          <code>&lt;OgeAvatarGroup&gt;</code> and
          <code>&lt;OgeBadge&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> render the same markup and load
          the same stylesheet as the Angular components. An avatar runs its own
          fallback chain — image, initials, icon — and names itself as one
          <code>role="img"</code>, presence included; a group collapses its
          surplus into "+N".
        </p>
      } @else {
        <p>
          <code>oge-avatar</code>, <code>oge-avatar-group</code> and
          <code>oge-badge</code>. An avatar runs its own fallback chain — image,
          initials, icon — and names itself as one <code>role="img"</code>,
          presence included; a group collapses its surplus into "+N".
        </p>
      }
      <p>
        A badge glyph is <strong>always <code>aria-hidden</code></strong
        >: a bare "5" next to a button says nothing. What a screen reader hears
        is the description — "5 new items" — wired into the wrapped control's
        <code>aria-describedby</code>, so it is read with the control's name.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-avatar-demos />
    } @else {
      <app-demo-card
        [chips]="['src', 'initials', 'icon', 'imageFailed']"
        heading="Image, initials & icon"
        description="The fallback chain runs on its own: the image while <code>src</code> loads, the initials (explicit, or derived from <code>name</code> — first and last word, upper-cased in the locale) when it fails, the person icon without either. A new <code>src</code> gets a fresh attempt."
        [code]="contentSnippet"
        language="ts"
      >
        <div class="demo-row demo-row-start">
          <oge-avatar name="OGE UI" src="/logo.png" />
          <oge-avatar
            name="Ada Lovelace"
            src="/missing-avatar.png"
            (imageFailed)="failed.set($event.src)"
          />
          <oge-avatar name="Grace Hopper" initials="GH" />
          <oge-avatar ariaLabel="Guest" />
        </div>
        <p class="mt-2 text-sm opacity-70" data-testid="avatar-failed">
          imageFailed → {{ failed() || '—' }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['size', 'shape']"
        heading="Sizes & shapes"
        description="Five sizes (24 to 64 px) on one host-local knob, so the image, the initials and the icon all fill the same box and the fallback never shifts layout. <code>rounded</code> uses the <code>--oge-radius-lg</code> token."
        [code]="sizesSnippet"
        language="ts"
      >
        <div class="demo-row demo-row-start">
          @for (size of sizes; track size) {
            <oge-avatar name="Ada Lovelace" [size]="size" />
          }
          <oge-avatar name="Grace Hopper" size="lg" shape="rounded" />
          <oge-avatar name="Alan Turing" size="lg" shape="square" />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['status', 'decorative']"
        heading="Presence status"
        description='The dot is <code>aria-hidden</code>; the presence joins the accessible name ("Ada Lovelace (Online)") through the catalog&rsquo;s <code>withStatus</code> pattern. Offline is a hollow ring, so the state never rides on colour alone. Beside a visible name, <code>decorative</code> hides the avatar from assistive technology.'
        [code]="statusSnippet"
        language="ts"
      >
        <div class="demo-row demo-row-start">
          <oge-avatar name="Ada Lovelace" status="online" />
          <oge-avatar name="Grace Hopper" status="away" />
          <oge-avatar name="Alan Turing" status="busy" />
          <oge-avatar name="Edsger Dijkstra" status="offline" />
          <span class="inline-flex items-center gap-2 text-sm">
            <oge-avatar name="Ada Lovelace" size="sm" [decorative]="true" />
            Ada Lovelace
          </span>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['items', 'max', 'total', 'overlap']"
        heading="Avatar group"
        description='<code>max</code> counts the rendered circles <strong>including</strong> the surplus one, so the row never grows past it; <code>total</code> adds the rest of a partially loaded list. The "+N" avatar is a <code>role="img"</code> named "N more", and the group a labelled <code>role="group"</code>.'
        [code]="groupSnippet"
        language="ts"
      >
        <div class="flex flex-col items-start gap-3">
          <oge-avatar-group [items]="team" [max]="4" ariaLabel="Project team" />
          <oge-avatar-group
            [items]="reviewers"
            [max]="4"
            [total]="24"
            size="sm"
            ariaLabel="Reviewers"
          />
          <oge-avatar-group [overlap]="false" ariaLabel="On call">
            <oge-avatar name="Ada Lovelace" status="online" />
            <oge-avatar name="Grace Hopper" status="busy" />
          </oge-avatar-group>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['value', 'max', 'position', 'overlap', 'aria-describedby']"
        heading="Badge on an element"
        description='Content inside the badge becomes its anchor. The glyph sits on a logical corner (mirrors in RTL) and is <code>aria-hidden</code>; the wrapped control&rsquo;s <code>aria-describedby</code> points at the description, so a screen reader hears "Inbox, 5 new items". Above <code>max</code> it shows 99+; <code>overlap="circle"</code> sits on a round host&rsquo;s outline.'
        [code]="overlaySnippet"
        language="ts"
      >
        <div class="demo-row demo-row-start gap-6">
          <oge-badge [value]="unread()">
            <button
              type="button"
              class="rounded border px-3 py-1.5 text-sm"
              (click)="unread.set(unread() + 1)"
            >
              Inbox
            </button>
          </oge-badge>
          <oge-badge [value]="120" severity="accent" position="bottom-end">
            <button type="button" class="rounded border px-3 py-1.5 text-sm">
              Notifications
            </button>
          </oge-badge>
          <oge-badge
            [dot]="true"
            severity="success"
            overlap="circle"
            description="Available"
          >
            <oge-avatar name="Grace Hopper" />
          </oge-badge>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['dot', 'showZero', 'severity', 'size']"
        heading="Standalone badge & dot"
        description='Without content the badge is an inline pill with a visually hidden description. A zero count hides unless <code>showZero</code>; <code>invisible</code> force-hides; a string value ("Beta") reads itself.'
        [code]="standaloneSnippet"
        language="ts"
      >
        <div class="demo-row demo-row-start gap-6 text-sm">
          <span>Messages <oge-badge [value]="3" /></span>
          <span>Plan <oge-badge value="Beta" severity="accent" /></span>
          <span
            >Updates <oge-badge [dot]="true" description="New updates"
          /></span>
          <span
            >Errors
            <oge-badge
              [value]="0"
              [showZero]="true"
              severity="neutral"
              size="sm"
          /></span>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['announce', 'aria-live=polite']"
        heading="Live announcements"
        description="<code>announce</code> speaks later changes through a polite live region. The initial value is part of the page and is never announced — only what changes while the reader is there."
        [code]="announceSnippet"
        language="ts"
      >
        <div class="demo-row demo-row-start gap-4">
          <oge-badge
            [value]="cart()"
            [announce]="true"
            description="{{ cart() }} items in cart"
          >
            <button type="button" class="rounded border px-3 py-1.5 text-sm">
              Cart
            </button>
          </oge-badge>
          <button
            type="button"
            class="rounded border px-3 py-1.5 text-sm"
            (click)="cart.set(cart() + 1)"
          >
            Add item
          </button>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['provideOgeAvatarConfig', 'provideOgeBadgeConfig']"
        heading="Configuration"
        description='Application- or component-scoped defaults. Every user-facing string — presence labels, "N more", the badge descriptions and the "99+" pattern — lives in a messages catalog, and the ready-made language packs cover it.'
        [code]="configSnippet"
        language="ts"
      >
        <div class="demo-row demo-row-start gap-4">
          <oge-avatar name="Ada Lovelace" status="busy" />
          <oge-badge [value]="12" />
        </div>
      </app-demo-card>
    }
  `,
})
export class LayoutAvatarPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_AVATAR_SECTIONS;

  protected readonly contentSnippet = CONTENT_SNIPPET;
  protected readonly sizesSnippet = SIZES_SNIPPET;
  protected readonly statusSnippet = STATUS_SNIPPET;
  protected readonly groupSnippet = GROUP_SNIPPET;
  protected readonly overlaySnippet = OVERLAY_SNIPPET;
  protected readonly standaloneSnippet = STANDALONE_SNIPPET;
  protected readonly announceSnippet = ANNOUNCE_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
  protected readonly team = AVATAR_DEMO_TEAM;
  protected readonly reviewers = AVATAR_DEMO_TEAM.slice(0, 3);
  protected readonly failed = signal('');
  protected readonly unread = signal(5);
  protected readonly cart = signal(1);
}
