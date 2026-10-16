/**
 * Every URL no prerendered file matches — reached through the catch-all
 * rewrite in `vercel.json`, which applies only after the filesystem misses.
 * Vercel serverless function (Node runtime).
 *
 * A static rewrite always answers 200, and with no rewrite at all Vercel's
 * Angular preset (detected from `@angular/core` even with `"framework": null`)
 * adds its own SPA fallback to the prerendered home page — also a 200, with
 * the home page's canonical. Search engines read both as soft 404s. This
 * function sends `404.html` (the client shell with `noindex`, written by
 * `tools/docs-tools/not-found-page.mjs` and bundled through `includeFiles`)
 * with a real 404 status; in the browser the router's `**` route renders the
 * not-found page.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'dist/apps/dev-app/browser/404.html');
const FALLBACK =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Page not found | OGE UI</title></head><body><h1>Page not found</h1><p><a href="/">OGE UI home</a></p></body></html>';

let page;

export default async function handler(req, res) {
  page ??= await readFile(PAGE, 'utf8').catch(() => FALLBACK);
  res
    .status(404)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    .setHeader('X-Robots-Tag', 'noindex')
    .send(req.method === 'HEAD' ? '' : page);
}
