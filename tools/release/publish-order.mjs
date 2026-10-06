#!/usr/bin/env node
/**
 * Prints the dist folder of every publishable package, one per line, in
 * dependency order (dependencies first). Used by .github/workflows/release.yml.
 *
 *   node tools/release/publish-order.mjs
 */
import { publishablePackages, publishOrder } from './publishable.mjs';

for (const pkg of publishOrder(publishablePackages())) console.log(pkg.dist);
