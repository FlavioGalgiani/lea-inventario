import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeVector,rankPictures,createVisualIndex,validateVisualIndex,mergeVisualEntries,resultStrength} from '../visual-core.mjs';
import {buildPictureIndex,imageHash} from '../visual-indexer.mjs';

const vector=(a=1,b=0)=>[a,b,...Array(510).fill(0)];
const entry=(picture,v=vector())=>({picture,sourceHash:'a'.repeat(64),vector:v});
test('foto: classifica per coseno, normalizza e non duplica le famiglie',()=>{
  const result=rankPictures(vector(6),[entry('seconda.png',vector(.5,.5)),entry('prima.png',vector(3)),entry('prima.png'),entry('fuori.png')],{allowed:new Set(['prima.png','seconda.png'])});
  assert.deepEqual(result.map(e=>e.picture),['prima.png','seconda.png']);assert.ok(result[0].score>.999);assert.ok(result[1].score>.70&&result[1].score<.71);
});
test('foto: rifiuta vettori vuoti, errati o non finiti',()=>{
  for(const v of [[],Array(512).fill(0),vector(NaN),vector(Infinity),vector(Number.MAX_VALUE)])assert.throws(()=>normalizeVector(v));
});
test('foto: indice esportabile mantiene dati e filtra cataloghi diversi',()=>{
  const index=JSON.parse(JSON.stringify(createVisualIndex([entry('démo 1.png'),entry('altra.png')])));const valid=validateVisualIndex(index,new Set(['démo 1.png']));assert.equal(valid.entries.length,1);assert.equal(valid.entries[0].picture,'démo 1.png');
});
test('foto: tutti i nomi del catalogo sono accettati senza inventare immagini',()=>{
  const items=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url))).items,names=[...new Set(items.map(i=>i.picture).filter(Boolean))];assert.equal(names.length,853);assert.equal(validateVisualIndex(createVisualIndex(names.map(n=>entry(n)))).entries.length,853);
});
test('foto: indici incompatibili, duplicati e riferimenti non sicuri rifiutati',()=>{
  const base=createVisualIndex([entry('ok.png')]);
  for(const change of [x=>x.model.revision='altra',x=>x.model.preprocess='altro',x=>x.entries.push(x.entries[0]),x=>x.entries[0].picture='../ok.png',x=>x.entries[0].sourceHash='errato',x=>x.entries[0].vector=[1],x=>x.version=2]){const copy=structuredClone(base);change(copy);assert.throws(()=>validateVisualIndex(copy));}
});
test('foto: aggiornare una famiglia sostituisce solo il suo vettore',()=>{
  const merged=mergeVisualEntries([entry('uno.png'),entry('due.png')],[entry('uno.png',vector(0,1))]);assert.equal(merged.length,2);assert.equal(merged.find(e=>e.picture==='uno.png').vector[1],1);
});
test('foto: somiglianza debole e prodotti ambigui non diventano probabilità',()=>{
  assert.equal(resultStrength([]),'empty');assert.equal(resultStrength([{score:.2}]),'weak');assert.equal(resultStrength([{score:.8},{score:.79}]),'ambiguous');assert.equal(resultStrength([{score:.8},{score:.6}]),'candidates');
});
test('foto: nessuna immagine disponibile non avvia il modello',async()=>{
  let calls=0,saved;const result=await buildPictureIndex({pictures:['uno.png','due.png'],readPicture:async()=>null,embed:async()=>{calls++;},checkpoint:async i=>saved=i});assert.equal(calls,0);assert.equal(result.missing,2);assert.equal(saved.entries.length,0);
});
test('foto: ripresa usa hash delle immagini e ricrea solo foto cambiate',async()=>{
  const a=new Blob(['foto A']),b=new Blob(['foto B']);let calls=0;const existing=[{...entry('uno.png'),sourceHash:await imageHash(a)},{...entry('due.png'),sourceHash:await imageHash(a)}];
  const result=await buildPictureIndex({pictures:['uno.png','due.png','due.png'],existing,readPicture:async p=>p==='uno.png'?a:b,embed:async()=>{calls++;return vector(0,1);}});assert.equal(calls,1);assert.equal(result.unchanged,1);assert.equal(result.index.entries.length,2);assert.equal(result.index.entries.find(e=>e.picture==='due.png').sourceHash,await imageHash(b));
});
test('foto: annullare conserva i vettori completati e ferma le nuove letture',async()=>{
  const controller=new AbortController();let reads=0,saved;await assert.rejects(buildPictureIndex({pictures:['uno.png','due.png','tre.png'],signal:controller.signal,readPicture:async()=>{reads++;return new Blob(['foto']);},embed:async()=>vector(),checkpoint:async i=>saved=i,onProgress:e=>{if(e.processed===1&&e.phase==='reading')controller.abort();}}));assert.equal(reads,1);assert.equal(saved.entries.length,1);
});
test('foto: errore modello conserva checkpoint e non pubblica un indice fittizio',async()=>{
  let n=0,saved;await assert.rejects(buildPictureIndex({pictures:['uno.png','due.png'],readPicture:async()=>new Blob(['foto']),embed:async()=>{if(++n===2)throw Error('modello interrotto');return vector();},checkpoint:async i=>saved=i}),/modello interrotto/);assert.deepEqual(saved.entries.map(e=>e.picture),['uno.png']);
});
