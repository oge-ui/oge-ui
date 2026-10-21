/**
 * Shared strings (`xl/sharedStrings.xml`) and the rich-text content model
 * they share with inline strings (`<is>`) and comments (`<text>`): plain
 * `<t>` text, or `<r>` runs with `<rPr>` run properties. Phonetic guides
 * (`<rPh>`, furigana) are not part of the text and are skipped.
 *
 * The table streams: a workbook can hold a million strings, and a tree of
 * them is what the engine avoids building.
 */
import { ogeRichText, type OgeRichText, type OgeTextRun } from '../model/cell';
import { decodeOgeXstring, ogeXmlLocalName, parseOgeXml } from '../xml/xml';
import { readOgeFont } from './read-styles';
import type { OgeXmlNode } from './xml-tree';

/**
 * Collects the text of one string item from parser events. Feed it the
 * events between the item's own open and close tags, then call `result()`.
 */
export class OgeRichTextCollector {
  private runs: OgeTextRun[] = [];
  private plain = '';
  private inText = false;
  private inRun = false;
  private skipDepth = 0;
  private runText = '';
  private properties: OgeXmlNode | null = null;
  private propertyStack: OgeXmlNode[] = [];

  open(name: string, attributes: Readonly<Record<string, string>>): void {
    const local = ogeXmlLocalName(name);
    if (this.skipDepth > 0) {
      this.skipDepth++;
      return;
    }
    if (this.propertyStack.length > 0) {
      const node: OgeXmlNode = {
        name: local,
        qname: name,
        attributes,
        children: [],
        text: '',
        start: 0,
        end: 0,
      };
      this.propertyStack[this.propertyStack.length - 1].children.push(node);
      this.propertyStack.push(node);
      return;
    }
    switch (local) {
      case 'rPh':
      case 'phoneticPr':
        this.skipDepth = 1;
        break;
      case 'r':
        this.inRun = true;
        this.runText = '';
        this.properties = null;
        break;
      case 'rPr':
        if (this.inRun) {
          this.properties = {
            name: 'rPr',
            qname: name,
            attributes,
            children: [],
            text: '',
            start: 0,
            end: 0,
          };
          this.propertyStack.push(this.properties);
        }
        break;
      case 't':
        this.inText = true;
        break;
    }
  }

  close(name: string): void {
    if (this.skipDepth > 0) {
      this.skipDepth--;
      return;
    }
    if (this.propertyStack.length > 0) {
      this.propertyStack.pop();
      return;
    }
    const local = ogeXmlLocalName(name);
    if (local === 't') this.inText = false;
    else if (local === 'r' && this.inRun) {
      this.inRun = false;
      const text = decodeOgeXstring(this.runText);
      const font = this.properties ? readOgeFont(this.properties) : undefined;
      this.runs.push(
        font && Object.keys(font).length ? { text, font } : { text },
      );
    }
  }

  text(text: string): void {
    if (!this.inText || this.skipDepth > 0) return;
    if (this.inRun) this.runText += text;
    else this.plain += text;
  }

  /** The item: plain text, or rich text when any run carries formatting. */
  result(): string | OgeRichText {
    if (this.runs.length === 0) return decodeOgeXstring(this.plain);
    const runs = this.plain
      ? [{ text: decodeOgeXstring(this.plain) }, ...this.runs]
      : this.runs;
    if (runs.every((run) => !run.font))
      return runs.map((run) => run.text).join('');
    return ogeRichText(runs);
  }
}

/** Reads the shared-string table. */
export function readOgeSharedStrings(xml: string): (string | OgeRichText)[] {
  const items: (string | OgeRichText)[] = [];
  let item: OgeRichTextCollector | null = null;
  let depth = 0;
  parseOgeXml(xml, {
    open(name, attributes) {
      depth++;
      if (item) {
        item.open(name, attributes);
      } else if (depth === 2 && ogeXmlLocalName(name) === 'si') {
        item = new OgeRichTextCollector();
      }
    },
    close(name) {
      if (item) {
        if (depth === 2) {
          items.push(item.result());
          item = null;
        } else item.close(name);
      }
      depth--;
    },
    text(text) {
      item?.text(text);
    },
  });
  return items;
}

/** The text of a tree node holding rich-text content (a comment's `<text>`). */
export function readOgeRichTextNode(node: OgeXmlNode): string | OgeRichText {
  const collector = new OgeRichTextCollector();
  const walk = (current: OgeXmlNode) => {
    for (const child of current.children) {
      collector.open(child.qname, child.attributes);
      if (child.text) collector.text(child.text);
      walk(child);
      collector.close(child.qname);
    }
  };
  walk(node);
  return collector.result();
}
