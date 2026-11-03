import { useState } from 'react'
import { ClipboardPaste, ListChecks } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Ingrediente } from '../lib/types'
import { LISTINO_TIPICO, abbina, leggiQuotazioni, type RigaQuotazione } from '../lib/prezzi'
import { fmt2, isoGiorno, nuovoId } from '../lib/format'

const num = (s: string) => { const n = Number(s.replace(',', '.')); return s.trim() && Number.isFinite(n) ? n : null }
const testo = (n: number) => (n ? String(Math.round(n * 100) / 100).replace('.', ',') : '')
export const NOMI_FONTE = { fornitore: 'fornitore', aziendale: 'produzione aziendale', clal: 'CLAL' } as const

/** Aggiornamento dei prezzi: importazione delle quotazioni CLAL e listino preimpostato da compilare. */
export default function PrezziMercato() {
  const [scheda, setScheda] = useState<'listino' | 'clal'>('listino')
  return (
    <div className="card">
      <h2>Aggiorna i prezzi</h2>
      <div className="mt-3 flex gap-1 rounded-xl bg-stone-100 p-1">
        {([['listino', 'Listino preimpostato', ListChecks], ['clal', 'Importa da CLAL', ClipboardPaste]] as const).map(([id, nome, I]) => (
          <button key={id} onClick={() => setScheda(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${scheda === id ? 'bg-white text-brand-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            <I className="h-4 w-4" />{nome}
          </button>
        ))}
      </div>
      {scheda === 'listino' ? <Listino /> : <ImportaClal />}
    </div>
  )
}

function Listino() {
  const { dati, aggiungi, aggiorna } = useStore()
  const trova = (nome: string) => dati.ingredienti.find((i) => i.nome.toLowerCase() === nome.toLowerCase())
  const [valori, setValori] = useState<Record<string, { prezzo: string; fonte: 'fornitore' | 'aziendale' }>>(() =>
    Object.fromEntries(LISTINO_TIPICO.map((l) => { const i = trova(l.nome); return [l.nome, { prezzo: testo(i?.prezzoQ ?? 0), fonte: (i?.fonte === 'aziendale' || i?.fonte === 'fornitore' ? i.fonte : l.fonte) }] })))
  const [esito, setEsito] = useState('')

  const salva = () => {
    let n = 0
    for (const l of LISTINO_TIPICO) {
      const v = valori[l.nome]
      const p = num(v.prezzo)
      if (p === null) continue
      const i = trova(l.nome)
      if (i) { if (i.prezzoQ !== p || i.fonte !== v.fonte) { aggiorna('ingredienti', { ...i, prezzoQ: p, fonte: v.fonte, aggiornatoIl: isoGiorno() }); n++ } }
      else { aggiungi('ingredienti', { id: nuovoId(), nome: l.nome, prezzoQ: p, fonte: v.fonte, aggiornatoIl: isoGiorno() }); n++ }
    }
    setEsito(n ? `✓ ${n} prezzi salvati` : 'Nessun prezzo cambiato')
    setTimeout(() => setEsito(''), 3000)
  }

  return (
    <div className="mt-4">
      <p className="text-sm text-stone-600">Gli alimenti più usati sono già elencati: scrivi il prezzo che conosci (fornitore o costo di produzione aziendale) in <b>€/quintale tal quale</b>. Quelli lasciati vuoti non vengono aggiunti.</p>
      <ul className="mt-3 divide-y divide-stone-100">
        {LISTINO_TIPICO.map((l) => {
          const v = valori[l.nome]
          const i = trova(l.nome)
          return (
            <li key={l.nome} className="flex flex-wrap items-center gap-2 py-2">
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-medium">{l.nome}</span>
                {i?.clal && <span className="block text-xs text-stone-500">CLAL: {fmt2(i.clal.prezzoQ)} €/q</span>}
              </span>
              <select className="input !w-auto py-1.5 text-xs" value={v.fonte} onChange={(e) => setValori({ ...valori, [l.nome]: { ...v, fonte: e.target.value as 'fornitore' | 'aziendale' } })} aria-label={`Fonte ${l.nome}`}>
                <option value="fornitore">Fornitore</option>
                <option value="aziendale">Aziendale</option>
              </select>
              <input className="input !w-20 shrink-0 py-1.5 text-right" inputMode="decimal" placeholder="€/q" value={v.prezzo} aria-label={`Prezzo ${l.nome}`}
                onChange={(e) => setValori({ ...valori, [l.nome]: { ...v, prezzo: e.target.value.replace(/[^0-9.,]/g, '') } })} />
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex items-center justify-end gap-3">
        {esito && <span className="text-sm text-emerald-700">{esito}</span>}
        <button className="btn-primary" onClick={salva}>Salva prezzi</button>
      </div>
    </div>
  )
}

type Riga = RigaQuotazione & { ingredienteId: string; usa: boolean }

function ImportaClal() {
  const { dati, aggiungi, aggiorna } = useStore()
  const [incollato, setIncollato] = useState('')
  const [unita, setUnita] = useState<'t' | 'q'>('t')
  const [data, setData] = useState(isoGiorno())
  const [righe, setRighe] = useState<Riga[] | null>(null)
  const [esito, setEsito] = useState('')
  const aQ = (p: number) => (unita === 't' ? p / 10 : p)

  const leggi = () => {
    const r = leggiQuotazioni(incollato)
    setRighe(r.map((x) => {
      const i = abbina(x.voce, dati.ingredienti)
      if (i) return { ...x, ingredienteId: i.id, usa: !(i.prezzoQ > 0) }
      // alimento del listino non ancora inserito: proposto come nuovo
      const l = abbina(x.voce, LISTINO_TIPICO.filter((t) => !dati.ingredienti.some((g) => g.nome.toLowerCase() === t.nome.toLowerCase())).map((t) => ({ id: `nuovo:${t.nome}`, nome: t.nome })))
      return { ...x, ingredienteId: l?.id ?? '', usa: false }
    }))
    setEsito(r.length ? '' : 'Non ho trovato righe con un prodotto e un prezzo. Copia la tabella con i nomi dei prodotti e i prezzi.')
  }

  const applica = () => {
    if (!righe) return
    let rif = 0, usati = 0
    const nuovi: Ingrediente[] = []
    for (const r of righe) {
      if (!r.ingredienteId) continue
      const clal = { prezzoQ: Math.round(aQ(r.prezzo) * 100) / 100, data, voce: r.voce }
      if (r.ingredienteId.startsWith('nuovo:')) {
        nuovi.push({ id: nuovoId(), nome: r.ingredienteId.slice(6), prezzoQ: r.usa ? clal.prezzoQ : 0, clal, ...(r.usa ? { fonte: 'clal' as const, aggiornatoIl: data } : {}) })
        rif++; if (r.usa) usati++
        continue
      }
      const i = dati.ingredienti.find((x) => x.id === r.ingredienteId)
      if (!i) continue
      aggiorna('ingredienti', { ...i, clal, ...(r.usa ? { prezzoQ: clal.prezzoQ, fonte: 'clal' as const, aggiornatoIl: data } : {}) })
      rif++; if (r.usa) usati++
    }
    nuovi.forEach((n) => aggiungi('ingredienti', n))
    setEsito(`✓ ${rif} quotazioni salvate come riferimento${usati ? `, ${usati} usate come prezzo` : ''}.`)
    setRighe(null); setIncollato('')
  }

  const giaAbbinati = new Set(righe?.map((r) => r.ingredienteId).filter(Boolean))

  return (
    <div className="mt-4 space-y-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-600">
        <li>Apri <b>clal.it</b> nella sezione delle materie prime per mangimi (Borsa Merci).</li>
        <li>Seleziona la tabella dei prezzi con il mouse (o tieni premuto sul telefono) e <b>copia</b>.</li>
        <li>Incolla qui sotto e premi <b>Leggi i prezzi</b>.</li>
      </ol>
      <textarea className="input min-h-[120px] font-mono text-xs" placeholder={'Esempio:\nMais nazionale ibrido   228,00   232,00\nFarina di estrazione di soia 44%   385,00   390,00\nFieno di erba medica 1° taglio   150,00   160,00'}
        value={incollato} onChange={(e) => setIncollato(e.target.value)} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="block"><span className="label">Prezzi in</span>
          <select className="input !w-auto" value={unita} onChange={(e) => setUnita(e.target.value as 't' | 'q')}>
            <option value="t">€/tonnellata</option><option value="q">€/quintale</option>
          </select>
        </label>
        <label className="block"><span className="label">Data delle quotazioni</span><input type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} /></label>
        <button className="btn-primary" onClick={leggi} disabled={!incollato.trim()}>Leggi i prezzi</button>
      </div>
      {esito && <p className={`text-sm ${esito.startsWith('✓') ? 'text-emerald-700' : 'text-red-600'}`}>{esito}</p>}

      {righe && righe.length > 0 && (
        <div className="rounded-xl border border-stone-200 p-3">
          <p className="text-xs text-stone-500">Abbina ogni quotazione a un alimento. Viene sempre salvata come <b>riferimento CLAL</b>; spunta "Usa" per farla diventare anche il prezzo dei calcoli.</p>
          <ul className="mt-2 divide-y divide-stone-100">
            {righe.map((r, k) => (
              <li key={k} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{r.voce}</span>
                  <span className="text-xs text-stone-500">{r.min !== undefined ? `${fmt2(r.min)}–${fmt2(r.max!)} → ` : ''}<b>{fmt2(aQ(r.prezzo))} €/q</b></span>
                </span>
                <select className="input !w-44 py-1.5 text-xs" value={r.ingredienteId} onChange={(e) => setRighe(righe.map((x, j) => (j === k ? { ...x, ingredienteId: e.target.value } : x)))}>
                  <option value="">Non usare</option>
                  {[...dati.ingredienti].sort((a, b) => a.nome.localeCompare(b.nome, 'it')).map((i) => <option key={i.id} value={i.id}>{i.nome}{giaAbbinati.has(i.id) && i.id !== r.ingredienteId ? ' (già abbinato)' : ''}</option>)}
                  {LISTINO_TIPICO.filter((l) => !dati.ingredienti.some((i) => i.nome.toLowerCase() === l.nome.toLowerCase())).map((l) => <option key={l.nome} value={`nuovo:${l.nome}`}>+ {l.nome} (nuovo)</option>)}
                </select>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" className="h-4 w-4" checked={r.usa} disabled={!r.ingredienteId} onChange={(e) => setRighe(righe.map((x, j) => (j === k ? { ...x, usa: e.target.checked } : x)))} />Usa</label>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setRighe(null)}>Annulla</button>
            <button className="btn-primary" onClick={applica} disabled={!righe.some((r) => r.ingredienteId)}>Salva quotazioni</button>
          </div>
        </div>
      )}
    </div>
  )
}
