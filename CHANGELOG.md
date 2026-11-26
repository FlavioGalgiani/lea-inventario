# Modifiche

## 1.1.10 — 26.11.2026

Risolto il potenziale blocco all'apertura della maschera «Conta questa variante» introdotto nella 1.1.9: eliminata l'attesa di due requestAnimationFrame, che su alcune sessioni non terminava e lasciava il comando in attesa. La finestra di conteggio viene ora aperta direttamente al primo clic; resta attiva la protezione dai doppi clic. Eventuali errori sono mostrati nella finestra delle varianti anziché dietro al suo sfondo oscurato. Cache offline e file versionati aggiornati.

## 1.1.9 — 26.11.2026

Apertura più rapida dei conteggi: i record e le unità di misura vengono indicizzati e riutilizzati fino al successivo aggiornamento dei dati, evitando il calcolo dell'intero riepilogo per ogni variante. Il pulsante «Conta questa variante» mostra subito «Apertura…» con indicatore di attività, rimane temporaneamente disabilitato e ignora i doppi clic. La stessa protezione vale per i pulsanti di conteggio nell'elenco e per la modifica di un conteggio. Aggiornata la cache offline per gli smartphone.

## 1.1.8 — 26.11.2026

Le schede dei prodotti e delle singole varianti assumono uno sfondo verde appena esiste almeno un conteggio attivo (anche di quantità zero). Per i nuovi conteggi l'unità predefinita è «pz»; quando disponibile viene conservata l'unità già usata. Dopo un conteggio da una famiglia con varianti ancora da contare, resta aperto l'elenco delle varianti e viene aggiornato il loro stato. L'app torna al catalogo quando tutte le varianti sono conteggiate. Aggiornati gli URL versionati e la cache offline.

## 1.1.7 — 18.11.2026

Dopo il salvataggio di un conteggio avviato dalla scelta della variante, l’app chiude entrambe le finestre, torna al catalogo e azzera ricerca e filtri per il prodotto successivo. Le modifiche avviate dalla sezione Conteggi restano invece nella sezione corrente.

## 1.1.6 — 18.11.2026

Semplificato il modulo di conteggio: rimossi dalla compilazione visibile ubicazione, operatore e stato. I nuovi conteggi usano automaticamente l’ubicazione «Magazzino», un identificativo stabile del telefono come operatore e lo stato «Contati».

## 1.1.5 — 18.11.2026

Compattata ulteriormente la schermata smartphone: titolo e statistiche sono nascosti nella vista operativa, testata e barra di sincronizzazione sono più basse, mentre tab, ricerca e filtri usano margini ridotti. Il primo articolo compare molto più in alto senza modificare il layout desktop.

## 1.1.4 — 18.11.2026

Ottimizzata la schermata smartphone: intestazione e spaziature più compatte, statistiche in griglia 2 × 2, schede di navigazione distribuite sulla larghezza e prodotti presentati come schede orizzontali leggibili a una colonna. La visualizzazione desktop resta invariata.

## 1.1.3 — 17.11.2026

Rimossa la ricerca fotografica e il relativo caricamento del modello. Restano disponibili le foto di riferimento del catalogo, la ricerca per nome e codice, i filtri e i conteggi.

## 1.1.2 — 17.11.2026

Corretto il flusso della ricerca fotografica: dopo lo scatto, il catalogo principale mostra esclusivamente le famiglie candidate, ordinate per somiglianza. La finestra di elaborazione si chiude automaticamente e un comando dedicato permette di ripristinare l’intero catalogo. Aggiornati gli URL versionati e la cache offline per distribuire la correzione anche ai dispositivi che avevano già aperto l’app.

## 1.1.0 — 17.11.2026

Aggiunta ricerca da scatto o foto selezionata: CLIP vision quantizzato viene eseguito in un worker nel browser. Propone fino a 8 famiglie ordinate per somiglianza; la scelta apre tutte le varianti della famiglia senza ereditare filtri testuali precedenti. Le dimensioni e il codice restano da confermare.

Preparazione dell’indice dalle foto pubblicate o selezionate localmente, controllo hash delle immagini, interruzione e ripresa, salvataggio separato in IndexedDB ed export/import JSON condivisibile. Libreria e revisione modello fissate; caricamento del modello solo su richiesta. Nessuna API key AI, server dedicato o invio degli scatti a terzi. Aggiornato il service worker per i nuovi moduli.

Le immagini originali non sono ancora disponibili: indice condiviso iniziale vuoto, senza risultati fittizi. 53 test automatici superati e prova in Chrome con il modello reale. Precisione su articoli LEA e tempi sui telefoni da verificare con le foto reali.

## 1.0.2 — 17.11.2026

Rimosso il riquadro Operatore / Zona di lavoro dalla pagina principale. Nome e ubicazione si indicano nel modulo del conteggio e sono ricordati per la registrazione successiva. Le azioni di eliminazione e risoluzione conflitti richiedono il nome solo se non è ancora stato indicato sul dispositivo.

## 1.0.1 — 17.11.2026

Corretto il collegamento a GitHub nel browser: la funzione nativa fetch conserva ora il proprio contesto Window. Prima la chiamata poteva fallire con Illegal invocation prima di inviare la richiesta e veniva mostrato un errore di connessione.

Aggiunto un test di regressione sul contesto di fetch. 42 test automatici superati. Verifica effettuata anche in Chrome con richieste reali a GitHub e credenziali diagnostiche intenzionalmente non valide: risposta HTTP 401 correttamente riconosciuta, anziché errore di connessione.

Versionati gli URL dei moduli modificati e aggiornato il cache del service worker per distribuire la correzione. I dati dei conteggi e la loro configurazione non cambiano.

