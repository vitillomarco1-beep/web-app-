import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { PageHeader, StatTile, BadgeEsito } from '../components/ui'
import BarChart from '../components/BarChart'
import { aggiungiGiorni, fmt0, fmt1, fmt2, fmtData, fmtEur, isoGiorno, lunediDi } from '../lib/format'
import { serieGiorni, totaleConsegne } from '../lib/statistiche'
import { dataPronta, formeDisponibili, statoLotto } from '../lib/caseificio'
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

  // Caseificio e bilancio del latte (ultimi 30 giorni)
  const lotti = dati.lavorazioni.map((l) => ({ l, stato: statoLotto(l, dati.uscite, oggi), disp: formeDisponibili(l, dati.uscite) }))
  const formePronte = lotti.filter((x) => x.stato === 'pronto').reduce((s, x) => s + x.disp, 0)
  const formeInStag = lotti.filter((x) => x.stato === 'in stagionatura').reduce((s, x) => s + x.disp, 0)
  const prossimi = lotti.filter((x) => x.stato === 'in stagionatura').sort((a, b) => dataPronta(a.l).localeCompare(dataPronta(b.l))).slice(0, 3)
  const prodotto30 = dati.mungiture.filter((m) => m.data >= da30 && m.data <= oggi).reduce((s, m) => s + m.litri, 0)
  const trasformato30 = dati.lavorazioni.filter((l) => l.data >= da30 && l.data <= oggi).reduce((s, l) => s + l.litriLatte, 0)

  const inScadenzaParto = dati.capi
    .filter((c) => c.stato === 'asciutta' && c.ultimoParto)
    .map((c) => ({ c, previsto: aggiungiGiorni(c.ultimoParto!, 365) })) // stima interparto ~12 mesi
    .sort((a, b) => a.previsto.localeCompare(b.previsto))

  const lunScorso = aggiungiGiorni(lunediDi(oggi), -7)
  const scarichiDaVerificare =
    dati.scarichi.some((s) => s.data >= lunScorso && s.data <= aggiungiGiorni(lunScorso, 6)) &&
    !dati.verifiche.some((v) => v.settimana === lunScorso)
  const scarichiOggi = new Set(dati.scarichi.filter((s) => s.data === oggi).map((s) => `${s.stalla}-${s.turno}`)).size

  return (
    <>
      {scarichiDaVerificare && (
        <Link to="/area-riservata/alimentazione" className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-inset ring-amber-200 hover:bg-amber-100">
          <span><b>!</b> Scarichi di razione della settimana scorsa ({fmtData(lunScorso)} – {fmtData(aggiungiGiorni(lunScorso, 6))}) da verificare.</span>
          <span className="font-medium">Verifica →</span>
        </Link>
      )}
      <PageHeader titolo="Cruscotto" descrizione={`Situazione aggiornata al ${fmtData(oggi)}`}
        azioni={<>
          <Link to="/area-riservata/alimentazione" className="btn-secondary">Scarichi razione oggi: {scarichiOggi}/{dati.stalle.length * 2}</Link>
          <Link to="/area-riservata/produzione" className="btn-primary">+ Registra mungitura</Link>
        </>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile etichetta={`Produzione del ${fmtData(riferimento)}`} valore={fmt0(ultimo.litri)} unita="litri"
          nota={`${ultimo.turni} mungiture registrate`} />
        <StatTile etichetta="Media ultimi 7 giorni" valore={fmt0(media7)} unita="l/giorno"
          nota={varPerc === null ? '—' : `${varPerc >= 0 ? '▲' : '▼'} ${fmt1(Math.abs(varPerc))}% sulla settimana precedente`} />
        <StatTile etichetta="Resa per capo" valore={fmt1(litriCapo)} unita="l/capo"
          nota={`${ultimo.capi} capi munti · ${inLattazione} in lattazione in anagrafica`} />
        <StatTile etichetta="Latte consegnato – 30 giorni" valore={fmt0(tot.litri)} unita="litri"
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Caseificio</h2>
            <Link to="/area-riservata/caseificio" className="btn-link">Magazzino</Link>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-stone-500">Forme pronte</dt><dd className="text-2xl font-bold tabular-nums">{fmt0(formePronte)}</dd></div>
            <div><dt className="text-stone-500">In stagionatura</dt><dd className="text-2xl font-bold tabular-nums">{fmt0(formeInStag)}</dd></div>
          </dl>
          {prossimi.length > 0 && (
            <>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Prossimi lotti pronti</h3>
              <ul className="mt-1 divide-y divide-stone-100 text-sm">
                {prossimi.map(({ l, disp }) => (
                  <li key={l.id} className="flex justify-between py-1.5"><span className="font-mono text-xs">{l.lotto}</span><span className="tabular-nums">{disp} forme · {fmtData(dataPronta(l))}</span></li>
                ))}
              </ul>
            </>
          )}
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Latte ultimi 30 giorni</h3>
          <dl className="mt-1 space-y-1 text-sm">
            <div className="flex justify-between"><dt>Prodotto</dt><dd className="tabular-nums">{fmt0(prodotto30)} l</dd></div>
            <div className="flex justify-between"><dt>Trasformato in caseificio</dt><dd className="tabular-nums">{fmt0(trasformato30)} l{prodotto30 > 0 && ` (${fmt0((trasformato30 / prodotto30) * 100)}%)`}</dd></div>
            <div className="flex justify-between"><dt>Consegnato a terzi</dt><dd className="tabular-nums">{fmt0(tot.litri)} l</dd></div>
          </dl>
        </section>
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
            <h2 className="font-semibold">Ultime consegne di latte</h2>
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
