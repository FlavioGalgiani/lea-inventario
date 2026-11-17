export async function imagePixels(blob){
  if(!(blob instanceof Blob)||!blob.size||blob.size>25*1024*1024)throw new Error('Scegli una foto JPG, PNG o WebP di dimensione inferiore a 25 MB.');
  let image,url;
  try{if(typeof createImageBitmap==='function')image=await createImageBitmap(blob,{imageOrientation:'from-image'});else{url=URL.createObjectURL(blob);image=new Image();image.src=url;await image.decode();}
    const w=image.width||image.naturalWidth,h=image.height||image.naturalHeight;if(!w||!h||w*h>100000000)throw new Error('dimensioni');
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#ffffff';ctx.fillRect(0,0,512,512);const scale=Math.min(480/w,480/h);ctx.drawImage(image,(512-w*scale)/2,(512-h*scale)/2,w*scale,h*scale);const data=ctx.getImageData(0,0,512,512).data;
    return {width:512,height:512,data:data.buffer};
  }catch{throw new Error('Foto non leggibile. Prova uno scatto JPG o un’immagine PNG / WebP.');}finally{image?.close?.();if(url)URL.revokeObjectURL(url);}
}
export class BrowserVisualEncoder{
  constructor(){this.worker=null;this.pending=new Map();this.serial=0;this.generation=0;}
  start(){if(this.worker)return;if(typeof Worker==='undefined')throw new Error('Il browser non supporta la ricerca fotografica. Prova un browser aggiornato.');const worker=new Worker(new URL('./visual-worker.mjs?v=1.1.0',import.meta.url),{type:'module'});this.worker=worker;
    worker.addEventListener('message',event=>{const data=event.data,p=this.pending.get(data.id);if(!p)return;if(data.type==='progress'){clearTimeout(p.timer);p.timer=setTimeout(()=>this.cancel('Il download del modello si è interrotto. Riprova con una connessione stabile.'),180000);p.onProgress?.(data);return;}clearTimeout(p.timer);this.pending.delete(data.id);if(data.type==='error')p.reject(new Error(`Ricerca fotografica non disponibile: ${data.message}`));else p.resolve(data.type==='result'?new Float32Array(data.vector):true);});
    worker.addEventListener('error',event=>{event.preventDefault();this.cancel('Impossibile avviare la ricerca fotografica su questo browser. Verifica la connessione o riprova dopo aver ricaricato la pagina.');});
  }
  request(type,pixels,onProgress){this.start();return new Promise((resolve,reject)=>{const id=++this.serial,timer=setTimeout(()=>this.cancel('Preparazione troppo lenta. Riprova con una connessione stabile.'),180000);this.pending.set(id,{resolve,reject,timer,onProgress});this.worker.postMessage({id,type,pixels},pixels?[pixels.data]:[]);});}
  load(onProgress){return this.request('load',null,onProgress);}
  async embed(blob,onProgress){const generation=this.generation,pixels=await imagePixels(blob);if(generation!==this.generation)throw new Error('Operazione annullata.');return this.request('embed',pixels,onProgress);}
  cancel(message='Operazione annullata.'){this.generation++;this.worker?.terminate();this.worker=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error(message));}this.pending.clear();}
}
