#!/usr/bin/env node
/**
 * Checks the Lemon Squeezy setup behind `/license/claim` before it goes live,
 * and can run a real claim against a (test-mode) order without deploying.
 *
 *   LEMONSQUEEZY_API_KEY=… LEMONSQUEEZY_STORE_ID=… [LEMONSQUEEZY_PRODUCT_ID=…] \
 *     node tools/license/check-store.mjs [--order 1001 --email buyer@example.com]
 *
 * The private key comes from `OGE_LICENSE_PRIVATE_KEY`, else
 * `~/.oge-license/private-key.pem` — the same lookup as `issue.mjs`.
 *
 * Checks, in order:
 *  1. the signing key matches the public key embedded in `@oge-ui/core`
 *     (a mismatch means every claimed key would be rejected as invalid);
 *  2. the API key works and says whether it is a test-mode key;
 *  3. the store exists and is the one the API key belongs to;
 *  4. the product exists, belongs to that store, is published and every
 *     variant is a single payment (renewals of a subscription create no new
 *     order, so the claim endpoint could not extend the key);
 *  5. with `--order/--email`, the claim endpoint itself answers for that
 *     order, exactly as the docs site would.
 *
 * Nothing is written anywhere; the API key only needs read access.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { loadPrivateKey, publicKeyOf } from './sign.mjs';

const API = 'https://api.lemonsqueezy.com/v1';
const { values } = parseArgs({
  options: { order: { type: 'string' }, email: { type: 'string' } },
});

let failures = 0;
const ok = (msg) => console.log(`  ✔ ${msg}`);
const bad = (msg) => {
  failures += 1;
  console.log(`  ✖ ${msg}`);
};
const note = (msg) => console.log(`  • ${msg}`);

async function lemon(path) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Accept: 'application/vnd.api+json',
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.errors?.[0]?.detail ?? res.statusText;
    throw new Error(`${res.status} ${detail}`);
  }
  return body;
}

// 1. signing key ↔ embedded public key
console.log('Signing key');
const pem =
  process.env.OGE_LICENSE_PRIVATE_KEY ??
  (() => {
    try {
      return readFileSync(
        join(homedir(), '.oge-license', 'private-key.pem'),
        'utf8',
      );
    } catch {
      return '';
    }
  })();
const coreSource = readFileSync(
  new URL(
    '../../packages/core/src/lib/license/license-key.ts',
    import.meta.url,
  ),
  'utf8',
);
const embedded = coreSource.match(/OGE_LICENSE_PUBLIC_KEY =\s*'([^']+)'/)?.[1];
if (!pem) {
  bad(
    'no private key: set OGE_LICENSE_PRIVATE_KEY or create ~/.oge-license/private-key.pem',
  );
} else {
  try {
    const derived = publicKeyOf(loadPrivateKey(pem));
    if (derived === embedded)
      ok('matches the public key embedded in @oge-ui/core');
    else bad(`does NOT match @oge-ui/core (${derived} ≠ ${embedded})`);
  } catch (error) {
    bad(`unreadable private key: ${error.message}`);
  }
}

// 2–4. Lemon Squeezy
console.log('\nLemon Squeezy');
const { LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_PRODUCT_ID } =
  process.env;
if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID) {
  bad('LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID are required');
} else {
  try {
    const me = await lemon('/users/me');
    const testMode = me.meta?.test_mode;
    ok(`API key works (${me.data?.attributes?.email ?? 'user'})`);
    note(
      testMode
        ? 'TEST-mode key — orders are test orders'
        : 'LIVE-mode key — real orders',
    );

    const store = (await lemon(`/stores/${LEMONSQUEEZY_STORE_ID}`)).data;
    ok(`store ${store.id}: ${store.attributes.name} (${store.attributes.url})`);

    if (!LEMONSQUEEZY_PRODUCT_ID) {
      note(
        'LEMONSQUEEZY_PRODUCT_ID not set — any product of the store will grant a key',
      );
    } else {
      const product = (await lemon(`/products/${LEMONSQUEEZY_PRODUCT_ID}`))
        .data;
      const a = product.attributes;
      if (String(a.store_id) === String(LEMONSQUEEZY_STORE_ID)) {
        ok(
          `product ${product.id}: ${a.name} (${a.price_formatted ?? a.price})`,
        );
      } else {
        bad(
          `product ${product.id} belongs to store ${a.store_id}, not ${LEMONSQUEEZY_STORE_ID}`,
        );
      }
      if (a.status === 'published') ok('product is published');
      else
        bad(`product status is "${a.status}" — publish it before going live`);
      if (a.buy_now_url) note(`checkout link: ${a.buy_now_url}`);

      const variants =
        (await lemon(`/variants?filter[product_id]=${product.id}`)).data ?? [];
      for (const v of variants) {
        const va = v.attributes;
        if (va.status === 'pending') continue; // the hidden default variant
        if (va.is_subscription) {
          bad(
            `variant ${v.id} "${va.name}" is a subscription — make it a single payment`,
          );
        } else {
          ok(
            `variant ${v.id} "${va.name}": single payment, $${(va.price / 100).toFixed(2)}`,
          );
        }
      }
    }
  } catch (error) {
    bad(`Lemon Squeezy API: ${error.message}`);
  }
}

// 5. a real claim, through the same handler the docs site runs
if (values.order && values.email) {
  console.log(`\nClaim for order ${values.order} / ${values.email}`);
  if (!process.env.OGE_LICENSE_PRIVATE_KEY && pem) {
    process.env.OGE_LICENSE_PRIVATE_KEY = pem;
  }
  const { default: handler } = await import('../../api/license/claim.mjs');
  const res = {
    statusCode: 0,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader() {
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await handler(
    { method: 'POST', body: { order: values.order, email: values.email } },
    res,
  );
  if (res.statusCode === 200) {
    ok(
      `key issued: ${res.body.seats} seat(s), licensee "${res.body.licensee}", expires ${res.body.expires}`,
    );
    note(res.body.key);
  } else {
    bad(`HTTP ${res.statusCode}: ${res.body?.error}`);
  }
}

console.log(
  failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`,
);
process.exitCode = failures === 0 ? 0 : 1;
