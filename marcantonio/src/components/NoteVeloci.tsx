import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Mic, NotebookPen, Trash2, Undo2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { CATEGORIE_NOTE, ALTRO, casoDaNota, categoriaNota, infoCategoria, vaccaNota } from '../lib/note'
import { nomePatologia } from '../lib/salute'
import { isoGiorno } from '../lib/format'
import { nuovoId } from '../lib/format'

const quando = (iso: string) => {
  const d = new Date(iso)
  const oggi = new Date()
  const stessoGiorno = d.toDateString() === oggi.toDateString()
  return stessoGiorno ? `oggi ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Note veloci dal cruscotto: si dettano con il microfono della tastiera, poi si riportano nella sezione giusta. */
export default function NoteVeloci() {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const [testo, setTesto] = useState('')
  const [vediFatte, setVediFatte] = useState(false)
  const aperte = [...dati.note].filter((n) => !n.fatta).sort((a, b) => b.creataIl.localeCompare(a.creataIl))
  const fatte = [...dati.note].filter((n) => n.fatta).sort((a, b) => (b.fattaIl ?? '').localeCompare(a.fattaIl ?? '')).slice(0, 20)
  // animali presenti: lista Mandria, robot, vitelli e lista parti
  const presenti = useMemo(() => new Set([
    ...(dati.mandriaDC[0]?.animali ?? []).map((a) => a.id),
    ...(dati.vitelliDC[0]?.animali ?? []).map((a) => a.id),
    ...(dati.partiDC[0]?.animali ?? []).map((a) => a.id),
    ...dati.robotVacche.map((v) => v.vacca),
  ]), [dati.mandriaDC, dati.vitelliDC, dati.partiDC, dati.robotVacche])
  const conosciuta = (v?: string) => !!v && (presenti.size === 0 || presenti.has(v))
  const anteprima = testo.trim() ? { cat: categoriaNota(testo), vacca: vaccaNota(testo, presenti) } : null

  const [esito, setEsito] = useState<{ testo: string; notaId: string; casoId?: string } | null>(null)

  const salva = () => {
    const t = testo.trim()
    if (!t) return
    const cat = categoriaNota(t).id
    const vacca = vaccaNota(t, presenti)
    const notaId = nuovoId()
    const ora = new Date().toISOString()
    // salute + numero della vacca: il caso va subito nella sezione Salute
    if (cat === 'salute' && vacca && conosciuta(vacca)) {
      const caso = { ...casoDaNota(t, vacca, isoGiorno(), dati.farmaci), id: nuovoId() }
      aggiungi('casi', caso)
      for (const u of caso.farmaci ?? []) {
        const f = dati.farmaci.find((x) => x.id === u.farmacoId)
        if (f) aggiorna('farmaci', { ...f, giacenza: Math.round((f.giacenza - u.quantita) * 1000) / 1000 })
      }
      aggiungi('note', { id: notaId, testo: t, creataIl: ora, categoria: cat, vacca, fatta: true, fattaIl: ora, casoId: caso.id })
      const farm = (caso.farmaci ?? []).map((u) => `${u.quantita} ${dati.farmaci.find((f) => f.id === u.farmacoId)?.nome}`).join(', ')
      setEsito({ testo: `✓ Inserita in Salute: vacca ${vacca}, ${nomePatologia(caso.patologia).toLowerCase()}${caso.quarti?.length ? ` (${caso.quarti.join(', ')})` : ''}${farm ? ` · farmaci: ${farm} (scaricati dal magazzino)` : ''}`, notaId, casoId: caso.id })
    } else {
      aggiungi('note', { id: notaId, testo: t, creataIl: ora, categoria: cat, ...(vacca ? { vacca } : {}) })
      setEsito(cat === 'salute'
        ? { testo: vacca ? `Nota salvata: la vacca ${vacca} non risulta nella mandria, quindi resta qui sotto da controllare.` : 'Nota salvata: manca il numero della vacca, quindi resta qui sotto da inserire.', notaId }
        : null)
    }
    setTesto('')
  }

  /** Annulla l'ultimo inserimento automatico: toglie il caso, restituisce i farmaci, elimina la nota. */
  const annulla = () => {
    if (!esito) return
    const caso = esito.casoId ? dati.casi.find((c) => c.id === esito.casoId) : undefined
    if (caso) {
      for (const u of caso.farmaci ?? []) {
        const f = dati.farmaci.find((x) => x.id === u.farmacoId)
        if (f) aggiorna('farmaci', { ...f, giacenza: Math.round((f.giacenza + u.quantita) * 1000) / 1000 })
      }
      elimina('casi', caso.id)
    }
    elimina('note', esito.notaId)
    setEsito(null)
  }

  return (
    <section className="card mb-6">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-5 w-5 text-brand-700" />
        <h2>Note veloci</h2>
        {aperte.length > 0 && <span className="rounded-full bg-arancio-400 px-2 py-0.5 text-[11px] font-semibold text-brand-900">{aperte.length} da inserire</span>}
      </div>
      <p className="mt-0.5 text-xs text-stone-500"><Mic className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />Tocca la casella e usa il <b>microfono della tastiera</b> per dettare. Il numero si può dire anche a pezzi ("nove sette zero", "nove settanta"). Le note di salute con il numero della vacca vanno <b>subito</b> in Salute (es. "vacca 970 zoppa", "vacca 1072 mastite posteriore sinistro, trattata con 1 tubetto di …"); le altre restano qui.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <textarea className="input min-h-[64px] flex-1" placeholder="Detta o scrivi una nota…" value={testo} onChange={(e) => setTesto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) salva() }} />
        <button className="btn-primary sm:self-stretch" onClick={salva} disabled={!testo.trim()}>Salva nota</button>
      </div>
      {anteprima && (
        <p className="mt-1.5 text-xs text-stone-500">
          {anteprima.cat.id === 'salute' && anteprima.vacca && conosciuta(anteprima.vacca)
            ? <>Verrà inserita subito in <b>Salute</b>: vacca <b>{anteprima.vacca}</b>, <b>{nomePatologia(casoDaNota(testo, anteprima.vacca, '', []).patologia).toLowerCase()}</b></>
            : <>Resterà qui come nota per <b>{anteprima.cat.nome}</b>{anteprima.vacca && <> · vacca <b>{anteprima.vacca}</b>{!conosciuta(anteprima.vacca) && <span className="text-rose-700"> (non trovata in mandria)</span>}</>}</>}
        </p>
      )}
      {esito && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <span className="min-w-0 flex-1">{esito.testo}</span>
          {esito.casoId && <Link to="/area-riservata/salute" className="font-semibold underline">Apri</Link>}
          <button className="font-semibold text-stone-600 underline" onClick={annulla}>Annulla</button>
        </div>
      )}

      {aperte.length > 0 && (
        <ul className="mt-4 divide-y divide-stone-100">
          {aperte.map((n) => {
            const c = infoCategoria(n.categoria)
            return (
              <li key={n.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <select className="rounded-full border border-stone-200 bg-brand-50 px-2 py-0.5 font-semibold text-brand-800" value={n.categoria} aria-label="Sezione"
                      onChange={(e) => aggiorna('note', { ...n, categoria: e.target.value })}>
                      {[...CATEGORIE_NOTE, ALTRO].map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </select>
                    {n.vacca && <span className="font-semibold text-stone-700">Vacca {n.vacca}</span>}
                    <span className="text-stone-400">{quando(n.creataIl)}</span>
                  </div>
                  <p className="mt-1 text-sm text-stone-800">{n.testo}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c.id !== 'altro' && <Link to={c.link} className="btn-secondary px-3 py-1.5 text-xs">Vai a {c.nome}<ChevronRight className="h-3.5 w-3.5" /></Link>}
                  <button className="btn-secondary px-3 py-1.5 text-xs text-emerald-700" onClick={() => aggiorna('note', { ...n, fatta: true, fattaIl: new Date().toISOString() })}><Check className="h-3.5 w-3.5" />Inserita</button>
                  <button className="text-stone-300 hover:text-rose-600" aria-label="Elimina nota" onClick={() => elimina('note', n.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {fatte.length > 0 && (
        <div className="mt-2">
          <button className="text-xs text-stone-500 hover:underline" onClick={() => setVediFatte((v) => !v)}>{vediFatte ? 'Nascondi' : 'Mostra'} le note già inserite ({fatte.length})</button>
          {vediFatte && (
            <ul className="mt-1 space-y-1">
              {fatte.map((n) => (
                <li key={n.id} className="flex items-center gap-2 text-xs text-stone-400">
                  <span className="min-w-0 flex-1 truncate line-through">{n.testo}</span>
                  <button className="hover:text-brand-700" aria-label="Rimetti da inserire" onClick={() => aggiorna('note', { ...n, fatta: false, fattaIl: undefined })}><Undo2 className="h-3.5 w-3.5" /></button>
                  <button className="hover:text-rose-600" aria-label="Elimina" onClick={() => elimina('note', n.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
