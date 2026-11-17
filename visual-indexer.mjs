import {createVisualIndex} from './visual-core.mjs';

export async function imageHash(blob){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');}

// One encoder at a time keeps memory bounded on phones; checkpoints allow resuming.
export async function buildPictureIndex({pictures,existing=[],readPicture,embed,checkpoint=async()=>{},onProgress=()=>{},signal}){
  const entries=new Map(existing.map(e=>[e.picture,e]));let processed=0,added=0,missing=0,unchanged=0;
  try{
    for(const picture of new Set(pictures)){
      signal?.throwIfAborted();onProgress({picture,processed,added,missing,unchanged,phase:'reading'});signal?.throwIfAborted();
      const blob=await readPicture(picture,signal);signal?.throwIfAborted();processed++;
      if(!blob){missing++;continue;}
      const sourceHash=await imageHash(blob);signal?.throwIfAborted();
      if(entries.get(picture)?.sourceHash===sourceHash){unchanged++;continue;}
      onProgress({picture,processed,added,missing,unchanged,phase:'encoding'});
      let vector;try{vector=await embed(blob);}catch(e){if(signal?.aborted)throw e;throw new Error(`Impossibile preparare ${picture}: ${e.message}`);}signal?.throwIfAborted();
      entries.set(picture,{picture,sourceHash,vector:Array.from(vector)});added++;
      if(added%5===0)await checkpoint(createVisualIndex([...entries.values()]));
    }
  }finally{await checkpoint(createVisualIndex([...entries.values()]));}
  return {index:createVisualIndex([...entries.values()]),processed,added,missing,unchanged};
}
