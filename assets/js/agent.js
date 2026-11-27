// Клиент ИИ-агента. Адрес берётся из <meta name="agent-url">; пусто — чат работает по правилам.
export function agentUrl() {
  if (typeof document === 'undefined') return '';
  return document.querySelector('meta[name="agent-url"]')?.content?.trim() || '';
}

export async function askAgent(url, history) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: history.slice(-12) }),
  });
  if (!res.ok) throw new Error(`agent ${res.status}`);
  const data = await res.json();
  if (typeof data.text !== 'string' || !data.text) throw new Error('empty');
  return { text: data.text, wa: typeof data.wa === 'string' ? data.wa : null, photos: Array.isArray(data.photos) ? data.photos : [] };
}
