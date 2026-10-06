// `jsdom` ships no types and `@types/jsdom` is not a workspace dependency;
// the React hydration spec needs only this much of it.
declare module 'jsdom' {
  export class JSDOM {
    constructor(
      html?: string,
      options?: { url?: string; pretendToBeVisual?: boolean },
    );
    readonly window: Window & typeof globalThis;
  }
}
