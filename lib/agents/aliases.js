const BASE={jarvis:['dilan','dılan','jarvis'],atlas:['lara','atlas'],nexus:['vera','nexus']};
export const normalizeAlias=value=>String(value).normalize('NFKC').toLocaleLowerCase('tr-TR').replace(/ı/g,'i');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function aliasPosition(text,aliases) {
  const normalized=normalizeAlias(text);let first=Infinity;
  for (const raw of aliases) {
    const alias=normalizeAlias(raw).trim();if(!alias)continue;
    const found=new RegExp(`(^|[^\\p{L}\\p{N}_])(${escape(alias)})(?=$|[^\\p{L}\\p{N}_])`,'u').exec(normalized);
    if(found) first=Math.min(first,found.index+found[1].length);
  }
  return first===Infinity?-1:first;
}
export function agentAliases(settings) {
  const result=Object.fromEntries(Object.entries(BASE).map(([id,list])=>[id,[...list]]));
  const candidates=Object.entries(BASE).map(([id])=>[id,settings?.profiles?.[id]?.name]).filter(([,name])=>typeof name==='string'&&name.trim());
  for(const [id,name] of candidates) {
    const normalized=normalizeAlias(name.trim());
    const conflicts=Object.entries(BASE).some(([other,list])=>other!==id&&list.some(x=>normalizeAlias(x)===normalized)) || candidates.some(([other,value])=>other!==id&&normalizeAlias(value.trim())===normalized);
    if(!conflicts) result[id].push(name.trim());
  }
  return result;
}
