import {modelSignature} from './visual-core.mjs';
export class VisualIndexStore{
  constructor(scope){this.key=`${scope}|${modelSignature()}`;this.ready=null;}
  open(){if(this.ready)return this.ready;this.ready=new Promise((resolve,reject)=>{const req=indexedDB.open('lea-visual-search',1);req.onupgradeneeded=()=>req.result.createObjectStore('indexes');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(new Error('Archivio fotografico locale non disponibile.'));});return this.ready;}
  async read(){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('indexes','readonly'),r=tx.objectStore('indexes').get(this.key);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(new Error('Impossibile leggere l’indice fotografico locale.'));});}
  async write(data){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('indexes','readwrite');tx.objectStore('indexes').put(data,this.key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('Non c’è spazio sufficiente per conservare l’indice fotografico su questo dispositivo. Esporta l’indice prima di chiudere.'));tx.onabort=()=>reject(new Error('Salvataggio dell’indice fotografico interrotto.'));});}
}
