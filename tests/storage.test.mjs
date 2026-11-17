import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeSnapshot} from '../storage.mjs';
import {makeEvent} from '../core.mjs';
const event=id=>makeEvent({item_code:'A15004',location:id,quantity:2,unit:'pz',operator:'Test'},[],{id,deviceId:'test'});
test('salvataggi da schede diverse conservano entrambi i conteggi',()=>{const a=event('A'),b=event('B'),first=mergeSnapshot(null,[a],['A']),second=mergeSnapshot(first,[b],['B']);assert.equal(second.events.length,2);assert.deepEqual(second.pending,['A','B']);});
test('conferma GitHub non rimuove modifiche arrivate durante l’invio',()=>{const a=event('A'),b=event('B'),disk=mergeSnapshot(null,[a,b],['A','B']);const ack=mergeSnapshot(disk,[a],[],['A'],'2026-11-16T10:00:00Z');assert.equal(ack.events.length,2);assert.deepEqual(ack.pending,['B']);});
test('ultimo controllo remoto non torna indietro con una scheda meno recente',()=>{const previous={events:[],pending:[],lastSync:'2026-11-16T11:00:00Z'};assert.equal(mergeSnapshot(previous,[],[],[],'2026-11-16T10:00:00Z').lastSync,previous.lastSync);});
test('rifiuta registrazioni duplicate incoerenti anche nel salvataggio locale',()=>{const a=event('A');assert.throws(()=>mergeSnapshot({events:[a],pending:['A']},[{...a,quantity:'99'}],['A']));});
