// Browser and server share one parser so task commands cannot fall into legacy memory handling.
export function commandText(message) {
  return String(message).normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/gu, ' ').trim();
}
export function parseTodoCommand(message) {
  const text = commandText(message), lower = text.toLocaleLowerCase('tr-TR');
  if (/^(görevlerim(?: neler)?|görevlerimi (?:listele|göster)|bugünkü görevlerim)[.!?]*$/.test(lower)) return { type:lower.startsWith('bugünkü') ? 'today' : 'list' };
  // A separator is optional, but the verb must end: "tamamlamak" is ordinary chat.
  const match = lower.match(/^(görev ekle|görevi tamamla)(?=\s|:|–|—|-|$)/u);
  if (!match) return null;
  const title = text.slice(match[0].length).replace(/^[\s:–—-]+/u, '').trim();
  return { type:match[1] === 'görev ekle' ? 'create' : 'complete', title };
}
export const isTodoCommand = message => parseTodoCommand(message) !== null;
