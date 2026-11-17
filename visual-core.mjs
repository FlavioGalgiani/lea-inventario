export const VISUAL_MODEL=Object.freeze({id:'Xenova/clip-vit-base-patch32',revision:'6b7c523703ae26e39be4b03774966f8571c7f523',library:'3.8.1',dtype:'q8',dimensions:512,preprocess:'white-contain-512-v1'});
export const VISUAL_FORMAT='lea-visual-index';
export function modelSignature(model=VISUAL_MODEL){return [model.id,model.revision,model.library,model.dtype,model.dimensions,model.preprocess].join('|');}
export function normalizeVector(values){
  if(!values||values.length!==VISUAL_MODEL.dimensions)throw new Error('Il modello ha restituito un vettore di dimensione non valida.');
  let norm=0;for(const n of values){if(!Number.isFinite(n))throw new Error('Il confronto fotografico ha restituito valori non validi.');norm+=n*n;}
  if(!Number.isFinite(norm)||norm<1e-16)throw new Error('La foto non contiene informazioni sufficienti per il confronto.');
  norm=Math.sqrt(norm);return Float32Array.from(values,n=>n/norm);
}
export function rankPictures(query,entries,{limit=8,allowed=null}={}){
  const q=normalizeVector(query),seen=new Set(),ranked=[];
  for(const e of entries){if(seen.has(e.picture)||allowed&&!allowed.has(e.picture))continue;seen.add(e.picture);const v=normalizeVector(e.vector);let score=0;for(let i=0;i<q.length;i++)score+=q[i]*v[i];ranked.push({picture:e.picture,score:Math.max(-1,Math.min(1,score))});}
  return ranked.sort((a,b)=>b.score-a.score||a.picture.localeCompare(b.picture)).slice(0,Math.max(0,Math.floor(limit)));
}
export function createVisualIndex(entries,{createdAt=new Date().toISOString()}={}){return {format:VISUAL_FORMAT,version:1,model:{...VISUAL_MODEL},createdAt,entries:entries.map(e=>({picture:e.picture,sourceHash:e.sourceHash,vector:Array.from(normalizeVector(e.vector),n=>Math.round(n*1e7)/1e7)})).sort((a,b)=>a.picture.localeCompare(b.picture))};}
export function validateVisualIndex(data,allowed){
  if(!data||data.format!==VISUAL_FORMAT||data.version!==1||!data.model||modelSignature(data.model)!==modelSignature())throw new Error('Indice fotografico non compatibile con questa versione della ricerca.');
  if(!Array.isArray(data.entries)||data.entries.length>10000||!Number.isFinite(Date.parse(data.createdAt)))throw new Error('Indice fotografico incompleto o danneggiato.');
  const seen=new Set(),entries=[];
  for(const e of data.entries){if(!e||typeof e.picture!=='string'||/[\\/\u0000-\u001f]/.test(e.picture)||e.picture==='..'||seen.has(e.picture)||!/^.+\.(png|jpe?g|webp|gif)$/i.test(e.picture)||typeof e.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(e.sourceHash)||!Array.isArray(e.vector))throw new Error('Indice fotografico non valido: riferimenti duplicati o incompleti.');seen.add(e.picture);const vector=normalizeVector(e.vector);if(!allowed||allowed.has(e.picture))entries.push({picture:e.picture,sourceHash:e.sourceHash,vector:Array.from(vector)});}
  return {...data,entries};
}
export function mergeVisualEntries(...lists){const map=new Map();for(const list of lists)for(const e of list)map.set(e.picture,e);return [...map.values()].sort((a,b)=>a.picture.localeCompare(b.picture));}
export function resultStrength(results){if(!results.length)return 'empty';const first=results[0].score,margin=results.length>1?first-results[1].score:0;return first<.35?'weak':results.length>1&&margin<.025?'ambiguous':'candidates';}
