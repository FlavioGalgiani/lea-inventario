import {mergeEvents} from './core.mjs';
export function mergeSnapshot(previous,events,pending,confirmed=[],lastSync=''){
  const all=mergeEvents(previous?.events??[],events),ids=new Set(all.map(e=>e.event_id)),ack=new Set(confirmed);
  return {version:1,events:all,pending:[...new Set([...(previous?.pending??[]),...pending])].filter(id=>ids.has(id)&&!ack.has(id)),lastSync:[previous?.lastSync??'',lastSync].sort().at(-1)};
}
// Browser-managed local database: retains the complete shared ledger without
// the small per-key/value quota of localStorage. Transactions also serialize tabs.
export class InventoryStore{
  constructor(indexedDB=globalThis.indexedDB){this.indexedDB=indexedDB;this.ready=null;}
  open(){if(this.ready)return this.ready;this.ready=new Promise((resolve,reject)=>{if(!this.indexedDB){reject(new Error('Archivio locale non disponibile in questo browser.'));return;}const request=this.indexedDB.open('lea-inventario',1);request.onupgradeneeded=()=>{request.result.createObjectStore('snapshots');};request.onerror=()=>reject(new Error('Impossibile aprire l’archivio locale. Abilita lo spazio del sito e usa una sessione normale.'));request.onsuccess=()=>resolve(request.result);request.onblocked=()=>reject(new Error('Chiudi le altre schede dell’inventario e riapri questa pagina.'));});return this.ready;}
  async get(key){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readonly'),request=tx.objectStore('snapshots').get(key);request.onsuccess=()=>resolve(request.result??{events:[],pending:[],lastSync:''});request.onerror=()=>reject(new Error('Impossibile leggere i conteggi locali. I dati non sono stati cancellati.'));});}
  async merge(key,events,pending,{confirmed=[],lastSync=''}={}){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots'),request=store.get(key);let result,reason;request.onsuccess=()=>{try{result=mergeSnapshot(request.result,events,pending,confirmed,lastSync);store.put(result,key);}catch(e){reason=e;tx.abort();}};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(reason??new Error('Spazio locale non disponibile: l’operazione NON è stata salvata. Scarica una copia di recupero e verifica lo spazio del sito.'));tx.onabort=()=>reject(reason??new Error('Salvataggio locale interrotto. L’operazione NON è stata confermata.'));});}
}
