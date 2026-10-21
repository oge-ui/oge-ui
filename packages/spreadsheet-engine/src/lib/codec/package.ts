/**
 * The Open Packaging Conventions layer of an xlsx file: content types,
 * relationships and part names.
 *
 * Part names are case-insensitive (OPC §9.1.1.4) and relationship targets
 * are relative to the source part's folder, may climb with `..`, may be
 * absolute from the package root and may be percent-encoded — writers other
 * than Excel use every one of those forms. Relationship and content types
 * are matched by their last segment, so Transitional
 * (`schemas.openxmlformats.org`) and Strict (`purl.oclc.org`) files read
 * alike.
 */
import { parseOgeXml, ogeXmlLocalName } from '../xml/xml';

/** A relationship of a part. */
export interface OgeRelationship {
  readonly id: string;
  /** Last segment of the type URI (`worksheet`, `hyperlink`, `comments`). */
  readonly type: string;
  /** The full type URI. */
  readonly typeUri: string;
  /** Resolved part path (internal) or the target as written (external). */
  readonly target: string;
  readonly external: boolean;
}

/** The parts of a package, by normalised path, with their bytes. */
export class OgePackageParts {
  private readonly byKey = new Map<string, string>();
  private readonly defaults = new Map<string, string>();
  private readonly overrides = new Map<string, string>();
  private readonly relCache = new Map<string, OgeRelationship[]>();
  private readonly decoder = new TextDecoder('utf-8');

  /** `parts`: zip entry name → contents. */
  constructor(private readonly parts: ReadonlyMap<string, Uint8Array>) {
    for (const name of parts.keys()) this.byKey.set(keyOf(name), name);
    const types = this.text('[Content_Types].xml');
    if (types !== undefined) {
      parseOgeXml(types, {
        open: (name, attributes) => {
          const local = ogeXmlLocalName(name);
          if (local === 'Default' && attributes['Extension']) {
            this.defaults.set(
              attributes['Extension'].toLowerCase(),
              attributes['ContentType'] ?? '',
            );
          } else if (local === 'Override' && attributes['PartName']) {
            this.overrides.set(
              keyOf(attributes['PartName']),
              attributes['ContentType'] ?? '',
            );
          }
        },
      });
    }
  }

  /** Whether `[Content_Types].xml` was present. */
  get hasContentTypes(): boolean {
    return this.byKey.has(keyOf('[Content_Types].xml'));
  }

  /** Every part path, as stored. */
  paths(): string[] {
    return [...this.parts.keys()];
  }

  /** Whether a part exists (case-insensitive). */
  has(path: string): boolean {
    return this.byKey.has(keyOf(path));
  }

  /** A part's bytes. */
  bytes(path: string): Uint8Array | undefined {
    const name = this.byKey.get(keyOf(path));
    return name === undefined ? undefined : this.parts.get(name);
  }

  /** A part as text (UTF-8, or UTF-16 with a byte-order mark). */
  text(path: string): string | undefined {
    const data = this.bytes(path);
    if (!data) return undefined;
    if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
      return new TextDecoder('utf-16le').decode(data.subarray(2));
    }
    if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff) {
      return new TextDecoder('utf-16be').decode(data.subarray(2));
    }
    return this.decoder.decode(data);
  }

  /** A part's content type: its override, else its extension's default. */
  contentType(path: string): string | undefined {
    const override = this.overrides.get(keyOf(path));
    if (override !== undefined) return override;
    const dot = path.lastIndexOf('.');
    return dot < 0
      ? undefined
      : this.defaults.get(path.slice(dot + 1).toLowerCase());
  }

  /** The stored name of a part (its case as in the archive). */
  storedName(path: string): string | undefined {
    return this.byKey.get(keyOf(path));
  }

  /** Relationships of a part (`''` for the package's own `_rels/.rels`). */
  relationships(source: string): OgeRelationship[] {
    const cached = this.relCache.get(keyOf(source));
    if (cached) return cached;
    const slash = source.lastIndexOf('/');
    const folder = slash < 0 ? '' : source.slice(0, slash + 1);
    const file = slash < 0 ? source : source.slice(slash + 1);
    const relsPath = `${folder}_rels/${file}.rels`;
    const xml = this.text(relsPath);
    const list: OgeRelationship[] = [];
    if (xml !== undefined) {
      parseOgeXml(xml, {
        open: (name, attributes) => {
          if (ogeXmlLocalName(name) !== 'Relationship') return;
          const id = attributes['Id'];
          const typeUri = attributes['Type'] ?? '';
          const raw = attributes['Target'];
          if (!id || raw === undefined) return;
          const external = attributes['TargetMode'] === 'External';
          list.push({
            id,
            type: typeUri.slice(typeUri.lastIndexOf('/') + 1),
            typeUri,
            target: external ? raw : ogeResolvePartPath(folder, raw),
            external,
          });
        },
      });
    }
    this.relCache.set(keyOf(source), list);
    return list;
  }

  /** The first relationship of a type (`officeDocument`, `styles`, …). */
  relationshipOfType(
    source: string,
    type: string,
  ): OgeRelationship | undefined {
    return this.relationships(source).find((rel) => rel.type === type);
  }
}

/** Case-insensitive part key without a leading `/`. */
function keyOf(path: string): string {
  return (path.startsWith('/') ? path.slice(1) : path).toLowerCase();
}

/**
 * Resolves a relationship target against the source part's folder (with a
 * trailing `/`, or `''` for the root): `../media/image1.png` from
 * `xl/drawings/` is `xl/media/image1.png`; `/xl/styles.xml` is absolute.
 * Percent escapes are decoded; a target climbing past the root stays at it.
 */
export function ogeResolvePartPath(folder: string, target: string): string {
  let decoded = target;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    // a lone % — keep the target as written
  }
  const hash = decoded.indexOf('#');
  if (hash >= 0) decoded = decoded.slice(0, hash);
  const absolute = decoded.startsWith('/');
  const segments = (absolute ? decoded : folder + decoded).split('/');
  const out: string[] = [];
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') out.pop();
    else out.push(segment);
  }
  return out.join('/');
}
