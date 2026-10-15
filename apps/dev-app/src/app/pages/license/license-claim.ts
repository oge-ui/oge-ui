import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocHeader } from '../../shared/doc-header';
import { PRO_SALES_EMAIL } from '../../shared/pro-license';

interface ClaimedKey {
  key: string;
  licensee: string;
  seats: number;
  expires: string;
}

/**
 * `/license/claim` — trades a Lemon Squeezy order number + email for the
 * OGE UI Pro license key (`api/license/claim.mjs` signs it). Claiming again
 * returns an equivalent key, so this is also the "I lost my key" page.
 */
@Component({
  selector: 'app-license-claim',
  imports: [DocHeader, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Get your license key"
      category="Licensing"
      categoryLink="/license"
      [chips]="['OGE UI Pro']"
    >
      <p>
        Enter the order number from your receipt email and the address you
        bought with. You can come back here any time to retrieve the key again.
      </p>
    </app-doc-header>

    <form
      class="not-prose my-6 grid max-w-md gap-4"
      (submit)="claim($event)"
      aria-describedby="claim-help"
    >
      <label class="grid gap-1 text-sm font-medium">
        Order number
        <input
          name="order"
          required
          inputmode="numeric"
          autocomplete="off"
          placeholder="#12345"
          class="rounded-md border border-gray-300 px-3 py-2 font-normal dark:border-gray-600 dark:bg-gray-900"
        />
      </label>
      <label class="grid gap-1 text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          autocomplete="email"
          class="rounded-md border border-gray-300 px-3 py-2 font-normal dark:border-gray-600 dark:bg-gray-900"
        />
      </label>
      <button
        type="submit"
        class="justify-self-start rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        [disabled]="busy()"
      >
        {{ busy() ? 'Checking…' : 'Get my key' }}
      </button>
      <p id="claim-help" class="m-0 text-xs text-gray-600 dark:text-gray-400">
        Trouble? Write to
        <a [href]="'mailto:' + salesEmail">{{ salesEmail }}</a> with your order
        number.
      </p>
    </form>

    <div aria-live="polite">
      @if (error(); as message) {
        <p
          class="not-prose rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          role="alert"
        >
          {{ message }}
        </p>
      }
      @if (result(); as claimed) {
        <section
          class="not-prose rounded-xl border border-green-300 p-4 dark:border-green-800"
          aria-labelledby="claimed-key"
        >
          <h2 id="claimed-key" class="m-0 text-base font-semibold">
            License for {{ claimed.licensee }} — {{ claimed.seats }}
            {{ claimed.seats === 1 ? 'developer' : 'developers' }}
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Covers every release up to {{ claimed.expires }}, forever.
          </p>
          <textarea
            readonly
            rows="4"
            aria-label="License key"
            class="mt-3 w-full rounded-md border border-gray-300 p-2 font-mono text-xs break-all dark:border-gray-600 dark:bg-gray-900"
            [value]="claimed.key"
          ></textarea>
          <button
            type="button"
            class="mt-2 rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-gray-600"
            (click)="copy(claimed.key)"
          >
            {{ copied() ? 'Copied' : 'Copy key' }}
          </button>
          <p class="mt-3 text-sm">
            Next:
            <a routerLink="/license" fragment="license-key">register the key</a>
            with <code>ogeSetLicenseKey()</code>.
          </p>
        </section>
      }
    </div>
  `,
})
export class LicenseClaimPage {
  protected readonly salesEmail = PRO_SALES_EMAIL;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<ClaimedKey | null>(null);
  protected readonly copied = signal(false);

  protected async claim(event: Event): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.target as HTMLFormElement);
    this.busy.set(true);
    this.error.set(null);
    this.result.set(null);
    try {
      const response = await fetch('/api/license/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: form.get('order'),
          email: form.get('email'),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<
        ClaimedKey & { error: string }
      >;
      if (response.ok && typeof body.key === 'string') {
        this.result.set(body as ClaimedKey);
      } else {
        this.error.set(
          body.error ?? `The request failed (${response.status}).`,
        );
      }
    } catch {
      this.error.set(
        'Could not reach the server. Check your connection and try again.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async copy(key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(key);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // clipboard blocked: the textarea stays selectable
    }
  }
}
