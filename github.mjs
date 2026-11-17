import {mergeEvents,eventsCSV,readEventsCSV} from './core.mjs';
export class GitHubError extends Error { constructor(message,status,retryAfter=0){super(message);this.status=status;this.retryAfter=retryAfter;} }
const pause=ms=>new Promise(r=>setTimeout(r,ms));
export function validateConfig(c){
  if(!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(c.owner??'')||!/^[A-Za-z0-9_.-]+$/.test(c.repo??'')||c.repo==='.'||c.repo==='..')throw new Error('Indica proprietario e nome del repository dei conteggi.');
  if(!c.branch||/[\x00-\x20~^:?*\[\\]/.test(c.branch)||c.branch.includes('..'))throw new Error('Nome del branch non valido.');
  if(!c.path||c.path.startsWith('/')||c.path.split('/').some(x=>!x||x==='.'||x==='..')||!c.path.toLowerCase().endsWith('.csv'))throw new Error('Il percorso deve indicare un file .csv nel repository.');
  return c;
}
export class GitHubCSV {
  constructor(config,token,{fetchFn=globalThis.fetch,sleep=pause,maxRetries=5}={}){this.config=validateConfig(config);if(!token?.trim())throw new Error('Inserisci il token GitHub per questa sessione.');this.token=token.trim();this.fetch=fetchFn;this.sleep=sleep;this.maxRetries=maxRetries;}
  get endpoint(){const c=this.config;return `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${c.path.split('/').map(encodeURIComponent).join('/')}`;}
  async request(url,options={}){
    let response;try{response=await this.fetch(url,{...options,cache:'no-store',headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${this.token}`,'X-GitHub-Api-Version':'2022-11-28',...options.headers},signal:AbortSignal.timeout(30000)});}catch(e){throw new GitHubError(e.name==='TimeoutError'?'GitHub non risponde: i conteggi restano sul dispositivo.':'Connessione non disponibile: i conteggi restano sul dispositivo.',0);}
    if(!response.ok){let message='';try{message=(await response.json()).message??'';}catch{}
      const status=response.status,reset=Number(response.headers.get('x-ratelimit-reset'))*1000,retry=Number(response.headers.get('retry-after'))*1000;
      const rateLimited=status===429||status===403&&(response.headers.get('x-ratelimit-remaining')==='0'||retry||/rate limit|secondary/i.test(message));
      const retryAfter=rateLimited?Math.max(60000,retry||0,Number.isFinite(reset)?reset-Date.now():0):0;
      throw new GitHubError(status===401?'Token non valido o scaduto. Reinseriscilo in Impostazioni.':rateLimited?'GitHub richiede una pausa. I conteggi restano salvati sul dispositivo.':status===403?'Scrittura non autorizzata: verifica il permesso Contents: Read and write e le regole del branch.':status===404?'Repository, branch o file non accessibile. Verifica i dati e i permessi del token.':status===409?'Un altro operatore ha aggiornato il file.':`GitHub ha rifiutato l’operazione (${status}).`,status,retryAfter);
    }return response;
  }
  async read(){
    const url=`${this.endpoint}?ref=${encodeURIComponent(this.config.branch)}`;
    let response;try{response=await this.request(url);}catch(e){if(e.status!==404)throw e;
      // Distinguish a new file from a missing/private repository or wrong branch.
      const c=this.config;await this.request(`https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/branches/${encodeURIComponent(c.branch)}`);return {sha:null,events:[]};
    }
    const body=await response.json();if(body.type!=='file'||!body.sha)throw new GitHubError('Il percorso configurato non è un file.',422);
    let csv;if(body.encoding==='base64'&&typeof body.content==='string'&&body.content){const binary=atob(body.content.replace(/\s/g,''));csv=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));}else{const raw=await this.request(url,{headers:{Accept:'application/vnd.github.raw+json'}});csv=await raw.text();}
    return {sha:body.sha,events:readEventsCSV(csv)};
  }
  async sync(localEvents){
    for(let attempt=0;attempt<this.maxRetries;attempt++){
      const remote=await this.read();const merged=mergeEvents(remote.events,localEvents);const remoteIds=new Set(remote.events.map(e=>e.event_id));
      if(merged.every(e=>remoteIds.has(e.event_id)))return {events:merged,written:false};
      const csv=eventsCSV(merged),bytes=new TextEncoder().encode(csv);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      const body={message:`Inventario: sincronizza ${merged.length-remote.events.length} registrazioni`,content:btoa(binary),branch:this.config.branch};if(remote.sha)body.sha=remote.sha;
      try{await this.request(this.endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {events:merged,written:true};}
      catch(e){if((e.status!==409&&!(e.status===422&&!remote.sha))||attempt===this.maxRetries-1)throw e;await this.sleep(250*(attempt+1)+Math.floor(Math.random()*300));}
    }
  }
}
