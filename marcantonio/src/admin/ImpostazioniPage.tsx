import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHeader, conferma } from '../components/ui'
import { DATI_VUOTI, datiDimostrativi } from '../lib/seed'
import { isoGiorno } from '../lib/format'
import type { Dati } from '../lib/types'

export default function ImpostazioniPage() {
  const { dati, sostituisciTutto } = useStore()
  const file = useRef<HTMLInputElement>(null)
  const [esito, setEsito] = useState('')

  const esporta = () => {
    const blob = new Blob([JSON.stringify(dati, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `marcantonio-backup-${isoGiorno()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importa = async (f: File) => {
    try {
      const d = JSON.parse(await f.text()) as Partial<Dati>
      const chiavi: (keyof Dati)[] = ['capi', 'mungiture', 'analisi', 'consegne', 'lavorazioni', 'uscite', 'stalle', 'scarichi', 'verifiche', 'importDC', 'mandriaDC', 'nomiGruppi', 'robotGiorni', 'robotVacche', 'importRobot', 'messaggi']
      if (!chiavi.some((k) => Array.isArray(d[k]))) throw new Error('formato non riconosciuto')
      if (!conferma('Sostituire tutti i dati attuali con quelli del backup?')) return
      sostituisciTutto({ ...DATI_VUOTI, ...d } as Dati)
      setEsito('✓ Backup ripristinato.')
    } catch (e) {
      setEsito(`✕ Impossibile leggere il file: ${(e as Error).message}`)
    }
  }

  const conteggio = `${dati.capi.length} capi, ${dati.mungiture.length} mungiture, ${dati.analisi.length} analisi, ${dati.consegne.length} consegne, ${dati.lavorazioni.length} lotti di caseificio, ${dati.uscite.length} uscite di forme, ${dati.scarichi.length} scarichi di razione, ${dati.messaggi.length} messaggi`

  return (
    <>
      <PageHeader titolo="Dati e backup" />
      <div className="grid max-w-3xl gap-6">
        <section className="card">
          <h2 className="font-semibold">Dove sono salvati i dati</h2>
          <p className="mt-2 text-sm text-stone-600">
            In questa versione i dati restano <b>solo in questo browser</b> (localStorage): non sono condivisi tra dispositivi
            e si perdono se si cancellano i dati di navigazione. Esegui backup regolari.
          </p>
          <p className="mt-2 text-sm text-stone-500">Attualmente: {conteggio}.</p>
        </section>
        <section className="card">
          <h2 className="font-semibold">Backup</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={esporta}>Scarica backup (JSON)</button>
            <button className="btn-secondary" onClick={() => file.current?.click()}>Ripristina da file…</button>
            <input ref={file} type="file" accept="application/json,.json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importa(f); e.target.value = '' }} />
          </div>
          {esito && <p className="mt-3 text-sm">{esito}</p>}
        </section>
        <section className="card border-red-200">
          <h2 className="font-semibold text-red-700">Zona pericolosa</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn-secondary" onClick={() => conferma('Sostituire tutti i dati con i dati dimostrativi?') && sostituisciTutto(datiDimostrativi())}>Ricarica dati dimostrativi</button>
            <button className="btn-secondary text-red-700" onClick={() => conferma('Cancellare TUTTI i dati? L\'operazione non è reversibile.') && sostituisciTutto(DATI_VUOTI)}>Cancella tutti i dati</button>
          </div>
        </section>
      </div>
    </>
  )
}
