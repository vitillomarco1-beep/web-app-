# Fratelli Marcantonio – Web app

Web app dei Fratelli Marcantonio (dal 1900 il caciocavallo di Castelfranco in Miscano): allevamento di bovine da latte e produzione di caciocavallo. Composta da:

- **Sito pubblico**: Home, L'azienda (allevamento e qualità), Prodotti, Contatti (con modulo).
- **Area riservata** (gestionale), su `#/area-riservata`:
  - **Cruscotto**: produzione dell'ultimo giorno, media 7 giorni, resa per capo, consegne, grafico degli ultimi 30 giorni, qualità del latte, parti previsti
  - **Mandria**: anagrafica dei capi (matricola, razza, stato produttivo, parti, giorni di lattazione)
  - **Produzione**: registro delle mungiture (mattina/sera), riepilogo mensile, export CSV
  - **Qualità latte**: analisi (grasso, proteine, lattosio, cellule somatiche, carica batterica, inibenti) e verifica dei requisiti del Reg. (CE) 853/2004 (medie geometriche mobili: CBT ≤ 100.000/ml su 2 mesi, cellule somatiche ≤ 400.000/ml su 3 mesi)
  - **Caseificio**: lavorazioni di caciocavallo come lotti (codice CC-AAAAMMGG-n, litri di latte,
    forme, peso fresco, resa kg/100 l, stagionatura minima); magazzino con avanzamento della
    stagionatura e forme disponibili; uscite (vendite €/kg, omaggi, scarti) con calo peso;
    scheda lotto per la tracciabilità (mungiture del giorno, analisi del latte di riferimento,
    clienti a cui sono andate le forme)
  - **Consegne latte**: latte conferito a terzi, DDT, prezzo €/l, ricavi per mese e per acquirente
  - **Messaggi**: richieste arrivate dal modulo contatti
  - **Dati e backup**: export/import JSON, ripristino dei dati dimostrativi

## Avvio

```bash
cd marcantonio
npm install
npm run dev      # sviluppo
npm run build    # build di produzione in dist/ (sito statico, ospitabile ovunque)
```

Accesso demo all'area riservata: utente `admin`, password `marcantonio`.

## Da sapere prima della messa in produzione

1. **Testi e dati aziendali**: indirizzo, telefono, email, P.IVA, prodotti e testi sono in
   `src/config/azienda.ts`. I campi "DA COMPLETARE" sono segnaposto.
2. **Login solo dimostrativo**: le credenziali sono nel codice che gira nel browser, quindi
   non proteggono davvero. Per l'uso reale serve un backend con autenticazione
   (es. Supabase o Firebase).
3. **Dati locali**: i dati del gestionale e i messaggi del modulo contatti vengono salvati nel
   `localStorage` del browser. Non sono condivisi tra dispositivi e i messaggi inviati dai
   visitatori non arrivano all'azienda. Con un backend, il modulo contatti dovrà scrivere sul
   database oppure inviare un'email.
4. Al primo avvio vengono caricati **dati dimostrativi**. Si cancellano da "Dati e backup".

## Struttura

```
src/
  config/azienda.ts   dati anagrafici, prodotti, testi
  lib/                tipi, store (localStorage), auth, calcoli qualità/statistiche, dati demo
  components/         UI condivisa, grafico a barre, logo
  public/             pagine del sito pubblico
  admin/              pagine del gestionale
```

## Marchio

- Logo: `src/assets/logo-marcantonio.png` (ricavato dal logo ufficiale, sfondo trasparente);
  favicon con la corona in `public/`.
- Colori (in `tailwind.config.js`): prugna `brand` (#613846) e arancio `arancio` (#F7941D).
  L'arancio si usa per accenti e su fondi scuri, non per testo piccolo su bianco (contrasto insufficiente).
