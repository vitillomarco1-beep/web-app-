import { useState } from 'react'
import { Cloud, CloudOff, CloudUpload, Loader2, RefreshCw } from 'lucide-react'
import { useStore } from '../lib/store'

/** Piccola etichetta con lo stato dell'archivio condiviso tra dispositivi. */
export function EtichettaArchivio() {
  const { sync } = useStore()
  const info = {
    locale: { t: 'Solo su questo dispositivo', c: 'text-stone-400', I: CloudOff },
    connessione: { t: 'Collegamento…', c: 'text-stone-400', I: Loader2 },
    vuoto: { t: 'Archivio da attivare', c: 'text-arancio-600', I: CloudUpload },
    sincronizzato: { t: 'Dati condivisi', c: 'text-emerald-600', I: Cloud },
    salvataggio: { t: 'Salvataggio…', c: 'text-stone-500', I: RefreshCw },
    errore: { t: 'Senza rete: invio appena possibile', c: 'text-red-600', I: CloudOff },
  }[sync]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${info.c}`} title="Stato dell'archivio condiviso tra PC e telefono">
      <info.I className={`h-3.5 w-3.5 ${sync === 'connessione' || sync === 'salvataggio' ? 'animate-spin' : ''}`} />{info.t}
    </span>
  )
}

/** Riquadro mostrato finché l'archivio condiviso è vuoto: si caricano i dati del dispositivo che li possiede. */
export function AttivaArchivio() {
  const { sync, dati, caricaNelCloud } = useStore()
  const [conferma, setConferma] = useState(false)
  if (sync !== 'vuoto' && !(sync === 'salvataggio' && conferma)) return null
  const giorni = new Set(dati.robotGiorni.map((g) => g.data)).size
  const voci = [
    [dati.mandriaDC.length, 'vacche in mandria'],
    [giorni, 'giorni di dati robot'],
    [dati.scarichi.length, 'pesate del carro'],
    [dati.casi.length, 'casi di salute'],
    [dati.farmaci.length, 'farmaci'],
  ].filter(([n]) => (n as number) > 0)
  return (
    <div className="card mb-6 border-arancio-300 bg-arancio-50/60">
      <div className="flex items-start gap-3">
        <CloudUpload className="mt-0.5 h-6 w-6 shrink-0 text-arancio-600" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg">Condividi i dati tra PC e telefono</h2>
          <p className="mt-1 text-sm text-stone-600">
            L'archivio condiviso è ancora vuoto. Fai questo passaggio <strong>una sola volta, dal dispositivo dove hai caricato i dati</strong> (di solito il PC):
            da quel momento potrai caricare e modificare i dati sia dal telefono sia dal PC, e ogni modifica comparirà anche sull’altro.
          </p>
          <p className="mt-2 text-sm text-stone-600">
            Su questo dispositivo: {voci.length ? voci.map(([n, t]) => `${n} ${t}`).join(' · ') : 'nessun dato caricato'}.
          </p>
          {!conferma ? (
            <button className="btn-primary mt-3" onClick={() => setConferma(true)}>Carica i dati di questo dispositivo</button>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-stone-700">Sono questi i dati giusti da condividere?</span>
              <button className="btn-primary" disabled={sync === 'salvataggio'} onClick={() => caricaNelCloud()}>
                {sync === 'salvataggio' ? 'Caricamento…' : 'Sì, carica'}
              </button>
              <button className="btn-secondary" onClick={() => setConferma(false)}>Annulla</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
