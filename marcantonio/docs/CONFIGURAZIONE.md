# Configurazione del servizio online

Oggi la web app funziona **solo nel browser** (dati in localStorage, foto in IndexedDB, accessi
dimostrativi). Questa guida descrive i passi per metterla online, condivisa tra titolare e
collaboratori, con la **lettura automatica delle pesate**.

## Cosa serve

| Servizio | A cosa serve | Costo indicativo |
|---|---|---|
| **Supabase** (supabase.com) | Database condiviso, accessi personali (titolare/collaboratori), archivio foto, funzione di lettura | Piano gratuito per iniziare |
| **Anthropic API** (platform.claude.com) | Lettura dei kg dalle foto del display (modello Claude) | Pochi euro al mese con ~6 foto al giorno (da verificare sul listino al momento dell'attivazione) |
| **Hosting statico** (es. Netlify, Vercel, GitHub Pages) | Indirizzo internet dell'app | Gratuito |

Gli account vanno creati **a nome dell'azienda**. Le chiavi segrete non vanno mai scritte nel
codice né inviate in chat.

## 1. Lettura automatica delle pesate (già pronta)

Il codice è in `supabase/functions/leggi-pesate/index.ts`: riceve fino a 6 foto, chiede a Claude di
leggere il numero del display ("PESO TOTALE") e restituisce i kg per foto. L'app riordina poi le
pesate dalla più pesante alla più leggera e calcola i kg per stalla.

```bash
supabase login
supabase link --project-ref <id-progetto>
supabase secrets set ANTHROPIC_API_KEY=<chiave>
supabase functions deploy leggi-pesate
```

Poi, nella cartella `marcantonio/`, copia `.env.example` in `.env.local` e inserisci URL e chiave
pubblica ("anon") del progetto Supabase. Alla build successiva la schermata **Pesata** legge i numeri
da sola; il collaboratore deve solo controllarli.

## 2. Da fare in fase di configurazione

- **Accessi reali** con Supabase Auth al posto degli utenti dimostrativi (`src/lib/auth.tsx`), con
  ruoli *titolare* e *collaboratore* (il collaboratore vede solo "Pesata").
- **Tabelle del database** per stalle, scarichi, verifiche settimanali, mungiture, mandria, ecc.
  (oggi in `src/lib/store.tsx`), con regole di accesso per ruolo.
- **Archivio foto** (Supabase Storage) al posto di IndexedDB (`src/lib/fotoStore.ts`), così le foto
  sono visibili da tutti i dispositivi; la funzione di lettura va protetta richiedendo l'accesso.
- **Import dei capi per stalla** dai gestionali di mungitura (DeLaval / Lely Horizon) tramite
  esportazione dei report o API ufficiali, se disponibili.
- **Pubblicazione** dell'app su hosting statico.
