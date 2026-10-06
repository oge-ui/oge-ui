import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_EDITOR_MESSAGES,
  resolveOgeEditorConfig,
} from './editor-config';
import {
  ogeEditorActiveState,
  ogeEditorCharacterCount,
  ogeEditorHtmlLength,
  ogeEditorWordCount,
} from './editor-queries';
import { stateOf } from './editor-test-utils';
import {
  OGE_DEFAULT_EDITOR_TOOLBAR,
  buildOgeEditorToolbar,
  ogeEditorAriaShortcut,
  ogeEditorBlockFormatCommand,
  ogeEditorBlockFormatMenu,
  ogeEditorShortcutLabel,
  ogeEditorToolCommand,
  ogeEditorToolbarItems,
  type OgeEditorCustomTool,
} from './editor-toolbar';

const context = (
  html: string,
  anchor: [number, number] = [0, 0],
  focus = anchor,
) => ({
  active: ogeEditorActiveState(stateOf(html, anchor, focus)),
  messages: OGE_DEFAULT_EDITOR_MESSAGES,
  mac: false,
  canUndo: false,
  canRedo: true,
  inert: false,
});

describe('editor active state', () => {
  it('reports marks only when the whole selection carries them', () => {
    expect(
      ogeEditorActiveState(
        stateOf('<p><strong>ab</strong>c</p>', [0, 0], [0, 2]),
      ).marks.bold,
    ).toBe(true);
    expect(
      ogeEditorActiveState(
        stateOf('<p><strong>ab</strong>c</p>', [0, 0], [0, 3]),
      ).marks.bold,
    ).toBe(false);
  });

  it('reports the caret marks, the block format, the list and the alignment', () => {
    const active = ogeEditorActiveState(
      stateOf(
        '<ol><li style="text-align: center"><em>x</em></li></ol>',
        [0, 1],
      ),
    );
    expect(active.marks.italic).toBe(true);
    expect(active.list).toBe('ordered');
    expect(active.align).toBe('center');
    expect(active.canIndent).toBe(true);
    expect(
      ogeEditorActiveState(stateOf('<h2>a</h2><p>b</p>', [0, 0], [1, 1]))
        .blockFormat,
    ).toBe('mixed');
  });

  it('reports the link under the caret and uniform colours', () => {
    const active = ogeEditorActiveState(
      stateOf(
        '<p><a href="https://a.test"><span style="color: #c00">link</span></a></p>',
        [0, 2],
      ),
    );
    expect(active.link?.href).toBe('https://a.test');
    expect(active.color).toBe('#c00');
  });

  it('counts characters (graphemes) and words', () => {
    const doc = stateOf('<p>héllo 👍🏽</p><p>two words</p>').doc;
    expect(ogeEditorCharacterCount(doc)).toBe(16);
    expect(ogeEditorWordCount(doc, 'en')).toBe(3);
    expect(ogeEditorHtmlLength('<p><b>abc</b></p><p>d</p>')).toBe(4);
  });
});

describe('buildOgeEditorToolbar', () => {
  it('resolves the default toolbar without stray separators', () => {
    const views = buildOgeEditorToolbar(
      OGE_DEFAULT_EDITOR_TOOLBAR,
      context('<p>a</p>'),
    );
    expect(views[0].key).toBe('undo');
    expect(views[views.length - 1].key).toBe('clearFormatting');
    expect(
      views.some(
        (v, i) => v.kind === 'separator' && views[i + 1]?.kind === 'separator',
      ),
    ).toBe(false);
  });

  it('a toggle reports its pressed state; tooltips carry the shortcut', () => {
    const views = buildOgeEditorToolbar(
      ['bold', 'italic'],
      context('<p><strong>a</strong></p>', [0, 1]),
    );
    expect(views[0]).toMatchObject({
      kind: 'toggle',
      active: true,
      hint: 'Bold (Ctrl+B)',
      shortcut: 'Control+B',
    });
    expect(views[1].active).toBe(false);
  });

  it('disables what cannot run, and everything when inert', () => {
    const views = buildOgeEditorToolbar(
      ['undo', 'redo', 'indent', 'unlink'],
      context('<p>a</p>'),
    );
    expect(views.map((v) => v.disabled)).toEqual([true, false, true, true]);
    const inert = buildOgeEditorToolbar(['bold'], {
      ...context('<p>a</p>'),
      inert: true,
    });
    expect(inert[0].disabled).toBe(true);
  });

  it('popup openers carry aria-haspopup; block format shows its value', () => {
    const views = buildOgeEditorToolbar(
      ['blockFormat', 'link', 'textColor'],
      context('<h2>a</h2>'),
    );
    expect(views[0]).toMatchObject({
      hasPopup: 'menu',
      valueText: 'Heading 2',
    });
    expect(views[1].hasPopup).toBe('dialog');
    expect(views[2]).toMatchObject({ kind: 'color', hasPopup: 'dialog' });
  });

  it('formatting tools are disabled inside a code block', () => {
    const views = buildOgeEditorToolbar(
      ['bold', 'link', 'codeBlock'],
      context('<pre><code>x</code></pre>'),
    );
    expect(views.map((v) => v.disabled)).toEqual([true, true, false]);
    expect(views[2].active).toBe(true);
  });

  it('custom tools become buttons, or toggles with isActive', () => {
    const custom: OgeEditorCustomTool = {
      key: 'stamp',
      text: 'Insert date',
      run: () => undefined,
      isActive: (active) => active.marks.bold,
    };
    const views = buildOgeEditorToolbar([custom], context('<p>a</p>'));
    expect(views[0]).toMatchObject({
      key: 'stamp',
      kind: 'toggle',
      active: false,
      custom,
    });
  });

  it('maps to layout toolbar items for measuring and the overflow menu', () => {
    const views = buildOgeEditorToolbar(
      ['bold', 'separator', 'blockFormat'],
      context('<p>a</p>'),
    );
    expect(ogeEditorToolbarItems(views)).toEqual([
      expect.objectContaining({ key: 'bold', text: 'Bold', active: false }),
      { key: 'separator-0', type: 'separator' },
      expect.objectContaining({
        key: 'blockFormat',
        text: 'Text style: Paragraph',
      }),
    ]);
  });

  it('spells shortcuts per platform', () => {
    const strike = { key: 'X', mod: true, shift: true };
    expect(ogeEditorAriaShortcut(strike, false)).toBe('Control+Shift+X');
    expect(ogeEditorAriaShortcut(strike, true)).toBe('Meta+Shift+X');
    expect(
      ogeEditorShortcutLabel(strike, false, OGE_DEFAULT_EDITOR_MESSAGES),
    ).toBe('Ctrl+Shift+X');
    expect(
      ogeEditorShortcutLabel(strike, true, OGE_DEFAULT_EDITOR_MESSAGES),
    ).toBe('⌘⇧X');
  });

  it('the block-format menu is a radio group over the configured levels', () => {
    const menu = ogeEditorBlockFormatMenu(
      'heading2',
      [1, 2],
      OGE_DEFAULT_EDITOR_MESSAGES,
    );
    expect(menu.map((item) => item.text)).toEqual([
      'Paragraph',
      'Heading 1',
      'Heading 2',
      'Quote',
      'Code block',
    ]);
    expect(menu.find((item) => item.checked)?.value).toBe('heading2');
    expect(ogeEditorBlockFormatCommand('heading2')).toEqual({
      type: 'blockFormat',
      format: 'heading',
      level: 2,
    });
  });

  it('every built-in toggle or button tool has a command', () => {
    for (const name of [
      'bold',
      'undo',
      'bulletList',
      'alignEnd',
      'blockquote',
      'unlink',
    ] as const) {
      expect(ogeEditorToolCommand(name)).not.toBeNull();
    }
    expect(ogeEditorToolCommand('link')).toBeNull();
  });

  it('a config merges messages group by group', () => {
    const config = resolveOgeEditorConfig({
      messages: { tools: { bold: 'Kalın' } },
    });
    expect(config.messages.tools.bold).toBe('Kalın');
    expect(config.messages.tools.italic).toBe('Italic');
    expect(config.headingLevels).toEqual([1, 2, 3, 4]);
  });
});
