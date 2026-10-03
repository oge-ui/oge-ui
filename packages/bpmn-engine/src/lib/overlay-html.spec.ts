import { bpmnOverlayLinkRel, sanitizeBpmnOverlayHtml } from './overlay-html';

describe('sanitizeBpmnOverlayHtml link hardening', () => {
  it('forces rel="noopener noreferrer" on a link that keeps target', () => {
    const [node] = sanitizeBpmnOverlayHtml(
      '<a href="https://ogeui.com" target="_blank">docs</a>',
    );
    expect(node).toMatchObject({
      tag: 'a',
      attributes: {
        href: 'https://ogeui.com',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    });
  });

  it('merges the host rel and strips an explicit opener', () => {
    const [node] = sanitizeBpmnOverlayHtml(
      '<a href="/x" target="_blank" rel="Opener nofollow">x</a>',
    );
    expect(node).toMatchObject({
      attributes: { rel: 'nofollow noopener noreferrer' },
    });
  });

  it('leaves a link without target alone', () => {
    const [node] = sanitizeBpmnOverlayHtml('<a href="/x" rel="nofollow">x</a>');
    expect(node).toMatchObject({ attributes: { href: '/x', rel: 'nofollow' } });
  });

  it('drops the role attribute', () => {
    const [node] = sanitizeBpmnOverlayHtml(
      '<span role="button" aria-label="n">1</span>',
    );
    expect(node).toMatchObject({ attributes: { 'aria-label': 'n' } });
    expect(
      (node as { attributes: Record<string, string> }).attributes['role'],
    ).toBeUndefined();
  });

  it('bpmnOverlayLinkRel is idempotent', () => {
    expect(bpmnOverlayLinkRel(undefined)).toBe('noopener noreferrer');
    expect(bpmnOverlayLinkRel('noreferrer  noopener')).toBe(
      'noreferrer noopener',
    );
  });
});
