# Modifiche

## 1.0.1 — 17.11.2026

Corretto il collegamento a GitHub nel browser: la funzione nativa fetch conserva ora il proprio contesto Window. Prima la chiamata poteva fallire con Illegal invocation prima di inviare la richiesta e veniva mostrato un errore di connessione.

Aggiunto un test di regressione sul contesto di fetch. 42 test automatici superati. Verifica effettuata anche in Chrome con richieste reali a GitHub e credenziali diagnostiche intenzionalmente non valide: risposta HTTP 401 correttamente riconosciuta, anziché errore di connessione.

Versionati gli URL dei moduli modificati e aggiornato il cache del service worker per distribuire la correzione. I dati dei conteggi e la loro configurazione non cambiano.
