const fold = text => String(text).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
const words = text => fold(text).match(/[\p{L}\p{N}]{3,}/gu) || [];
const stop = new Set(['jarvis', 'dilan', 'lara', 'vera', 'bana', 'bunu', 'icin', 'bir', 'ile', 'olan', 'nasil', 'nedir']);
// Rank across every record, including old records. Keep a strict prompt budget.
export function selectMemory(memory, query, { limit = 24, maxChars = 10000 } = {}) {
  const terms = [...new Set(words(query).filter(x => !stop.has(x)))];
  const ranked = Object.entries(memory).flatMap(([category, items]) => items.map((item, index) => {
    const text = fold(item.text);
    const tokens = new Set(words(item.text));
    const relevance = terms.reduce((n, word) => n + (tokens.has(word) ? 4 : word.length >= 4 && text.includes(word) ? 1 : 0), 0);
    return { category, item, score: relevance + (category === 'preferences' ? 0.5 : 0), index };
  })).sort((a, b) => b.score - a.score || a.index - b.index);
  let result = '';
  for (const { category, item } of ranked.slice(0, limit)) {
    const line = `${category}: ${item.text}\n`;
    if (result.length + line.length <= maxChars) result += line;
  }
  return result.trim();
}
