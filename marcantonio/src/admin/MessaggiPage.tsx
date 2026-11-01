import { useState } from 'react'
import { useStore } from '../lib/store'
import { PageHeader, Vuoto, conferma } from '../components/ui'
import { fmtDataOra } from '../lib/format'

export default function MessaggiPage() {
  const { dati, aggiorna, elimina } = useStore()
  const [aperto, setAperto] = useState<string | null>(null)
  const elenco = [...dati.messaggi].sort((a, b) => b.data.localeCompare(a.data))

  return (
    <>
      <PageHeader titolo="Messaggi" descrizione="Richieste ricevute dal modulo contatti del sito" />
      {elenco.length === 0 ? <Vuoto>Nessun messaggio.</Vuoto> : (
        <ul className="space-y-3">
          {elenco.map((m) => (
            <li key={m.id} className={`card p-0 ${m.letto ? '' : 'ring-2 ring-brand-200'}`}>
              <button className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left"
                onClick={() => { setAperto(aperto === m.id ? null : m.id); if (!m.letto) aggiorna('messaggi', { ...m, letto: true }) }}>
                <span>
                  {!m.letto && <span className="mr-2 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Nuovo</span>}
                  <span className="font-semibold">{m.nome}</span> <span className="text-stone-500">· {m.oggetto}</span>
                </span>
                <span className="text-xs text-stone-500">{fmtDataOra(m.data)}</span>
              </button>
              {aperto === m.id && (
                <div className="border-t border-stone-100 p-4 text-sm">
                  <p className="whitespace-pre-wrap">{m.testo}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <a className="btn-primary" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.oggetto)}`}>Rispondi via email</a>
                    <span className="text-stone-500">{m.email}{m.telefono && ` · ${m.telefono}`}</span>
                    <button className="btn-link" onClick={() => aggiorna('messaggi', { ...m, letto: false })}>Segna come non letto</button>
                    <button className="btn-danger-link ml-auto" onClick={() => conferma('Eliminare il messaggio?') && elimina('messaggi', m.id)}>Elimina</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
