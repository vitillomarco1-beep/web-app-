import { useState, type FormEvent } from 'react'
import { Loader2, Paperclip, Pencil, Trash2, Upload } from 'lucide-react'
import { allegaFile, leggiReferto } from '../lib/leggiAnalisi'
import { useStore } from '../lib/store'
import type { AnalisiPmr } from '../lib/types'
import { Campo, Modale } from './ui'
import { VALORI_PMR } from '../lib/pmr'
import { fmt1, fmt2, fmtData, isoGiorno, nuovoId } from '../lib/format'

type Testi = Record<string, string>
const num = (s: string) => { const n = Number(s.replace(',', '.')); return s.trim() && Number.isFinite(n) ? n : undefined }
const testo = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','))

/** Inserimento e storico delle analisi del PMR. */
export default function AnalisiPmrModale({ onChiudi }: { onChiudi: () => void }) {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const stalle = [...dati.stalle].sort((a, b) => a.numero - b.numero)
  const vuoto = () => ({ id: '', data: isoGiorno(), stalla: '', laboratorio: '', note: '', valori: {} as Testi })
  const [f, setF] = useState(vuoto)
  const [errore, setErrore] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [lettura, setLettura] = useState<'no' | 'in corso' | 'ok' | string>('no')
  const [salvando, setSalvando] = useState(false)

  const caricaFile = async (fl: File) => {
    setFile(fl); setLettura('in corso'); setErrore('')
    const r = await leggiReferto(fl)
    if ('errore' in r) { setLettura(r.errore); return }
    const v = r.valori
    setF((x) => ({
      ...x,
      data: typeof v.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.data) ? v.data : x.data,
      laboratorio: v.laboratorio || x.laboratorio,
      valori: { ...x.valori, ...Object.fromEntries(VALORI_PMR.map((c) => [c.k, (v as Record<string, unknown>)[c.k]]).filter(([, n]) => typeof n === 'number').map(([k, n]) => [k, String(Math.round((n as number) * 100) / 100).replace('.', ',')])) },
    }))
    setLettura('ok')
  }
  const storico = [...dati.analisiPmr].sort((a, b) => b.data.localeCompare(a.data))

  const modifica = (a: AnalisiPmr) => setF({
    id: a.id, data: a.data, stalla: a.stalla === undefined ? '' : String(a.stalla), laboratorio: a.laboratorio ?? '', note: a.note ?? '',
    valori: Object.fromEntries(VALORI_PMR.map((v) => [v.k, testo(a[v.k] as number | undefined)])),
  })

  const salva = async (e: FormEvent) => {
    e.preventDefault()
    if (salvando) return
    const ss = num(f.valori.ss ?? '')
    if (ss === undefined || ss <= 0 || ss > 100) { setErrore('Inserisci la sostanza secca in % (es. 45,2).'); return }
    const a: AnalisiPmr = {
      id: f.id || nuovoId(), data: f.data, ss,
      ...(f.stalla ? { stalla: Number(f.stalla) } : {}),
      ...Object.fromEntries(VALORI_PMR.filter((v) => v.k !== 'ss').map((v) => [v.k, num(f.valori[v.k] ?? '')]).filter(([, n]) => n !== undefined)),
      ...(f.laboratorio.trim() ? { laboratorio: f.laboratorio.trim() } : {}),
      ...(f.note.trim() ? { note: f.note.trim() } : {}),
    }
    const precedente = f.id ? dati.analisiPmr.find((x) => x.id === f.id)?.allegato : undefined
    let allegato = precedente
    if (file) { setSalvando(true); allegato = (await allegaFile(file)) ?? precedente; setSalvando(false) }
    if (allegato) a.allegato = allegato
    if (f.id) aggiorna('analisiPmr', a); else aggiungi('analisiPmr', a)
    setF(vuoto()); setErrore(''); setFile(null); setLettura('no')
  }

  return (
    <Modale titolo="Analisi del PMR" onChiudi={onChiudi}>
      <form className="space-y-4" onSubmit={salva}>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-4 hover:border-brand-400">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-brand-100">
            {lettura === 'in corso' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          </span>
          <span className="min-w-0 text-sm">
            <span className="block font-semibold text-brand-900">{file ? file.name : 'Carica il file del laboratorio'}</span>
            <span className="block text-xs text-stone-500">
              {lettura === 'in corso' ? 'Sto leggendo il referto…' : lettura === 'ok' ? 'Valori inseriti qui sotto: controllali prima di salvare.' : lettura !== 'no' ? lettura : 'PDF o foto del referto: leggo i valori e li inserisco io'}
            </span>
          </span>
          <input type="file" accept="application/pdf,.pdf,image/*" className="hidden" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) void caricaFile(fl); e.target.value = '' }} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Data del prelievo"><input type="date" className="input" required value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></Campo>
          <Campo label="Stalla">
            <select className="input" value={f.stalla} onChange={(e) => setF({ ...f, stalla: e.target.value })}>
              <option value="">Tutte (stesso PMR)</option>
              {stalle.map((s) => <option key={s.id} value={s.numero}>Stalla {s.numero}</option>)}
            </select>
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {VALORI_PMR.map((v) => (
            <label key={v.k} className="block">
              <span className="label">{v.nome}{v.k === 'ss' && ' *'} <span className="font-normal text-stone-400">{v.unita}</span></span>
              <input className="input" inputMode="decimal" value={f.valori[v.k] ?? ''} required={v.k === 'ss'}
                onChange={(e) => setF({ ...f, valori: { ...f.valori, [v.k]: e.target.value.replace(/[^0-9.,]/g, '') } })} />
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Laboratorio"><input className="input" value={f.laboratorio} onChange={(e) => setF({ ...f, laboratorio: e.target.value })} /></Campo>
          <Campo label="Note"><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Campo>
        </div>
        {errore && <p className="text-sm text-red-600">{errore}</p>}
        <div className="flex justify-end gap-2">
          {f.id && <button type="button" className="btn-secondary" onClick={() => setF(vuoto())}>Annulla modifica</button>}
          <button className="btn-primary" disabled={salvando || lettura === 'in corso'}>{salvando ? 'Salvo il file…' : f.id ? 'Salva modifiche' : 'Aggiungi analisi'}</button>
        </div>
      </form>

      {storico.length > 0 && (
        <div className="mt-6 border-t border-stone-200 pt-4">
          <h3 className="text-sm font-semibold text-stone-700">Analisi inserite</h3>
          <ul className="mt-2 divide-y divide-stone-100">
            {storico.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{fmtData(a.data)} · {a.stalla === undefined ? 'tutte le stalle' : `stalla ${a.stalla}`}</div>
                  <div className="text-xs text-stone-500">
                    SS {fmt1(a.ss)}%{VALORI_PMR.filter((v) => v.k !== 'ss' && a[v.k] !== undefined).map((v) => ` · ${v.nome} ${v.k === 'ufl' ? fmt2(a[v.k] as number) : fmt1(a[v.k] as number)}`).join('')}
                    {a.laboratorio && ` · ${a.laboratorio}`}
                  </div>
                  {a.allegato && <a href={a.allegato.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"><Paperclip className="h-3 w-3" />{a.allegato.nome}</a>}
                </div>
                <button className="text-stone-400 hover:text-brand-700" aria-label="Modifica" onClick={() => modifica(a)}><Pencil className="h-4 w-4" /></button>
                <button className="text-stone-400 hover:text-rose-600" aria-label="Elimina" onClick={() => elimina('analisiPmr', a.id)}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modale>
  )
}
