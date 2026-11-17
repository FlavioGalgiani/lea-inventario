# Inventario magazzino LEA

Applicazione statica per un inventario una tantum, su GitHub Pages e smartphone. Nessun server dedicato e nessun servizio di database esterno. I dati condivisi sono un CSV privato, aggiornato tramite GitHub Contents API.

## Contenuto e stato

- 8’875 articoli dal file originale, con codici, vecchi codici, misure, caratteristiche, produttori e collegamenti originali. Il file Excel originale non è stato modificato.
- 853 nomi di foto distinti, collegati alle varianti. Un articolo («Piccolo materiale») non ha una foto associata.
- Le foto reali non sono state fornite: aggiungerle a `images/`. La galleria mostra il nome della foto attesa quando il file manca.
- Ricerca AND tra parole, codici e misure, filtri produttore/caratteristiche/stato, galleria fotografica raggruppata e vista elenco.
- Conteggio per articolo e ubicazione, quantità zero distinta da assenza di conteggio, unità obbligatoria, operatore, note e stato da verificare.
- Salvataggio locale prima dell’invio, backup JSON, import con deduplicazione, sincronizzazione ogni 60 secondi mentre la pagina è attiva e invio manuale.
- CSV condiviso con revisioni immutabili, rilevamento conflitti e risoluzione esplicita. Nessuna scelta automatica dell’ultima modifica.
- Riepilogo e dettaglio CSV UTF-8 con BOM e separatore `;`, apribili in Excel. Totali bloccati quando ci sono conflitti o unità diverse. Le quantità da verificare restano provvisorie e sono etichettate.

## Messa online

Aprire `GUIDA.html` per istruzioni illustrate dal testo e distinguere la preparazione del responsabile dall’uso degli operatori.

1. Repository pubblico dell’app: caricare il contenuto di questa cartella mantenendo i percorsi, quindi Settings → Pages → Deploy from a branch → main → / (root).
2. Aggiungere le foto a `images/`. Verificare la corrispondenza con `data/immagini_attese.csv`.
3. Repository privato dei dati: inizializzarlo con README, branch main, nessuna protezione che impedisca gli aggiornamenti autorizzati via Contents API. L’app crea `conteggi.csv` al primo invio con nuove registrazioni.
4. Modificare `config.json` con il nome del repository dati (il campo `repo` è intenzionalmente vuoto), branch, file e nome inventario. Non inserire il token qui.
5. Token fine-grained temporaneo per dispositivo: solo repository privato dei dati, permesso Contents: Read and write, scadenza breve. Inserirlo in Impostazioni sul telefono. Il token viene conservato solo in sessionStorage e non è esportato. Proteggere i dispositivi: chi possiede il token possiede la relativa autorizzazione di scrittura.
6. Convalidare il collegamento e un conteggio di prova su due dispositivi prima dell’uso operativo. Revocare i token alla fine e conservare gli export.

GitHub Pages e i file statici sono pubblici. Il repository privato dei conteggi resta separato: i token non permettono di modificare il codice pubblico dell’app. Non servono account GitHub agli operatori per aprire l’app pubblica; il token inserito sul dispositivo è necessario per leggere e scrivere i dati privati.

L’app va servita da GitHub Pages (HTTPS), non aperta come file locale `file://`. `extract_catalog.py` è uno strumento per rigenerare il catalogo a partire dall’Excel; non serve agli operatori.

## Formato CSV condiviso

Una riga è una revisione di conteggio, non un articolo del riepilogo. `record_id` identifica articolo e ubicazione normalizzata; `parents` contiene gli identificativi delle revisioni sostituite. Una versione con stato `deleted` annulla il conteggio senza perdere lo storico. Due revisioni concorrenti dello stesso articolo/ubicazione rimangono entrambe visibili e sospendono il totale fino a conferma. Le ubicazioni di lavoro devono usare una denominazione concordata: nomi differenti sono ubicazioni differenti.

Il formato protegge i campi testuali da formule CSV. Non correggere direttamente le righe con Excel: usare l’app. Per un elenco leggibile usare gli export della sezione Riepilogo.

## Verifiche

`npm test` esegue i test del motore dati, della ricerca e della sincronizzazione con GitHub simulato. Nessuna dipendenza da installare. `npm run check` verifica la sintassi. Il rapporto di consegna indica quali verifiche sono state effettuate e quali dipendono dalle foto e dal repository reali.

In rete assente i conteggi restano nel browser finché non vengono sincronizzati. Non cancellare lo spazio del sito. Una copia JSON permette il recupero su un altro dispositivo. È consigliata una sola scheda operativa per telefono. Il service worker consente di riaprire il catalogo già caricato e le immagini già visitate, nei limiti dello spazio e della persistenza consentiti dal browser.

Riferimenti tecnici: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages · https://docs.github.com/en/rest/repos/contents · https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens · https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
