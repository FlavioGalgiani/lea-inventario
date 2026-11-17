export const VERSION = '1.0.0';
export const COLUMNS = ['schema','event_id','record_id','parents','item_code','location','quantity','unit','status','operator','note','created_at','device_id'];
export const normalize = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').replace(/\b(dn|de|pn|sdr)\s*(\d+)/g,'$1$2').replace(/\s+/g,' ').trim();
export const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function numericQuantity(value) {
  const s = String(value ?? '').trim().replace(',','.');
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) throw new Error('Inserisci una quantità valida, uguale o superiore a zero.');
  const n=Number(s); if (!Number.isFinite(n) || n>1e12) throw new Error('Quantità fuori intervallo.');
  return n;
}
export function recordKey(itemCode, location) { return `${itemCode}::${normalize(location)}`; }
export function makeEvent(values, parents=[], options={}) {
  const location=String(values.location??'').trim(); const operator=String(values.operator??'').trim();
  if (!values.item_code || !location || !operator) throw new Error('Articolo, ubicazione e operatore sono obbligatori.');
  const status=values.status??'counted';
  if (!['counted','verify','deleted'].includes(status)) throw new Error('Stato non valido.');
  const quantity=status==='deleted' ? '' : String(numericQuantity(values.quantity));
  const unit=String(values.unit??'').trim(); if(status!=='deleted'&&!unit) throw new Error('Scegli l’unità di misura.');
  return {schema:'1', event_id:options.id??globalThis.crypto.randomUUID(), record_id:recordKey(values.item_code,location), parents:[...new Set(parents)], item_code:String(values.item_code),location,quantity,unit,status,operator,note:String(values.note??'').trim(),created_at:options.now??new Date().toISOString(),device_id:options.deviceId??'unknown'};
}
export function validateEvent(e) {
  if(!e || e.schema!=='1' || typeof e.event_id!=='string' || !e.event_id || typeof e.record_id!=='string' || !Array.isArray(e.parents) || e.parents.some(x=>typeof x!=='string'||x===e.event_id) || !e.item_code || !e.location?.trim() || !e.operator?.trim() || !['counted','verify','deleted'].includes(e.status) || !e.unit && e.status!=='deleted' || !Number.isFinite(Date.parse(e.created_at))) throw new Error('File conteggi non valido: una registrazione è incompleta.');
  if(e.record_id!==recordKey(e.item_code,e.location)) throw new Error('Identificativo del conteggio incoerente.');
  if(e.status!=='deleted') numericQuantity(e.quantity);
  return e;
}
export function mergeEvents(...lists) {
  const byId=new Map();
  for(const list of lists) for(const e of list){validateEvent(e);const prev=byId.get(e.event_id);if(prev&&COLUMNS.some(k=>JSON.stringify(prev[k])!==JSON.stringify(e[k])))throw new Error('Due registrazioni con lo stesso identificativo contengono dati diversi. Ripristino interrotto.');byId.set(e.event_id,e);}
  const events=[...byId.values()];
  // A malformed graph must never silently hide quantities.
  const visiting=new Set(),visited=new Set();
  function visit(e){if(visiting.has(e.event_id))throw new Error('File conteggi non valido: revisioni circolari.');if(visited.has(e.event_id))return;visiting.add(e.event_id);for(const id of e.parents){const p=byId.get(id);if(!p)throw new Error('File conteggi incompleto: manca una revisione precedente.');if(p.record_id!==e.record_id)throw new Error('Revisioni riferite a ubicazioni diverse.');visit(p);}visiting.delete(e.event_id);visited.add(e.event_id);}
  events.forEach(visit);return events.sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.event_id.localeCompare(b.event_id));
}
export function resolveRecords(events,{includeDeleted=false}={}){
  const groups=new Map();for(const e of events){if(!groups.has(e.record_id))groups.set(e.record_id,[]);groups.get(e.record_id).push(e);}
  return [...groups].map(([id,versions])=>{const superseded=new Set(versions.flatMap(e=>e.parents));const heads=versions.filter(e=>!superseded.has(e.event_id));return {id,versions,heads,conflict:heads.length!==1,current:heads.length===1?heads[0]:null,item_code:versions[0].item_code,location:versions[0].location};}).filter(r=>includeDeleted||r.conflict||r.current?.status!=='deleted');
}
export function summary(events,catalog){
  const items=new Map(catalog.map(x=>[x.code,x]));const groups=new Map();
  for(const r of resolveRecords(events)){if(!groups.has(r.item_code))groups.set(r.item_code,[]);groups.get(r.item_code).push(r);}
  return [...groups].map(([code,records])=>{const units=[...new Set(records.flatMap(r=>r.heads.filter(e=>e.status!=='deleted').map(e=>e.unit)))];const conflict=records.some(r=>r.conflict);const verify=records.some(r=>r.heads.some(e=>e.status==='verify'));const badUnits=units.length>1;const total=conflict||badUnits?null:records.reduce((s,r)=>s+numericQuantity(r.current.quantity),0);return {code,item:items.get(code),records,units,total:total===null?null:Math.round((total+Number.EPSILON)*1e6)/1e6,status:conflict?'Conflitto da risolvere':badUnits?'Unità diverse da verificare':verify?'Da verificare':'Contati',blocked:conflict||badUnits};}).sort((a,b)=>a.code.localeCompare(b.code));
}
export function prepareCatalog(items){return items.map(item=>({...item,search:normalize([item.code,item.name,item.dim1,item.dim2,item.model,item.oldCode,item.manufacturerCode,item.manufacturer,item.picture].join(' ')),family:item.name.split(' - ')[0]}));}
function tokenMatches(text,token){
  if(/^\d+(?:[.,]\d+)?$/.test(token)){const safe=token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(`(^|[^0-9])${safe}(?![0-9])`).test(text);}
  if(/^(dn|de|pn|sdr|m)\d+(?:[.,]\d+)?$/.test(token)){const safe=token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(`\\b${safe}(?![0-9])`).test(text);}
  return text.includes(token);
}
export function searchCatalog(items,{query='',manufacturer='',dimension='',status='',events=[]}={}){
  const tokens=normalize(query).split(' ').filter(Boolean),dim=normalize(dimension);const records=resolveRecords(events);const counted=new Set(records.map(r=>r.item_code));const verify=new Set(records.filter(r=>r.conflict||r.heads.some(e=>e.status==='verify')).map(r=>r.item_code));
  return items.filter(item=>tokens.every(t=>tokenMatches(item.search,t))&&(!manufacturer||item.manufacturer===manufacturer)&&(!dim||dim.split(' ').every(t=>tokenMatches(normalize(`${item.dim1} ${item.dim2}`),t)))&&(!status||(status==='counted'?counted.has(item.code):status==='uncounted'?!counted.has(item.code):verify.has(item.code))));
}
export function groupByPicture(items){const m=new Map();for(const item of items){const key=item.picture||`no-image:${item.code}`;if(!m.has(key))m.set(key,{key,picture:item.picture,label:item.family||item.name,items:[],manufacturers:new Set()});const g=m.get(key);g.items.push(item);g.manufacturers.add(item.manufacturer);}return [...m.values()];}
export function imageURL(name,base='images/'){
  if(!name||/[\\/]/.test(name)||name.includes('..'))return '';if(!/^[\w ./-]+$/.test(base)||base.startsWith('/')||base.includes('..'))return '';return base.replace(/\/?$/,'/')+encodeURIComponent(name);
}
export function parseCSV(text,delimiter=';'){
  text=String(text).replace(/^\uFEFF/,'');if(!text)return [];
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"'){if(cell)throw new Error('CSV non valido: virgolette inattese.');quoted=true;}else if(c===delimiter){row.push(cell);cell='';}else if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw new Error('CSV non valido: virgolette non chiuse.');if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
function protect(value){const s=String(value??'');return /^\s*[=+\-@\t\r']/.test(s)?"'"+s:s;}
function unprotect(value){return value.startsWith("'")&&/^\s*[=+\-@\t\r']/.test(value.slice(1))?value.slice(1):value;}
export function writeCSV(rows,{safe=true}={}) {return '\uFEFF'+rows.map(row=>row.map(x=>{const s=safe?protect(x):String(x??'');return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(';')).join('\r\n')+'\r\n';}
export function eventsCSV(events){return writeCSV([COLUMNS,...events.map(e=>COLUMNS.map(k=>k==='parents'?JSON.stringify(e.parents):e[k]))]);}
export function readEventsCSV(text){const rows=parseCSV(text);if(!rows.length)throw new Error('Il CSV è vuoto o danneggiato.');if(rows[0].join('|')!==COLUMNS.join('|'))throw new Error('Il CSV non usa il formato di questa applicazione. Nessun dato è stato sovrascritto.');const events=rows.slice(1).map(row=>{if(row.length!==COLUMNS.length)throw new Error('CSV incompleto: numero di colonne errato.');const e=Object.fromEntries(COLUMNS.map((k,i)=>[k,unprotect(row[i])]));try{e.parents=JSON.parse(e.parents);}catch{throw new Error('Revisioni CSV non valide.');}return validateEvent(e);});return mergeEvents(events);}
export function exportSummary(events,catalog){return writeCSV([['Codice articolo','Descrizione','Misura','Caratteristiche','Produttore','Vecchio codice','Codice produttore','Unità','Quantità totale','Ubicazioni','Stato'],...summary(events,catalog).map(s=>[s.code,s.item?.name??'Articolo fuori catalogo',s.item?.dim1??'',s.item?.dim2??'',s.item?.manufacturer??'',s.item?.oldCode??'',s.item?.manufacturerCode??'',s.units.join(' / '),s.total===null?'':s.total,s.records.map(r=>r.location).join(' | '),s.status])]);}
export function exportDetails(events,catalog){const m=new Map(catalog.map(x=>[x.code,x]));return writeCSV([['Codice articolo','Descrizione','Ubicazione','Quantità','Unità','Stato','Operatore','Data e ora','Note','Registrazione'],...resolveRecords(events).flatMap(r=>r.heads.map(e=>[e.item_code,m.get(e.item_code)?.name??'',e.location,e.quantity,e.unit,r.conflict?'Conflitto':e.status==='verify'?'Da verificare':e.status==='deleted'?'Eliminazione in conflitto':'Contati',e.operator,e.created_at,e.note,e.event_id]))]);}
