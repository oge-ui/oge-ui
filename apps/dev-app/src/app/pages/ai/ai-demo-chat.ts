/**
 * The docs' offline demo model, chat half: a keyword FAQ bot about OGE UI
 * that answers the chat demos without a network call. Not part of any package.
 */

const ANSWERS: readonly [RegExp, string, string][] = [
  [
    /price|pricing|cost|licen[cs]e|fiyat|lisans|ücret/i,
    'The MIT tier is free forever. OGE UI Pro — pivot, charts, scheduler, Gantt, Kanban and BPMN — is $299 per developer per year, with a perpetual fallback for the releases you were licensed for.',
    'MIT katmanı sonsuza dek ücretsiz. OGE UI Pro (pivot, grafikler, scheduler, Gantt, Kanban, BPMN) geliştirici başına yıllık 299$; lisanslı olduğunuz sürümler için kalıcı kullanım hakkı vardır.',
  ],
  [
    /model|openai|ollama|claude|anthropic|azure|transport|key|anahtar/i,
    'Any model works: point the transport at your own backend (createOgeAiHttpTransport), an OpenAI-compatible server such as Ollama or Azure, or Anthropic. There is no hosted OGE service.',
    'Her model çalışır: transport’u kendi backend’inize (createOgeAiHttpTransport), Ollama veya Azure gibi OpenAI uyumlu bir sunucuya ya da Anthropic’e yönlendirin. OGE’nin barındırdığı bir servis yoktur.',
  ],
  [
    /react|angular|framework/i,
    'Every family ships for Angular and React from one shared engine in @oge-ui/behavior, with the same markup and the same stylesheet in both layers.',
    'Her aile Angular ve React için @oge-ui/behavior’daki tek ortak motordan gelir; iki katmanda da aynı markup ve aynı stil kullanılır.',
  ],
  [
    /data|privacy|row|veri|gizlilik|satır/i,
    'The grid assistant and smart paste never send rows — only column or field descriptions. The AI column sends exactly the input fields you name, for the rows on screen.',
    'Grid asistanı ve akıllı yapıştır hiçbir zaman satır göndermez; yalnızca kolon veya alan açıklamaları gider. AI sütunu ise yalnızca sizin adlandırdığınız input alanlarını, ekrandaki satırlar için gönderir.',
  ],
];

/** One chat request → one plain-text reply. */
export function demoChatReply(
  messages: readonly { role: string; content: string }[],
): string {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  const text = last?.content ?? '';
  const turkish = /[çğıöşü]/i.test(text);
  for (const [pattern, en, tr] of ANSWERS) {
    if (pattern.test(text)) return turkish ? tr : en;
  }
  return turkish
    ? 'Ben çevrimdışı demo modelim. Fiyatlandırma, modeller, Angular/React ya da veri gizliliği hakkında sorun — gerçek sorular için aşağıdan bir model bağlayın.'
    : 'I am the offline demo model. Ask me about pricing, models, Angular and React, or data privacy — connect a real model below for anything else.';
}
