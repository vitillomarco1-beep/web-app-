import { useState } from 'react'
import { ClipboardPaste, ListChecks } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Ingrediente, QuotazioneClal } from '../lib/types'
import { LISTINO_TIPICO, alimentoDelListino } from '../lib/prezzi'
import { PAGINE_CLAL, leggiTabelleClal, meseIt, quotazioniAttuali, suggerisci } from '../lib/clal'
import { fmt0, fmt2, isoGiorno, nuovoId } from '../lib/format'

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
  const trova = (nome: string) => { const l = LISTINO_TIPICO.find((x) => x.nome === nome); return l ? alimentoDelListino(l, dati.ingredienti) : undefined }
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
                <span className="block font-medium">{l.nome}{i && i.nome.toLowerCase() !== l.nome.toLowerCase() && <span className="font-normal text-stone-500"> (il tuo “{i.nome}”)</span>}</span>
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

function ImportaClal() {
  const { dati, aggiorna, imposta } = useStore()
  const quot = quotazioniAttuali(dati.quotazioniClal).sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
  const [incollato, setIncollato] = useState('')
  const [esito, setEsito] = useState('')
  const ingr = [...dati.ingredienti].sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
  const collegato = (nome: string) => dati.ingredienti.filter((i) => i.clal?.voce === nome)
  const rif = (q: QuotazioneClal) => ({ prezzoQ: Math.round(q.prezzoT) / 10, data: q.mese, voce: q.nome })

  /** Collega un alimento a una quotazione (o lo scollega con nome vuoto). */
  const collega = (i: Ingrediente, nome: string) => {
    const q = quot.find((x) => x.nome === nome)
    if (!q) { const { clal: _c, ...resto } = i; void _c; aggiorna('ingredienti', { ...resto, fonte: i.fonte === 'clal' ? 'fornitore' : i.fonte }); return }
    aggiorna('ingredienti', { ...i, clal: rif(q) })
  }
  const daSuggerire = dati.ingredienti.filter((i) => !i.clal && suggerisci(i.nome))
  const collegaSuggeriti = () => daSuggerire.forEach((i) => { const q = quot.find((x) => x.nome === suggerisci(i.nome)); if (q) aggiorna('ingredienti', { ...i, clal: rif(q) }) })

  const leggi = () => {
    const lette = leggiTabelleClal(incollato)
    if (!lette.length) { setEsito('Non ho trovato tabelle di prezzi CLAL nel testo incollato. Copia dalla pagina CLAL il riquadro con il nome del prodotto, gli anni e i mesi.'); return }
    const oggi = isoGiorno()
    const nuove = new Map(dati.quotazioniClal.map((q) => [q.id, q]))
    lette.forEach((l) => nuove.set(l.nome, { id: l.nome, nome: l.nome, mese: l.mese, prezzoT: l.prezzoT, importataIl: oggi }))
    imposta('quotazioniClal', [...nuove.values()])
    // aggiorna gli alimenti collegati; se usano il prezzo CLAL cambia anche il prezzo dei calcoli
    let agg = 0
    for (const i of dati.ingredienti) {
      const l = i.clal && lette.find((x) => x.nome === i.clal!.voce)
      if (!l) continue
      const r = { prezzoQ: Math.round(l.prezzoT) / 10, data: l.mese, voce: l.nome }
      aggiorna('ingredienti', { ...i, clal: r, ...(i.fonte === 'clal' ? { prezzoQ: r.prezzoQ, aggiornatoIl: oggi } : {}) })
      agg++
    }
    setEsito(`✓ ${lette.length} quotazioni importate (${[...new Set(lette.map((l) => meseIt(l.mese)))].join(', ')})${agg ? `, ${agg} alimenti aggiornati` : ''}.`)
    setIncollato('')
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="text-sm text-stone-600">Prezzi medi mensili della <b>Borsa Merci di Milano</b> pubblicati da CLAL (€/t, convertiti in €/q). Collega ogni alimento alla sua quotazione: resta come <b>riferimento di mercato</b> accanto al tuo prezzo; con <b>"usa"</b> diventa il prezzo dei calcoli e si aggiorna da solo a ogni importazione.</p>
        {daSuggerire.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-arancio-200 bg-arancio-50/60 p-3 text-sm">
            <span className="min-w-0 flex-1">Abbinamenti suggeriti: {daSuggerire.map((i) => `${i.nome} → ${suggerisci(i.nome)}`).join(' · ')}</span>
            <button className="btn-secondary py-1.5" onClick={collegaSuggeriti}>Collega</button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>Prodotto CLAL</th><th className="num">€/q</th><th>Alimento collegato</th></tr></thead>
          <tbody>
            {quot.map((q) => {
              const c = collegato(q.nome)
              return (
                <tr key={q.id}>
                  <td><div className="font-medium">{q.nome}</div><div className="text-xs text-stone-500">{meseIt(q.mese)} · {fmt0(q.prezzoT)} €/t</div></td>
                  <td className="num font-semibold">{fmt2(q.prezzoT / 10)}</td>
                  <td>
                    <select className="input !w-40 py-1.5 text-xs" value="" onChange={(e) => { const i = dati.ingredienti.find((x) => x.id === e.target.value); if (i) collega(i, q.nome) }}>
                      <option value="">{c.length ? '+ collega altro…' : 'Collega a…'}</option>
                      {ingr.filter((i) => i.clal?.voce !== q.nome).map((i) => <option key={i.id} value={i.id}>{i.nome}{i.clal ? ` (ora: ${i.clal.voce})` : ''}</option>)}
                    </select>
                    {c.map((i) => (
                      <div key={i.id} className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
                        <span className="font-medium text-brand-900">{i.nome}</span>
                        {i.fonte === 'clal' ? <span className="text-emerald-700">prezzo CLAL in uso</span>
                          : <button className="text-brand-700 hover:underline" onClick={() => aggiorna('ingredienti', { ...i, clal: rif(q), prezzoQ: rif(q).prezzoQ, fonte: 'clal', aggiornatoIl: isoGiorno() })}>usa</button>}
                        <button className="text-stone-400 hover:text-rose-600" onClick={() => collega(i, '')}>scollega</button>
                      </div>
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-stone-200 p-3">
        <h3 className="text-sm font-semibold text-stone-800">Aggiorna le quotazioni (una volta al mese)</h3>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm text-stone-600">
          <li>Apri la pagina CLAL: {PAGINE_CLAL.map((p, k) => <span key={p.url}>{k > 0 && ' · '}<a className="text-brand-700 underline" href={p.url} target="_blank" rel="noreferrer">{p.nome}</a></span>)}</li>
          <li>Seleziona tutto (Ctrl+A, sul telefono "Seleziona tutto") e copia.</li>
          <li>Incolla qui sotto e premi <b>Importa quotazioni</b>. Puoi incollare più pagine una dopo l'altra.</li>
        </ol>
        <textarea className="input mt-2 min-h-[90px] font-mono text-xs" placeholder="Incolla qui il contenuto della pagina CLAL…" value={incollato} onChange={(e) => setIncollato(e.target.value)} />
        <div className="mt-2 flex items-center justify-end gap-3">
          {esito && <span className={`text-sm ${esito.startsWith('✓') ? 'text-emerald-700' : 'text-red-600'}`}>{esito}</span>}
          <button className="btn-primary" onClick={leggi} disabled={!incollato.trim()}>Importa quotazioni</button>
        </div>
      </div>
    </div>
  )
}
