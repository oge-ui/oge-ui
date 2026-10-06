import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  Renderer2,
  ViewEncapsulation,
  effect,
  inject,
  input,
} from '@angular/core';
import type { OgeBpmnSvgNode } from '@oge-ui/bpmn-engine';

/**
 * Applies a sanitized attribute record to its SVG host element (Angular
 * cannot bind attribute *names* from data). The engine's `sanitizeBpmnSvg`
 * has already dropped everything outside the presentational allowlist.
 */
@Directive({ selector: '[ogeBpmnSvgAttrs]' })
export class OgeBpmnSvgAttrs {
  private readonly el = inject<ElementRef<Element>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private applied: readonly string[] = [];

  /** Attribute name → value (already sanitized). */
  readonly ogeBpmnSvgAttrs = input<
    Readonly<Record<string, string | number>> | undefined
  >(undefined);

  constructor() {
    effect(() => {
      const attrs = this.ogeBpmnSvgAttrs() ?? {};
      const element = this.el.nativeElement;
      for (const name of this.applied) {
        if (!(name in attrs)) this.renderer.removeAttribute(element, name);
      }
      for (const [name, value] of Object.entries(attrs)) {
        this.renderer.setAttribute(element, name, String(value));
      }
      this.applied = Object.keys(attrs);
    });
  }
}

/**
 * Draws a safe SVG tree (`OgeBpmnSvgNode[]` from `bpmnSvg` builders) into an
 * SVG group: `<svg:g ogeBpmnSvgNodes [nodes]="icon" />`. Recursive for `g`.
 */
@Component({
  // an SVG child cannot be a custom element: the host is the <svg:g> itself
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: '[ogeBpmnSvgNodes]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeBpmnSvgAttrs, OgeBpmnSvgNodes],
  template: `
    @for (node of nodes(); track $index) {
      @switch (node.tag) {
        @case ('g') {
          <svg:g
            ogeBpmnSvgNodes
            [ogeBpmnSvgAttrs]="node.attrs"
            [nodes]="node.children ?? []"
          />
        }
        @case ('path') {
          <svg:path [ogeBpmnSvgAttrs]="node.attrs" />
        }
        @case ('rect') {
          <svg:rect [ogeBpmnSvgAttrs]="node.attrs" />
        }
        @case ('circle') {
          <svg:circle [ogeBpmnSvgAttrs]="node.attrs" />
        }
        @case ('ellipse') {
          <svg:ellipse [ogeBpmnSvgAttrs]="node.attrs" />
        }
        @case ('line') {
          <svg:line [ogeBpmnSvgAttrs]="node.attrs" />
        }
        @case ('polyline') {
          <svg:polyline [ogeBpmnSvgAttrs]="node.attrs" />
        }
        @case ('polygon') {
          <svg:polygon [ogeBpmnSvgAttrs]="node.attrs" />
        }
        @case ('text') {
          <svg:text [ogeBpmnSvgAttrs]="node.attrs">{{ node.text }}</svg:text>
        }
      }
    }
  `,
})
export class OgeBpmnSvgNodes {
  /** The sanitized tree to draw. */
  readonly nodes = input.required<readonly OgeBpmnSvgNode[]>();
}
