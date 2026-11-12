import type { Rule, Tree } from '@angular-devkit/schematics';

/**
 * `ng generate @oge-ui/<package>:migrate-primeng` — moves the common PrimeNG
 * building blocks of an Angular app to OGE: buttons, dialogs, tooltips, trees
 * and `MenuItem` types, in templates (`.html` files and inline `template:`
 * strings) and in TypeScript imports.
 *
 * It is a codemod, not a compiler: what it cannot translate one-to-one it
 * leaves in place under a `TODO(oge-migrate)` note, and it never deletes a
 * PrimeNG element it does not know. Run it on a clean working tree and review
 * the diff; the summary lists every file it touched and every note it left.
 */

/** Options of the migrate-primeng schematic — mirrors its schema.json. */
export interface MigratePrimengOptions {
  /** Directory to migrate. Default `/src`. */
  readonly path?: string;
}

/** What one transform did. */
export interface MigrateResult {
  readonly text: string;
  /** Human-readable notes left for review (also written as TODO comments). */
  readonly notes: readonly string[];
  readonly changed: boolean;
}

const TODO = 'TODO(oge-migrate)';

// --- attribute parsing ---------------------------------------------------------

interface Attr {
  /** As written: `label`, `[label]`, `(onClick)`, `[(visible)]`. */
  name: string;
  /** Including quotes, or `null` for a bare attribute. */
  value: string | null;
}

const ATTR_RE =
  /([[(]{0,2}[A-Za-z_*#@][\w.:@-]*[\])]{0,2})(?:\s*=\s*("[^"]*"|'[^']*'))?/g;

function parseAttrs(source: string): Attr[] {
  const out: Attr[] = [];
  for (const match of source.matchAll(ATTR_RE)) {
    out.push({ name: match[1], value: match[2] ?? null });
  }
  return out;
}

function renderAttrs(attrs: readonly Attr[]): string {
  return attrs
    .map((a) => (a.value === null ? a.name : `${a.name}=${a.value}`))
    .join(' ');
}

/** The bare name of a binding: `[(visible)]` → `visible`. */
const bare = (name: string) => name.replace(/^[[(]+|[\])]+$/g, '');
/** Rewraps `to` in the brackets `from` had. */
const rewrap = (from: string, to: string) => from.replace(bare(from), to);
const unquote = (value: string | null) =>
  value === null ? null : value.slice(1, -1);

/**
 * Whether a boolean-ish PrimeNG flag is on: a bare attribute, `="true"`,
 * or `[x]="true"`. A bound expression (`[x]="flag"`) returns `'bound'`.
 */
function flagState(attr: Attr): boolean | 'bound' {
  const value = unquote(attr.value);
  if (value === null || value === '' || value === 'true') return true;
  if (value === 'false') return false;
  return attr.name.startsWith('[') ? 'bound' : true;
}

// --- element rules -----------------------------------------------------------------

interface ElementRule {
  readonly from: string;
  readonly to: string;
  /** Rewrites the attribute list; may push notes. */
  readonly attrs: (attrs: Attr[], notes: string[]) => Attr[];
}

const SEVERITY: Record<string, string | null> = {
  primary: null,
  secondary: null,
  contrast: null,
  success: 'success',
  info: 'accent',
  help: 'accent',
  warn: 'warning',
  warning: 'warning',
  danger: 'danger',
};

function renameAttrs(
  attrs: Attr[],
  map: Readonly<Record<string, string>>,
): Attr[] {
  return attrs.map((attr) => {
    const target = map[bare(attr.name)];
    return target ? { ...attr, name: rewrap(attr.name, target) } : attr;
  });
}

const BUTTON: ElementRule = {
  from: 'p-button',
  to: 'oge-button',
  attrs(attrs, notes) {
    const out: Attr[] = [];
    let stylingMode: string | null = null;
    for (const attr of attrs) {
      const name = bare(attr.name);
      if (name === 'outlined' || name === 'text' || name === 'link') {
        // `text` is both PrimeNG's style flag and OGE's label input: only the
        // boolean form is the flag
        if (
          name === 'text' &&
          attr.value !== null &&
          !attr.name.startsWith('[')
        ) {
          const value = unquote(attr.value);
          if (value !== 'true' && value !== '') {
            out.push(attr);
            continue;
          }
        }
        const state = flagState(attr);
        if (state === 'bound') {
          notes.push(`p-button [${name}] is bound — set stylingMode instead`);
          out.push(attr);
        } else if (state) stylingMode = name;
        continue;
      }
      if (name === 'rounded') {
        const state = flagState(attr);
        if (state === true) out.push({ name: 'shape', value: '"pill"' });
        else if (state === 'bound') {
          out.push({
            name: '[shape]',
            value: `"${unquote(attr.value)} ? 'pill' : 'default'"`,
          });
        }
        continue;
      }
      if (name === 'severity' && !attr.name.startsWith('[')) {
        const mapped = SEVERITY[unquote(attr.value) ?? ''];
        if (mapped) out.push({ name: 'severity', value: `"${mapped}"` });
        continue;
      }
      if (name === 'raised' || name === 'loadingIcon' || name === 'iconPos') {
        if (name === 'iconPos') {
          const value = unquote(attr.value);
          if (value === 'right' || value === 'bottom') {
            out.push({ name: 'iconPosition', value: '"after"' });
          }
        }
        continue;
      }
      out.push(attr);
    }
    if (stylingMode)
      out.push({ name: 'stylingMode', value: `"${stylingMode}"` });
    return renameAttrs(out, {
      label: 'text',
      icon: 'iconClass',
      onClick: 'clicked',
      disabled: 'disabled',
      badge: 'badge',
      loading: 'loading',
      fluid: 'fluid',
      ariaLabel: 'ariaLabel',
    });
  },
};

const DIALOG: ElementRule = {
  from: 'p-dialog',
  to: 'oge-modal',
  attrs(attrs, notes) {
    const names = new Set(attrs.map((a) => bare(a.name)));
    const out: Attr[] = [];
    for (const attr of attrs) {
      const name = bare(attr.name);
      if (name === 'modal') {
        if (flagState(attr) !== true) {
          notes.push(
            'p-dialog was non-modal — use <oge-window> for a dialog that leaves the page usable',
          );
        }
        continue;
      }
      if (name === 'onShow') {
        notes.push('p-dialog (onShow) has no direct twin — use (openedChange)');
        out.push({ name: '(openedChange)', value: attr.value });
        continue;
      }
      out.push(attr);
    }
    const missing = ['draggable', 'resizable', 'dismissableMask'].filter(
      (name) => !names.has(name),
    );
    if (missing.length) {
      notes.push(
        `p-dialog relied on PrimeNG defaults (${missing.join(', ')}); OGE modals are fixed, not resizable, and close on a backdrop click — set dragEnabled / resizeEnabled / closeOnBackdropClick to keep the old behaviour`,
      );
    }
    return renameAttrs(out, {
      header: 'title',
      visible: 'opened',
      visibleChange: 'openedChange',
      dismissableMask: 'closeOnBackdropClick',
      closable: 'showCloseButton',
      draggable: 'dragEnabled',
      resizable: 'resizeEnabled',
      blockScroll: 'scrollLock',
      onHide: 'closed',
      styleClass: 'panelClass',
      maskStyleClass: 'backdropClass',
    });
  },
};

const TREE: ElementRule = {
  from: 'p-tree',
  to: 'oge-tree-view',
  attrs(attrs, notes) {
    const out: Attr[] = [];
    let dragging = false;
    for (const attr of attrs) {
      const name = bare(attr.name);
      if (name === 'draggableNodes' || name === 'droppableNodes') {
        if (flagState(attr) !== false) dragging = true;
        continue;
      }
      if (name === 'onNodeSelect') {
        notes.push(
          'p-tree (onNodeSelect) became (itemClick): it fires on every activation with { key, item, event }',
        );
        out.push({ name: '(itemClick)', value: attr.value });
        continue;
      }
      if (name === 'onNodeDrop') {
        notes.push(
          'p-tree (onNodeDrop) became (itemReordered): its payload is { dragKey, dropKey, position, … } and the tree never moves your data',
        );
        out.push({ name: '(itemReordered)', value: attr.value });
        continue;
      }
      out.push(attr);
    }
    const names = new Set(out.map((a) => bare(a.name)));
    // TreeNode reads label / children / key
    if (!names.has('displayExpr'))
      out.push({ name: 'displayExpr', value: '"label"' });
    if (!names.has('itemsExpr'))
      out.push({ name: 'itemsExpr', value: '"children"' });
    if (!names.has('keyExpr')) out.push({ name: 'keyExpr', value: '"key"' });
    if (dragging) out.push({ name: '[allowDragging]', value: '"true"' });
    return renameAttrs(out, {
      value: 'items',
      filter: 'searchEnabled',
    });
  },
};

const ELEMENTS: readonly ElementRule[] = [BUTTON, DIALOG, TREE];

/** PrimeNG elements the codemod knows but leaves for a human. */
const MANUAL: Readonly<Record<string, string>> = {
  'p-table':
    'oge-grid — columns become <oge-column> children; see /guides/migrate-from-primeng',
  'p-treeTable': 'oge-tree-list',
  'p-menu':
    'oge-menu-list with [items]="ogeFromPrimeMenuItems(model)" (convert in the component)',
  'p-tieredMenu': 'oge-menu-list (submenus via items)',
  'p-contextMenu':
    '[ogeContextMenu] on the target element, items from ogeFromPrimeMenuItems()',
  'p-menubar': 'oge-menubar with items from ogeFromPrimeMenuItems()',
  'p-toast':
    'remove it: OgeToastService needs no host element (severity warn → warning)',
  'p-confirmDialog':
    'remove it: await OgeModalService.confirm() instead of ConfirmationService',
  'p-select': 'oge-select-box',
  'p-dropdown': 'oge-select-box',
  'p-multiSelect': 'oge-tag-box',
  'p-datepicker': 'oge-date-box',
  'p-calendar': 'oge-date-box',
  'p-inputNumber': 'oge-number-box',
  'p-tabs': 'oge-tabs',
  'p-tabView': 'oge-tabs',
  'p-paginator': 'oge-pagination',
  'p-breadcrumb': 'oge-breadcrumb',
  'p-drawer': 'oge-drawer',
  'p-sidebar': 'oge-drawer',
  'p-popover': 'oge-popover',
  'p-overlayPanel': 'oge-popover',
  'p-fileUpload': 'oge-file-uploader',
  'p-editor': 'oge-editor',
  'p-chart': 'oge-chart',
};

// --- template transform ----------------------------------------------------------

const TAG_RE = /<(\/?)(p-[A-Za-z][\w-]*)(\s[^<>]*?)?(\/?)>/g;

/** Migrates one Angular template. */
export function migratePrimengTemplate(source: string): MigrateResult {
  const notes: string[] = [];
  const manualSeen = new Set<string>();
  let text = source.replace(
    TAG_RE,
    (
      whole,
      closing: string,
      tag: string,
      attrSource = '',
      selfClose: string,
    ) => {
      const rule = ELEMENTS.find((r) => r.from === tag);
      if (!rule) {
        if (MANUAL[tag] && !closing && !manualSeen.has(tag)) {
          manualSeen.add(tag);
          notes.push(`<${tag}> → ${MANUAL[tag]}`);
        }
        return whole;
      }
      if (closing) return `</${rule.to}>`;
      const before = notes.length;
      const attrs = rule.attrs(parseAttrs(attrSource), notes);
      const rendered = attrs.length ? ` ${renderAttrs(attrs)}` : '';
      const added = notes.slice(before);
      const comment = added.length
        ? `<!-- ${TODO}: ${added.join('; ')} -->\n`
        : '';
      return `${comment}<${rule.to}${rendered}${selfClose ? ' /' : ''}>`;
    },
  );
  // tooltip directive, on any element
  text = text.replace(
    /(\[?)pTooltip(\]?)(\s*=)/g,
    (_m, open: string, close: string, eq: string) =>
      `${open}ogeTooltip${close}${eq}`,
  );
  text = text.replace(/(\[?)tooltipPosition(\]?)=/g, '$1tooltipPlacement$2=');
  if (manualSeen.size) {
    const lines = [...manualSeen].map((tag) => `  <${tag}> → ${MANUAL[tag]}`);
    text = `<!-- ${TODO}: not converted automatically:\n${lines.join('\n')}\n-->\n${text}`;
  }
  return { text, notes, changed: text !== source };
}

// --- TypeScript transform ---------------------------------------------------------

/** PrimeNG symbols → OGE standalone symbols and their package. */
const SYMBOLS: Readonly<Record<string, { name: string; from: string }>> = {
  ButtonModule: { name: 'OgeButton', from: '@oge-ui/buttons' },
  Button: { name: 'OgeButton', from: '@oge-ui/buttons' },
  DialogModule: { name: 'OgeModal', from: '@oge-ui/overlay' },
  Dialog: { name: 'OgeModal', from: '@oge-ui/overlay' },
  TooltipModule: { name: 'OgeTooltip', from: '@oge-ui/overlay' },
  Tooltip: { name: 'OgeTooltip', from: '@oge-ui/overlay' },
  TreeModule: { name: 'OgeTreeView', from: '@oge-ui/navigation' },
  Tree: { name: 'OgeTreeView', from: '@oge-ui/navigation' },
  MenuItem: { name: 'OgePrimeMenuItem', from: '@oge-ui/overlay' },
};

const IMPORT_RE =
  /import\s+(type\s+)?\{([^}]*)\}\s+from\s+['"](primeng\/(?:button|dialog|tooltip|tree|api))['"];?/g;

/** Migrates the PrimeNG imports, `imports: […]` entries and inline templates of one file. */
export function migratePrimengTypeScript(source: string): MigrateResult {
  const notes: string[] = [];
  const renames = new Map<string, string>();
  const additions = new Map<string, Set<string>>();
  const typeOnly = new Map<string, boolean>();
  let text = source.replace(
    IMPORT_RE,
    (whole, typeKw: string | undefined, names: string, from: string) => {
      const kept: string[] = [];
      for (const raw of names
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)) {
        const [orig, alias] = raw.replace(/^type\s+/, '').split(/\s+as\s+/);
        const target = SYMBOLS[orig];
        if (!target) {
          kept.push(raw);
          continue;
        }
        renames.set(alias ?? orig, target.name);
        const set = additions.get(target.from) ?? new Set<string>();
        set.add(target.name);
        additions.set(target.from, set);
        const isType =
          !!typeKw || raw.startsWith('type ') || orig === 'MenuItem';
        typeOnly.set(
          target.name,
          isType && (typeOnly.get(target.name) ?? true),
        );
        if (orig === 'MenuItem') {
          notes.push(
            'MenuItem → OgePrimeMenuItem: pass the arrays through ogeFromPrimeMenuItems() before handing them to an OGE menu',
          );
        }
      }
      return kept.length
        ? `import ${typeKw ?? ''}{ ${kept.join(', ')} } from '${from}';`
        : '';
    },
  );
  if (renames.size) {
    for (const [from, to] of renames) {
      text = text.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
    }
    // the same OGE symbol listed twice in imports: [...] (Button + ButtonModule)
    text = text.replace(/imports:\s*\[([^\]]*)\]/g, (whole, list: string) => {
      const items = list
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const unique = [...new Set(items)];
      return unique.length === items.length
        ? whole
        : `imports: [${unique.join(', ')}]`;
    });
    const lines = [...additions].map(([from, names]) => {
      const sorted = [...names].sort();
      const allTypes = sorted.every((n) => typeOnly.get(n));
      return allTypes
        ? `import type { ${sorted.join(', ')} } from '${from}';`
        : `import { ${sorted
            .map((n) => (typeOnly.get(n) ? `type ${n}` : n))
            .join(', ')} } from '${from}';`;
    });
    text = `${lines.join('\n')}\n${text.replace(/^\n+/, '')}`;
  }
  // inline templates
  text = text.replace(
    /(template:\s*`)([\s\S]*?)(`)/g,
    (_m, open: string, body: string, close: string) => {
      const result = migratePrimengTemplate(body);
      notes.push(...result.notes);
      return `${open}${result.text}${close}`;
    },
  );
  if (notes.length && text !== source) {
    const unique = [...new Set(notes)];
    text = `// ${TODO}: ${unique.join('\n// ')}\n${text}`;
  }
  return { text, notes, changed: text !== source };
}

// --- the schematic -------------------------------------------------------------------

/** Walks `options.path` and migrates every template and TypeScript file. */
export function migratePrimeng(options: MigratePrimengOptions = {}): Rule {
  return (tree: Tree, context) => {
    const root = options.path ?? '/src';
    const touched: string[] = [];
    const allNotes: string[] = [];
    const visit = (dir: string) => {
      const entry = tree.getDir(dir);
      for (const sub of entry.subdirs) {
        if (sub === 'node_modules' || sub.startsWith('.')) continue;
        visit(`${entry.path}/${sub}`);
      }
      for (const file of entry.subfiles) {
        const path = `${entry.path}/${file}`;
        const isHtml = file.endsWith('.html');
        const isTs = file.endsWith('.ts') && !file.endsWith('.d.ts');
        if (!isHtml && !isTs) continue;
        const source = tree.readText(path);
        if (!/primeng|<p-|pTooltip/.test(source)) continue;
        const result = isHtml
          ? migratePrimengTemplate(source)
          : migratePrimengTypeScript(source);
        if (!result.changed) continue;
        tree.overwrite(path, result.text);
        touched.push(path);
        for (const note of result.notes) allNotes.push(`${path}: ${note}`);
      }
    };
    visit(root);
    context.logger.info(
      touched.length
        ? `\nMigrated ${touched.length} file(s) from PrimeNG:\n${touched.map((p) => `  ${p}`).join('\n')}`
        : '\nNo PrimeNG usage found to migrate.',
    );
    if (allNotes.length) {
      context.logger.warn(
        `\n${allNotes.length} spot(s) need a look (marked ${TODO}):\n${allNotes.map((n) => `  ${n}`).join('\n')}`,
      );
    }
    context.logger.info(
      '\nGuide: https://www.ogeui.com/guides/migrate-from-primeng\n',
    );
    return tree;
  };
}
