import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { Modale } from './ui'
import { CAMPI, abbinaColonne, costruisciAnimali, leggiFile, perGruppo, type Campo, type FileLetto } from '../lib/dairycomp'
import { fmt0, fmt1, isoGiorno, nuovoId } from '../lib/format'
import { applicaGruppiRobot } from '../lib/gruppi'

const MAX_IMPORT = 120 // fotografie conservate nel browser (con il servizio online: nessun limite)

/**
 * destinazione 'latte': si importano i gruppi delle stalle (vacche in lattazione) per la sezione Latte.
 * destinazione 'mandria': si importa tutta la lista (tutti i gruppi) per la sezione Mandria e,
 * se richiesto, si aggiorna anche la sezione Latte con i soli gruppi delle stalle.
 */
export default function ImportDairyComp({ onChiudi, onImportato, destinazione = 'latte' }: { onChiudi: () => void; onImportato: (id: string) => void; destinazione?: 'latte' | 'mandria' }) {
  const { dati, aggiungi, aggiorna, elimina, imposta } = useStore()
  const perMandria = destinazione === 'mandria'
  const aggiornaLatte = true // la sezione Latte si aggiorna sempre dalla lista Mandria
  const [file, setFile] = useState<FileLetto | null>(null)
  const [nomeFile, setNomeFile] = useState('')
  const [abbinamento, setAbbinamento] = useState<Partial<Record<Campo, number>>>({})
  const [data, setData] = useState(isoGiorno())
  const [aggiornaStalle, setAggiornaStalle] = useState(true)
  const [esclusi, setEsclusi] = useState<Set<string> | null>(null) // gruppi da non importare (null = proposta automatica)
  const [errore, setErrore] = useState('')

  const carica = (testo: string, nome: string) => {
    setErrore('')
    const f = leggiFile(testo)
    if (f.intestazioni.length < 2 || f.righe.length === 0) {
      setErrore('Non riesco a leggere il file: servono una riga di intestazione e almeno una riga di dati.')
      return
    }
    setFile(f)
    setNomeFile(nome)
    setAbbinamento(abbinaColonne(f.intestazioni))
  }

  const animali = useMemo(() => (file ? costruisciAnimali(file, abbinamento) : []), [file, abbinamento])
  const gruppi = perGruppo(animali)
  // Proposta: solo i gruppi collegati alle stalle (es. 1, 21, 4); se nessuno corrisponde, tutti
  const gruppiStalle = new Set(dati.stalle.map((st) => st.gruppoDairyComp).filter((g): g is number => g !== undefined))
  const proposti = gruppi.some(([g]) => g !== null && gruppiStalle.has(g))
    ? new Set(gruppi.filter(([g]) => !(g !== null && gruppiStalle.has(g))).map(([g]) => String(g)))
    : new Set<string>()
  const fuori = esclusi ?? (perMandria ? new Set<string>() : proposti)
  const daImportare = animali.filter((a) => !fuori.has(String(a.gruppo)))
  const scambia = (g: number | null) => {
    const n = new Set(fuori)
    if (n.has(String(g))) n.delete(String(g)); else n.add(String(g))
    setEsclusi(n)
  }
  const stallePerGruppo = new Map(dati.stalle.filter((s) => s.gruppoDairyComp !== undefined).map((s) => [s.gruppoDairyComp!, s]))
  const esistente = perMandria ? undefined : dati.importDC.find((i) => i.data === data)

  const conferma = () => {
    if (abbinamento.id === undefined) { setErrore('Indica quale colonna contiene il numero della vacca.'); return }
    if (!daImportare.length) { setErrore('Nessuna vacca da importare: seleziona almeno un gruppo.'); return }
    if (perMandria) {
      const id = nuovoId()
      imposta('mandriaDC', [{ id, data, importatoIl: new Date().toISOString(), nomeFile, animali: daImportare }])
      if (aggiornaLatte) salvaPerLatte(animali.filter((a) => a.gruppo !== null && gruppiStalle.has(a.gruppo)))
      onImportato(id)
      return
    }
    onImportato(salvaPerLatte(daImportare))
  }

  /** Salva una fotografia per la sezione Latte e aggiorna i capi delle stalle. Restituisce l'id. */
  const salvaPerLatte = (daImportare: typeof animali) => {
    const esistente = dati.importDC.find((i) => i.data === data)
    if (esistente) elimina('importDC', esistente.id)
    // al primo file vero, i dati di esempio non servono più
    const esempi = dati.importDC.filter((i) => i.nomeFile.endsWith('(esempio)') && i.id !== esistente?.id)
    esempi.forEach((i) => elimina('importDC', i.id))
    const id = nuovoId()
    aggiungi('importDC', { id, data, importatoIl: new Date().toISOString(), nomeFile, animali: daImportare })
    // conserva solo le fotografie più recenti
    const vecchie = [...dati.importDC].filter((i) => i.id !== esistente?.id && !esempi.includes(i)).sort((a, b) => b.data.localeCompare(a.data)).slice(MAX_IMPORT - 1)
    vecchie.forEach((i) => elimina('importDC', i.id))
    // capi per stalla dal gruppo corrispondente (solo se è il dato più recente)
    const piuRecente = !dati.importDC.some((i) => i.data > data && !esempi.includes(i))
    // capi per stalla contati con il gruppo effettivo (quello del robot che munge la vacca)
    const effettivi = applicaGruppiRobot(daImportare, dati.robotVacche, dati.robotGiorni, dati.stalle, data).animali
    if (aggiornaStalle && piuRecente) {
      for (const s of dati.stalle) {
        if (s.gruppoDairyComp === undefined) continue
        const capi = effettivi.filter((a) => a.gruppo === s.gruppoDairyComp).length
        if (capi !== s.capi) aggiorna('stalle', { ...s, capi })
      }
    }
    return id
  }

  return (
    <Modale titolo="Importa da DairyComp" onChiudi={onChiudi}>
      {!file ? (
        <div className="space-y-4 text-sm">
          <p className="text-stone-600">
            In DairyComp crea una lista con le colonne che ti interessano (ad esempio <b>ID PEN LACT DIM MILK</b> e, se vuoi,
            grasso, proteine, cellule, RC, DCC…) e salvala come file CSV o di testo. Poi caricala qui.
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 p-6 text-center hover:bg-brand-50">
            <span className="font-semibold text-brand-800">Scegli il file esportato</span>
            <span className="text-xs text-stone-500">.csv, .txt o .prn</span>
            <input type="file" accept=".csv,.txt,.prn,.tsv,text/plain,text/csv" className="hidden"
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) carica(await f.text(), f.name); e.target.value = '' }} />
          </label>
          <details className="text-stone-600">
            <summary className="cursor-pointer text-brand-700">…oppure incolla il testo della lista</summary>
            <textarea className="input mt-2 h-32 font-mono text-xs" placeholder={'ID   PEN  LACT  DIM  MILK\n1107   1     3    45  41.2'}
              onBlur={(e) => e.target.value.trim() && carica(e.target.value, 'testo incollato')} />
          </details>
          {errore && <p className="text-red-700">✕ {errore}</p>}
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <p className="text-stone-600"><b className="break-all">{nomeFile}</b>: {file.righe.length} righe, {animali.length} vacche, {gruppi.length} gruppi.</p>

          <div>
            <h3 className="mb-2 font-semibold">Colonne riconosciute</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {CAMPI.map((c) => (
                <label key={c.campo} className="block">
                  <span className="mb-0.5 block text-xs text-stone-600">{c.etichetta}</span>
                  <select className="input py-1.5" value={abbinamento[c.campo] ?? ''}
                    onChange={(e) => setAbbinamento({ ...abbinamento, [c.campo]: e.target.value === '' ? undefined : Number(e.target.value) })}>
                    <option value="">— non presente —</option>
                    {file.intestazioni.map((h, i) => <option key={i} value={i}>{h || `colonna ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-500">Le altre colonne numeriche vengono comunque importate e riassunte per gruppo.</p>
          </div>

          <div>
            <h3 className="mb-1 font-semibold">Gruppi da importare</h3>
            <p className="mb-2 text-xs text-stone-500">{perMandria ? 'Tutti i gruppi sono selezionati.' : 'Selezionati i gruppi collegati alle stalle.'} Tocca un gruppo per includerlo o escluderlo.</p>
            <ul className="flex flex-wrap gap-2">
              {gruppi.map(([g, a]) => {
                const incluso = !fuori.has(String(g))
                return (
                  <li key={String(g)}>
                    <button type="button" onClick={() => scambia(g)}
                      className={`rounded-full px-3 py-1 text-xs ring-1 ring-inset ${incluso ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-stone-500 ring-stone-200 line-through'}`}>
                      {incluso ? '✓ ' : ''}Gruppo {g ?? '—'}{g !== null && stallePerGruppo.has(g) && <b> · Stalla {stallePerGruppo.get(g)!.numero}</b>}: {a.length}
                      {a.some((x) => x.latte !== null) && <>, {fmt1(a.reduce((s, x) => s + (x.latte ?? 0), 0) / Math.max(1, a.filter((x) => x.latte !== null).length))} kg/capo</>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="label">Data dei dati</span><input className="input" type="date" max={isoGiorno()} value={data} onChange={(e) => setData(e.target.value)} /></label>
            {perMandria
              ? <p className="self-end pb-2 text-sm text-stone-600">Aggiorna anche la sezione Latte (gruppi {[...gruppiStalle].join(', ')}).</p>
              : <label className="flex items-center gap-2 self-end pb-2"><input type="checkbox" checked={aggiornaStalle} onChange={(e) => setAggiornaStalle(e.target.checked)} /> Aggiorna i capi delle stalle</label>}
          </div>
          {esistente && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">! Esistono già dati del {data}: verranno sostituiti.</p>}
          {errore && <p className="text-red-700">✕ {errore}</p>}

          <div className="flex justify-between gap-2">
            <button className="btn-secondary" onClick={() => setFile(null)}>Cambia file</button>
            <button className="btn-primary" onClick={conferma}>Importa {fmt0(daImportare.length)} capi</button>
          </div>
        </div>
      )}
    </Modale>
  )
}
