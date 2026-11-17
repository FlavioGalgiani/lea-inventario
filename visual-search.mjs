import {escapeHTML as esc} from './core.mjs';
import {createVisualIndex,validateVisualIndex,mergeVisualEntries,rankPictures,resultStrength} from './visual-core.mjs';
import {BrowserVisualEncoder} from './visual-encoder.mjs';
import {VisualIndexStore} from './visual-store.mjs';
import {buildPictureIndex} from './visual-indexer.mjs';

const $=id=>document.getElementById(id);
export class PhotoSearch {
  constructor({getGroups,getSource,photo,openFamily,download,onResults,encoder=new BrowserVisualEncoder()}){
    Object.assign(this,{getGroups,getSource,photo,openFamily,download,onResults,encoder});this.entries=[];this.busy=false;this.ready=false;this.serial=0;this.queryURL='';this.persistenceWarning='';
  }
  wire(){
    $('settings-dialog').insertAdjacentHTML('beforeend','<hr><h3>Ricerca con una foto</h3><p id="visual-settings-status" class="small-note">Caricamento dell’indice fotografico…</p><button id="visual-settings-open" class="button secondary" type="button">Prepara o importa indice fotografico</button>');
    $('visual-open').addEventListener('click',()=>$('visual-camera-file').click());
    $('visual-settings-open').addEventListener('click',()=>{$('settings-dialog').close();this.open(true);});
    for(const [button,input] of [['visual-camera','visual-camera-file'],['visual-gallery','visual-gallery-file'],['visual-import','visual-index-file']])$(button).addEventListener('click',()=>$(input).click());
    for(const id of ['visual-camera-file','visual-gallery-file'])$(id).addEventListener('change',e=>{const file=e.target.files[0];e.target.value='';if(file){this.open();this.search(file);}});
    $('visual-index-file').addEventListener('change',e=>{const file=e.target.files[0];e.target.value='';if(file)this.importIndex(file);});
    $('visual-build').addEventListener('click',()=>this.build());
    $('visual-export').addEventListener('click',()=>this.download('photo-index.json',JSON.stringify(createVisualIndex(this.entries)),'application/json'));
    $('visual-cancel').addEventListener('click',()=>this.cancel());
    $('visual-dialog').addEventListener('close',()=>{this.cancel(false);this.encoder.cancel();this.clearPreview();});
    $('visual-results').addEventListener('click',e=>{const b=e.target.closest('[data-visual-picture]');if(!b)return;const group=[...this.getGroups().values()].find(g=>g.picture===b.dataset.visualPicture);if(group){$('visual-dialog').close();this.openFamily(group.key,{query:''});}});
  }
  async init(scope){
    this.allowed=new Set([...this.getGroups().values()].map(g=>g.picture).filter(Boolean));this.store=new VisualIndexStore(scope);
    let local=null,shared=null;
    try{const data=await this.store.read();if(data)local=validateVisualIndex(data,this.allowed);}catch{this.persistenceWarning='Archivio fotografico locale non disponibile. Puoi importare ed esportare l’indice.';}
    try{const response=await fetch('data/photo-index.json',{cache:'no-store'});if(response.ok)shared=validateVisualIndex(await response.json(),this.allowed);}catch{/* A shared index is optional; preparation and import remain available. */}
    const lists=[local,shared].filter(Boolean).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));this.entries=mergeVisualEntries(...lists.map(i=>i.entries));this.ready=true;this.renderStatus();
  }
  renderStatus(){
    const n=this.entries.length,total=this.allowed?.size??0,label=this.ready?`${n} foto pronte su ${total} riferimenti.`:'Caricamento dell’indice fotografico…';
    for(const id of ['visual-index-status','visual-settings-status'])$(id).textContent=label;
    $('visual-index-help').textContent=n?`La ricerca confronta solo le ${n} foto preparate. Conferma sempre famiglia, diametro, lunghezza e filettatura.`:'Prima di cercare serve preparare le foto del catalogo, oppure importare l’indice creato su un altro PC. Aggiungi le foto originali alla cartella images/ su GitHub o selezionale nelle Impostazioni.';
    for(const id of ['visual-camera','visual-gallery'])$(id).disabled=this.busy;
    for(const id of ['visual-build','visual-import'])$(id).disabled=this.busy||!this.ready;
    $('visual-export').disabled=this.busy||!n;$('visual-cancel').hidden=!this.busy;
    if(this.persistenceWarning)$('visual-storage-warning').textContent=this.persistenceWarning;
  }
  open(setup=false){
    for(const id of ['visual-index-status','visual-index-help','visual-storage-warning','visual-setup'])$(id).hidden=!setup;
    $('visual-setup').open=setup;
    if(!$('visual-dialog').open)$('visual-dialog').showModal();
    this.renderStatus();
  }
  setStatus(text){$('visual-progress').textContent=text;}
  modelProgress(e){const pct=Number.isFinite(e.progress)?` ${Math.round(e.progress)}%`:'';this.setStatus(`Preparazione del modello sul dispositivo…${pct} Al primo utilizzo scarica circa 90 MB; la foto resta su questo dispositivo.`);}
  begin(){if(this.busy)return null;this.busy=true;const id=++this.serial;this.abort=new AbortController();$('visual-cancel').disabled=false;$('visual-error').textContent='';this.renderStatus();return id;}
  end(id){if(id!==this.serial)return;this.busy=false;this.abort=null;this.renderStatus();}
  cancel(show=true){if(!this.busy)return;this.abort?.abort();this.encoder.cancel();$('visual-cancel').disabled=true;if(show)this.setStatus('Operazione annullata. Le foto già preparate restano disponibili.');}
  clearPreview(){if(this.queryURL)URL.revokeObjectURL(this.queryURL);this.queryURL='';$('visual-query').removeAttribute('src');$('visual-query-wrap').hidden=true;$('visual-results').replaceChildren();$('visual-results-note').textContent='';}
  async saveIndex(index){this.entries=index.entries;this.renderStatus();try{await this.store.write(index);}catch(e){this.persistenceWarning=e.message;this.renderStatus();}}
  async readPicture(picture,signal){
    const source=this.getSource(picture);if(!source)return null;
    const controller=new AbortController(),abort=()=>controller.abort(signal?.reason),timer=setTimeout(()=>controller.abort(new Error('Tempo scaduto durante il caricamento delle foto. Riprova.')),20000);signal?.addEventListener('abort',abort,{once:true});
    try{signal?.throwIfAborted();const response=await fetch(source,{signal:controller.signal,credentials:'omit'});if(!response.ok)return null;const blob=await response.blob();if(!blob.size||blob.size>25*1024*1024)return null;return blob;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  async build(){
    const id=this.begin();if(id===null)return;this.clearPreview();const signal=this.abort.signal;
    try{
      this.setStatus('Controllo le foto del catalogo… Mantieni aperta questa pagina. Puoi interrompere e riprendere.');
      const result=await buildPictureIndex({pictures:this.allowed,existing:this.entries,signal,readPicture:(p,s)=>this.readPicture(p,s),embed:b=>this.encoder.embed(b,e=>{if(!signal.aborted)this.modelProgress(e);}),checkpoint:index=>this.saveIndex(index),onProgress:e=>{if(!signal.aborted)this.setStatus(`${e.phase==='encoding'?'Confronto':'Controllo'} foto ${e.processed} / ${this.allowed.size} · ${e.added} preparate · ${e.missing} mancanti. ${e.picture}`);}});
      if(id!==this.serial)return;
      if(!result.index.entries.length)throw new Error('Nessuna foto del catalogo trovata. Carica le immagini originali nella cartella images/ su GitHub, oppure seleziona la cartella nelle Impostazioni e riprova.');
      this.setStatus(`Preparazione completata: ${result.index.entries.length} foto pronte; ${result.missing} mancanti o non leggibili. Esporta l’indice e caricalo in data/photo-index.json su GitHub per renderlo disponibile a tutti i telefoni.`);
      $('visual-setup').open=true;
    }catch(e){if(id===this.serial&&!signal.aborted)$('visual-error').textContent=e.message||'Preparazione interrotta. Puoi riprendere dalle foto già preparate.';}finally{this.end(id);this.encoder.cancel();}
  }
  async search(file){
    if(!this.entries.length){$('visual-error').textContent='Prepara prima le foto del catalogo.';return;}
    const id=this.begin();if(id===null)return;this.clearPreview();const signal=this.abort.signal;
    try{
      // Load the worker first so cancellation cannot start a new worker after image decoding.
      this.setStatus('Preparo il confronto fotografico… Al primo utilizzo occorre scaricare circa 90 MB.');
      await this.encoder.load(e=>{if(!signal.aborted)this.modelProgress(e);});if(signal.aborted)return;
      this.queryURL=URL.createObjectURL(file);$('visual-query').hidden=false;$('visual-query').src=this.queryURL;$('visual-query-wrap').hidden=false;
      this.setStatus('Confronto lo scatto con le foto preparate…');const vector=await this.encoder.embed(file);if(signal.aborted)return;
      const ranked=rankPictures(vector,this.entries,{allowed:this.allowed,limit:8});
      if(!ranked.length)throw new Error('Nessun articolo candidato trovato. Riprova con un altro scatto.');
      this.onResults?.(ranked,{strength:resultStrength(ranked)});
      this.setStatus('Confronto completato. I possibili articoli sono mostrati nel catalogo.');
      $('visual-dialog').close();
    }catch(e){if(id===this.serial&&!signal.aborted)$('visual-error').textContent=e.message||'Confronto non riuscito. Riprova con un’altra foto.';}finally{this.end(id);}
  }
  showResults(ranked){
    const strength=resultStrength(ranked);$('visual-results-note').textContent=strength==='weak'?'Nessuna somiglianza convincente. Queste sono solo proposte: prova uno sfondo chiaro e un pezzo ben inquadrato.':strength==='ambiguous'?'Più prodotti hanno un aspetto simile. Verifica la famiglia e tutte le misure.':'Prodotti in ordine di somiglianza visiva. Il confronto suggerisce la famiglia; la misura va confermata.';
    $('visual-results').innerHTML=ranked.map((r,i)=>{const g=[...this.getGroups().values()].find(g=>g.picture===r.picture);return g?`<button class="product-card visual-card" type="button" data-visual-picture="${esc(r.picture)}" aria-label="Proposta ${i+1}: ${esc(g.label)}, scegli la variante">${this.photo(r.picture)}<span class="product-body"><span class="product-manufacturer">Proposta ${i+1}</span><span class="product-name">${esc(g.label)}</span><span class="product-bottom">${g.items.length} varianti · scegli la misura <span aria-hidden="true">↗</span></span></span></button>`:'';}).join('');
  }
  async importIndex(file){
    const id=this.begin();if(id===null)return;const signal=this.abort.signal;
    try{if(file.size>30*1024*1024)throw new Error('Il file indice supera 30 MB.');const index=validateVisualIndex(JSON.parse(await file.text()),this.allowed);if(!index.entries.length)throw new Error('Questo indice non contiene foto del catalogo attuale.');if(signal.aborted)return;await this.saveIndex(createVisualIndex(mergeVisualEntries(this.entries,index.entries)));if(signal.aborted)return;this.clearPreview();this.setStatus(`${index.entries.length} foto importate. Ora puoi scattare o scegliere una foto.`);}catch(e){if(id===this.serial&&!signal.aborted)$('visual-error').textContent=e instanceof SyntaxError?'Il file non è un indice JSON valido.':e.message;}finally{this.end(id);}
  }
}

