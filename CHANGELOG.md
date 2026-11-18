# Modifiche

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

