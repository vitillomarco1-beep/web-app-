import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { PageHeader, StatTile, BadgeEsito } from '../components/ui'
import BarChart from '../components/BarChart'
import { aggiungiGiorni, fmt0, fmt1, fmt2, fmtData, fmtEur, isoGiorno } from '../lib/format'
import { serieGiorni, totaleConsegne } from '../lib/statistiche'
import { LIMITE_CBT, LIMITE_SCC, esito, mediaMobileCbt, mediaMobileScc } from '../lib/qualita'

export default function DashboardPage() {
  const { dati } = useStore()
  const oggi = isoGiorno()

  // Ultimo giorno con produzione registrata (spesso "ieri", se oggi non è ancora stato inserito)
  const ultimoGiorno = dati.mungiture.reduce((max, m) => (m.data > max ? m.data : max), '')
  const riferimento = ultimoGiorno || oggi
  const serie30 = serieGiorni(dati.mungiture, riferimento, 30)
  const ultimo = serie30[serie30.length - 1]
  const ultimi7 = serie30.slice(-7).filter((g) => g.litri > 0)
  const precedenti7 = serie30.slice(-14, -7).filter((g) => g.litri > 0)
  const media = (gg: typeof ultimi7) => (gg.length ? gg.reduce((s, g) => s + g.litri, 0) / gg.length : 0)
  const media7 = media(ultimi7)
  const varPerc = media(precedenti7) > 0 ? ((media7 - media(precedenti7)) / media(precedenti7)) * 100 : null

  const inLattazione = dati.capi.filter((c) => c.stato === 'lattazione').length
  const litriCapo = ultimo.capi > 0 ? ultimo.litri / ultimo.capi : 0

  const da30 = aggiungiGiorni(oggi, -29)
  const tot = totaleConsegne(dati.consegne.filter((c) => c.data >= da30 && c.data <= oggi))

  const analisiOrd = [...dati.analisi].sort((a, b) => a.data.localeCompare(b.data))
  const ultimaAnalisi = analisiOrd[analisiOrd.length - 1]
  const cbt = mediaMobileCbt(dati.analisi, oggi)
  const scc = mediaMobileScc(dati.analisi, oggi)

  const inScadenzaParto = dati.capi
    .filter((c) => c.stato === 'asciutta' && c.ultimoParto)
    .map((c) => ({ c, previsto: aggiungiGiorni(c.ultimoParto!, 365) })) // stima interparto ~12 mesi
    .sort((a, b) => a.previsto.localeCompare(b.previsto))

  return (
    <>
      <PageHeader titolo="Cruscotto" descrizione={`Situazione aggiornata al ${fmtData(oggi)}`}
        azioni={<Link to="/area-riservata/produzione" className="btn-primary">+ Registra mungitura</Link>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile etichetta={`Produzione del ${fmtData(riferimento)}`} valore={fmt0(ultimo.litri)} unita="litri"
          nota={`${ultimo.turni} mungiture registrate`} />
        <StatTile etichetta="Media ultimi 7 giorni" valore={fmt0(media7)} unita="l/giorno"
          nota={varPerc === null ? '—' : `${varPerc >= 0 ? '▲' : '▼'} ${fmt1(Math.abs(varPerc))}% sulla settimana precedente`} />
        <StatTile etichetta="Resa per capo" valore={fmt1(litriCapo)} unita="l/capo"
          nota={`${ultimo.capi} capi munti · ${inLattazione} in lattazione in anagrafica`} />
        <StatTile etichetta="Consegnato ultimi 30 giorni" valore={fmt0(tot.litri)} unita="litri"
          nota={`${fmtEur(tot.importo)} · media ${fmt2(tot.prezzoMedio)} €/l`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="card xl:col-span-2">
          <h2 className="font-semibold">Litri prodotti al giorno – ultimi 30 giorni</h2>
          <div className="mt-4">
            <BarChart unita="l" formatta={fmt0}
              dati={serie30.map((g) => ({ etichetta: fmtData(g.data).slice(0, 5), valore: g.litri, dettaglio: `${fmtData(g.data)} · ${g.capi} capi` }))} />
          </div>
        </section>

        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Qualità del latte</h2>
            <Link to="/area-riservata/qualita" className="btn-link">Dettagli</Link>
          </div>
          <p className="mt-1 text-xs text-stone-500">Medie geometriche mobili (Reg. CE 853/2004)</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt>Carica batterica (2 mesi)<br /><span className="text-xs text-stone-500">limite {fmt0(LIMITE_CBT * 1000)} UFC/ml</span></dt>
              <dd className="text-right"><div className="font-semibold tabular-nums">{cbt.valore ? fmt0(cbt.valore * 1000) : '—'}</div><BadgeEsito esito={esito(cbt.valore, LIMITE_CBT)} /></dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt>Cellule somatiche (3 mesi)<br /><span className="text-xs text-stone-500">limite {fmt0(LIMITE_SCC * 1000)} /ml</span></dt>
              <dd className="text-right"><div className="font-semibold tabular-nums">{scc.valore ? fmt0(scc.valore * 1000) : '—'}</div><BadgeEsito esito={esito(scc.valore, LIMITE_SCC)} /></dd>
            </div>
            {ultimaAnalisi && (
              <div className="border-t border-stone-100 pt-3 text-stone-600">
                Ultima analisi ({fmtData(ultimaAnalisi.data)}): grasso <b>{fmt2(ultimaAnalisi.grasso)}%</b>, proteine <b>{fmt2(ultimaAnalisi.proteine)}%</b>
              </div>
            )}
          </dl>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Vacche in asciutta – parto previsto</h2>
            <Link to="/area-riservata/mandria" className="btn-link">Mandria</Link>
          </div>
          {inScadenzaParto.length === 0 ? <p className="mt-4 text-sm text-stone-500">Nessuna vacca in asciutta.</p> : (
            <ul className="mt-3 divide-y divide-stone-100 text-sm">
              {inScadenzaParto.map(({ c, previsto }) => (
                <li key={c.id} className="flex justify-between py-2"><span>{c.nome} <span className="text-stone-400">{c.matricola}</span></span><span className="tabular-nums">{fmtData(previsto)}</span></li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-stone-400">Stima: ultimo parto + 12 mesi.</p>
        </section>
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Ultime consegne</h2>
            <Link to="/area-riservata/consegne" className="btn-link">Tutte</Link>
          </div>
          <ul className="mt-3 divide-y divide-stone-100 text-sm">
            {[...dati.consegne].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5).map((c) => (
              <li key={c.id} className="flex justify-between gap-2 py-2">
                <span>{fmtData(c.data)} · {c.acquirente}</span>
                <span className="tabular-nums">{fmt0(c.litri)} l · {fmtEur(c.litri * c.prezzoLitro)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
