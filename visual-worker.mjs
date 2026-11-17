import {VISUAL_MODEL,normalizeVector} from './visual-core.mjs';
let engine=null,chain=Promise.resolve();
async function loadEngine(id){
  if(!engine)engine=(async()=>{
    const {AutoProcessor,CLIPVisionModelWithProjection,RawImage,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
    env.allowLocalModels=false;env.useBrowserCache=true;env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
    const progress_callback=e=>{if(e.status==='progress')self.postMessage({id,type:'progress',file:e.file,loaded:e.loaded,total:e.total,progress:e.progress});};
    const options={revision:VISUAL_MODEL.revision,progress_callback};
    const processor=await AutoProcessor.from_pretrained(VISUAL_MODEL.id,options);
    const model=await CLIPVisionModelWithProjection.from_pretrained(VISUAL_MODEL.id,{...options,dtype:VISUAL_MODEL.dtype,device:'wasm'});
    return {processor,model,RawImage};
  })().catch(e=>{engine=null;throw e;});
  return engine;
}
self.addEventListener('message',event=>{
  const {id,type,pixels}=event.data??{};if(!id||!['load','embed'].includes(type))return;
  chain=chain.then(async()=>{
    const {processor,model,RawImage}=await loadEngine(id);
    if(type==='load'){self.postMessage({id,type:'ready'});return;}
    if(!pixels||pixels.width!==512||pixels.height!==512||!(pixels.data instanceof ArrayBuffer)||pixels.data.byteLength!==512*512*4)throw new Error('Immagine da confrontare non valida.');
    const image=new RawImage(new Uint8ClampedArray(pixels.data),512,512,4);
    const inputs=await processor(image),outputs=await model(inputs);let vector;
    try{vector=normalizeVector(outputs.image_embeds.data);}
    finally{for(const value of Object.values(inputs))value?.dispose?.();for(const value of Object.values(outputs))value?.dispose?.();}
    self.postMessage({id,type:'result',vector:vector.buffer},[vector.buffer]);
  }).catch(error=>self.postMessage({id,type:'error',message:String(error?.message??'Ricerca fotografica non disponibile.').slice(0,700)}));
});
