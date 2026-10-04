import { readFileSync } from 'node:fs';
import ts from 'typescript';

/**
 * Reads `appRoutes` out of the dev-app's route file with the TypeScript AST —
 * the file cannot be imported (it pulls in Angular), and a regex would miss the
 * nested `children` arrays.
 *
 * Returns one entry per navigable page, parents before children, in source
 * order. Pure redirects are skipped.
 *
 * @param {string} routesFile absolute path to `app.routes.ts`
 * @returns {RoutePage[]}
 */
export function readRoutes(routesFile) {
  const text = readFileSync(routesFile, 'utf8');
  const source = ts.createSourceFile(
    routesFile,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const routesArray = findRoutesArray(source);
  if (!routesArray) {
    throw new Error(`Could not find an \`appRoutes\` array in ${routesFile}`);
  }
  /** @type {RoutePage[]} */
  const pages = [];
  collect(routesArray, '', pages);
  return pages;
}

/**
 * @typedef {object} RoutePage
 * @property {string} path full route without a leading slash (`''` for home)
 * @property {string} title raw document title
 * @property {string} label the title without the `OGE — ` prefix
 * @property {string | null} source the `loadComponent` import specifier,
 *   relative to `app.routes.ts` (`./pages/tabs/routed`), when there is one
 * @property {string | null} landing where the page actually lands when its
 *   empty child path redirects (`components/tabs/routed/overview`) — the
 *   page's own URL is then a redirect stub, so the sitemap lists this instead
 */

/** @param {ts.SourceFile} source */
function findRoutesArray(source) {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      if (declaration.name.text !== 'appRoutes') continue;
      const initializer = declaration.initializer;
      if (initializer && ts.isArrayLiteralExpression(initializer)) {
        return initializer;
      }
    }
  }
  return null;
}

/**
 * @param {ts.ArrayLiteralExpression} array
 * @param {string} prefix
 * @param {RoutePage[]} out
 */
function collect(array, prefix, out) {
  for (const element of array.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;
    const route = readRouteProps(element);
    if (route.redirectTo !== undefined) continue;
    const path = joinPath(prefix, route.path ?? '');
    // A route can carry both a component and children (routed tabs) — the page
    // itself comes first so the flat list stays in reading order.
    if (route.title !== undefined) {
      out.push({
        path,
        title: route.title,
        label: stripBrand(route.title),
        source: route.source ?? null,
        landing: route.children ? landingOf(route.children, path) : null,
      });
    }
    if (route.children) collect(route.children, path, out);
  }
}

/**
 * The target of an empty-path child redirect (`{ path: '', redirectTo: … }`),
 * joined onto `path`; `null` when the route renders at its own URL.
 *
 * @param {ts.ArrayLiteralExpression} children
 * @param {string} path
 */
function landingOf(children, path) {
  for (const element of children.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;
    const child = readRouteProps(element);
    if ((child.path ?? '') === '' && child.redirectTo !== undefined) {
      return joinPath(path, child.redirectTo);
    }
  }
  return null;
}

/**
 * @param {ts.ObjectLiteralExpression} node
 * @returns {{ path?: string, title?: string, redirectTo?: string, source?: string, children?: ts.ArrayLiteralExpression }}
 */
function readRouteProps(node) {
  /** @type {Record<string, unknown>} */
  const props = {};
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = propertyName(property.name);
    if (name === null) continue;
    const value = property.initializer;
    if (ts.isStringLiteralLike(value)) {
      props[name] = value.text;
    } else if (name === 'children' && ts.isArrayLiteralExpression(value)) {
      props[name] = value;
    } else if (name === 'redirectTo') {
      // `keepQuery('overview')` — the helper that keeps the query string
      const [target] = ts.isCallExpression(value) ? value.arguments : [];
      props[name] = target && ts.isStringLiteralLike(target) ? target.text : '';
    } else if (name === 'loadComponent') {
      const specifier = dynamicImportOf(value);
      if (specifier) props.source = specifier;
    }
  }
  return props;
}

/** The specifier of the first `import('…')` inside `node`. */
function dynamicImportOf(node) {
  let found = null;
  const visit = (child) => {
    if (found) return;
    if (
      ts.isCallExpression(child) &&
      child.expression.kind === ts.SyntaxKind.ImportKeyword &&
      child.arguments[0] &&
      ts.isStringLiteralLike(child.arguments[0])
    ) {
      found = child.arguments[0].text;
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

/** @param {ts.PropertyName} name */
function propertyName(name) {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteralLike(name)) return name.text;
  return null;
}

function joinPath(prefix, segment) {
  if (!segment) return prefix;
  if (!prefix) return segment;
  return `${prefix}/${segment}`;
}

/** `OGE — Data Grid Filtering` → `Data Grid Filtering`. */
function stripBrand(title) {
  return title.replace(/^OGE\s*[—–-]\s*/u, '').trim();
}

/**
 * Reads the longest-prefix description table out of `seo.service.ts` so the
 * `llms.txt` link notes match the meta descriptions search engines see.
 *
 * @param {string} seoFile absolute path to `seo.service.ts`
 * @returns {{ prefix: string, description: string }[]} specific → general
 */
export function readSeoDescriptions(seoFile) {
  const text = readFileSync(seoFile, 'utf8');
  const source = ts.createSourceFile(
    seoFile,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  /** @type {{ prefix: string, description: string }[]} */
  const entries = [];
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'DESCRIPTIONS'
    ) {
      const array = unwrapAs(node.initializer);
      if (array && ts.isArrayLiteralExpression(array)) {
        for (const element of array.elements) {
          const pair = unwrapAs(element);
          if (!pair || !ts.isArrayLiteralExpression(pair)) continue;
          const [prefix, description] = pair.elements;
          if (
            prefix &&
            description &&
            ts.isStringLiteralLike(prefix) &&
            ts.isStringLiteralLike(description)
          ) {
            entries.push({
              prefix: prefix.text,
              description: description.text,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return entries;
}

/** `[…] as const satisfies X` → the array literal. */
function unwrapAs(node) {
  let current = node;
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isParenthesizedExpression(current))
  ) {
    current = current.expression;
  }
  return current ?? null;
}
