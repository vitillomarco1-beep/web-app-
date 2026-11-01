import { useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import type { Lavorazione, TipoUscita, UscitaForme } from '../lib/types'
import { BadgeEsito, Campo, Modale, PageHeader, StatTile, Vuoto, conferma } from '../components/ui'
import { aggiungiGiorni, fmt0, fmt1, fmt2, fmtData, fmtEur, giorniTra, isoGiorno, nuovoId } from '../lib/format'
import {
  analisiDiRiferimento, avanzamento, dataPronta, formeDisponibili, nuovoCodiceLotto, pesoMedioForma,
  resa, statoLotto, usciteDel, type StatoLotto,
} from '../lib/caseificio'
import { esitoAnalisi } from '../lib/qualita'
import { perGiorno } from '../lib/statistiche'

type Scheda = 'magazzino' | 'lavorazioni' | 'uscite'
const STAGIONATURE = [15, 30, 60, 90, 120, 180, 365]
const TIPI_USCITA: { v: TipoUscita; l: string }[] = [
  { v: 'vendita', l: 'Vendita' },
  { v: 'omaggio', l: 'Omaggio / assaggi' },
  { v: 'scarto', l: 'Scarto' },
]

const STILE_STATO: Record<StatoLotto, { cls: string; icona: string }> = {
  'in stagionatura': { cls: 'bg-arancio-50 text-arancio-800 ring-arancio-200', icona: '◔' },
  pronto: { cls: 'bg-green-50 text-green-800 ring-green-200', icona: '✓' },
  esaurito: { cls: 'bg-stone-100 text-stone-600 ring-stone-200', icona: '–' },
}

function BadgeStato({ stato }: { stato: StatoLotto }) {
  const s = STILE_STATO[stato]
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <span aria-hidden>{s.icona}</span>{stato}
    </span>
  )
}

function BarraStagionatura({ frazione }: { frazione: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={Math.round(frazione * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${frazione * 100}%` }} />
      </div>
      <span className="text-xs tabular-nums text-stone-500">{Math.round(frazione * 100)}%</span>
    </div>
  )
}

export default function CaseificioPage() {
  const { dati, aggiungi, aggiorna, elimina } = useStore()
  const { lavorazioni, uscite } = dati
  const oggi = isoGiorno()
  const [scheda, setScheda] = useState<Scheda>('magazzino')
  const [lav, setLav] = useState<Lavorazione | null>(null)
  const [usc, setUsc] = useState<UscitaForme | null>(null)
  const [dettaglio, setDettaglio] = useState<Lavorazione | null>(null)
  const [mostraEsauriti, setMostraEsauriti] = useState(false)

  const ordinate = [...lavorazioni].sort((a, b) => b.data.localeCompare(a.data) || b.lotto.localeCompare(a.lotto))
  const conStato = ordinate.map((l) => ({ l, stato: statoLotto(l, uscite, oggi), disp: formeDisponibili(l, uscite) }))

  // Indicatori
  const inStag = conStato.filter((x) => x.stato === 'in stagionatura')
  const pronti = conStato.filter((x) => x.stato === 'pronto')
  const formeInStag = inStag.reduce((s, x) => s + x.disp, 0)
  const formePronte = pronti.reduce((s, x) => s + x.disp, 0)
  const da30 = aggiungiGiorni(oggi, -29)
  const lav30 = lavorazioni.filter((l) => l.data >= da30)
  const litri30 = lav30.reduce((s, l) => s + l.litriLatte, 0)
  const kg30 = lav30.reduce((s, l) => s + l.pesoFrescoKg, 0)
  const vendite30 = uscite.filter((u) => u.tipo === 'vendita' && u.data >= da30)
  const kgVenduti30 = vendite30.reduce((s, u) => s + u.pesoKg, 0)
  const incasso30 = vendite30.reduce((s, u) => s + u.pesoKg * (u.prezzoKg ?? 0), 0)

  const lottoDi = (id: string) => lavorazioni.find((l) => l.id === id)

  // --- Lavorazioni
  const nuovaLavorazione = (): Lavorazione => {
    const ultima = ordinate[0]
    return {
      id: '', data: oggi, lotto: nuovoCodiceLotto(oggi, lavorazioni), litriLatte: 0, formeProdotte: 0, pesoFrescoKg: 0,
      stagionaturaGiorni: ultima?.stagionaturaGiorni ?? 60,
    }
  }
  const salvaLavorazione = (e: FormEvent) => {
    e.preventDefault()
    if (!lav) return
    const venduteGia = lav.id ? usciteDel(lav, uscite).reduce((s, u) => s + u.forme, 0) : 0
    if (lav.formeProdotte < venduteGia) {
      alert(`Da questo lotto sono già uscite ${venduteGia} forme: le forme prodotte non possono essere meno.`)
      return
    }
    if (lavorazioni.some((l) => l.lotto === lav.lotto && l.id !== lav.id)) {
      alert(`Il codice lotto ${lav.lotto} esiste già.`)
      return
    }
    if (lav.id) aggiorna('lavorazioni', lav)
    else aggiungi('lavorazioni', { ...lav, id: nuovoId() })
    setLav(null)
  }
  const eliminaLavorazione = (l: Lavorazione) => {
    const u = usciteDel(l, uscite)
    const msg = u.length
      ? `Il lotto ${l.lotto} ha ${u.length} uscite registrate, che verranno eliminate. Continuare?`
      : `Eliminare il lotto ${l.lotto}?`
    if (!conferma(msg)) return
    u.forEach((x) => elimina('uscite', x.id))
    elimina('lavorazioni', l.id)
  }

  // --- Uscite
  const nuovaUscita = (l?: Lavorazione): UscitaForme => {
    const candidato = l ?? conStato.find((x) => x.stato === 'pronto')?.l ?? conStato.find((x) => x.disp > 0)?.l
    return { id: '', lavorazioneId: candidato?.id ?? '', data: oggi, tipo: 'vendita', forme: 1, pesoKg: 0, cliente: '', prezzoKg: undefined }
  }
  const lottoUscita = usc ? lottoDi(usc.lavorazioneId) : undefined
  const maxForme = usc && lottoUscita
    ? formeDisponibili(lottoUscita, uscite) + (usc.id ? (uscite.find((x) => x.id === usc.id)?.forme ?? 0) : 0)
    : 0
  const salvaUscita = (e: FormEvent) => {
    e.preventDefault()
    if (!usc || !lottoUscita) return
    if (usc.forme > maxForme) {
      alert(`Nel lotto ${lottoUscita.lotto} sono disponibili solo ${maxForme} forme.`)
      return
    }
    const pulita: UscitaForme = { ...usc, prezzoKg: usc.tipo === 'vendita' ? usc.prezzoKg : undefined, cliente: usc.cliente || undefined }
    if (usc.id) aggiorna('uscite', pulita)
    else aggiungi('uscite', { ...pulita, id: nuovoId() })
    setUsc(null)
  }
  const clienti = [...new Set(uscite.map((u) => u.cliente).filter(Boolean) as string[])].sort()
  const uscitePerData = [...uscite].sort((a, b) => b.data.localeCompare(a.data))

  const tabCls = (s: Scheda) =>
    `border-b-2 px-4 py-2 text-sm font-medium ${scheda === s ? 'border-brand-700 text-brand-800' : 'border-transparent text-stone-500 hover:text-stone-800'}`

  return (
    <>
      <PageHeader titolo="Caseificio" descrizione="Lavorazioni di caciocavallo, stagionatura, magazzino e tracciabilità dei lotti"
        azioni={<>
          <button className="btn-secondary" onClick={() => setUsc(nuovaUscita())} disabled={!conStato.some((x) => x.disp > 0)}>Registra uscita</button>
          <button className="btn-primary" onClick={() => setLav(nuovaLavorazione())}>+ Nuova lavorazione</button>
        </>} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile etichetta="Forme pronte alla vendita" valore={fmt0(formePronte)} unita="forme" nota={`${pronti.length} lotti`} />
        <StatTile etichetta="Forme in stagionatura" valore={fmt0(formeInStag)} unita="forme" nota={`${inStag.length} lotti`} />
        <StatTile etichetta="Latte trasformato – 30 giorni" valore={fmt0(litri30)} unita="litri"
          nota={litri30 > 0 ? `${fmt0(kg30)} kg prodotti · resa ${fmt1((kg30 / litri30) * 100)} kg/100 l` : '—'} />
        <StatTile etichetta="Venduto – 30 giorni" valore={fmt0(kgVenduti30)} unita="kg"
          nota={kgVenduti30 > 0 ? `${fmtEur(incasso30)} · media ${fmt2(incasso30 / kgVenduti30)} €/kg` : '—'} />
      </div>

      <div className="mb-4 flex gap-1 border-b border-stone-200" role="tablist">
        <button role="tab" aria-selected={scheda === 'magazzino'} className={tabCls('magazzino')} onClick={() => setScheda('magazzino')}>Magazzino</button>
        <button role="tab" aria-selected={scheda === 'lavorazioni'} className={tabCls('lavorazioni')} onClick={() => setScheda('lavorazioni')}>Lavorazioni ({lavorazioni.length})</button>
        <button role="tab" aria-selected={scheda === 'uscite'} className={tabCls('uscite')} onClick={() => setScheda('uscite')}>Uscite ({uscite.length})</button>
      </div>

      {scheda === 'magazzino' && (() => {
        const righe = conStato
          .filter((x) => mostraEsauriti || x.stato !== 'esaurito')
          .sort((a, b) => dataPronta(a.l).localeCompare(dataPronta(b.l)))
        return (
          <>
            <label className="mb-3 flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" checked={mostraEsauriti} onChange={(e) => setMostraEsauriti(e.target.checked)} /> Mostra anche i lotti esauriti
            </label>
            {righe.length === 0 ? <Vuoto>Nessuna forma in magazzino. Registra una lavorazione per iniziare.</Vuoto> : (
              <div className="card overflow-x-auto p-0">
                <table className="table">
                  <thead><tr><th>Lotto</th><th>Prodotto il</th><th>Stagionatura</th><th>Avanzamento</th><th>Pronto dal</th><th className="num">Disponibili</th><th>Stato</th><th></th></tr></thead>
                  <tbody>
                    {righe.map(({ l, stato, disp }) => {
                      const mancano = giorniTra(oggi, dataPronta(l))
                      return (
                        <tr key={l.id}>
                          <td className="font-mono text-xs font-medium">{l.lotto}</td>
                          <td>{fmtData(l.data)}</td>
                          <td>{l.stagionaturaGiorni} gg</td>
                          <td><BarraStagionatura frazione={avanzamento(l, oggi)} /></td>
                          <td>{fmtData(dataPronta(l))}{mancano > 0 && <span className="block text-xs text-stone-500">tra {mancano} gg</span>}</td>
                          <td className="num"><b>{disp}</b> <span className="text-stone-400">/ {l.formeProdotte}</span></td>
                          <td><BadgeStato stato={stato} /></td>
                          <td className="whitespace-nowrap text-right">
                            <button className="btn-link mr-3" onClick={() => setDettaglio(l)}>Scheda lotto</button>
                            {disp > 0 && <button className="btn-link" onClick={() => setUsc(nuovaUscita(l))}>Uscita</button>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      })()}

      {scheda === 'lavorazioni' && (ordinate.length === 0 ? <Vuoto>Nessuna lavorazione registrata.</Vuoto> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Lotto</th><th>Data</th><th className="num">Latte (l)</th><th className="num">Forme</th><th className="num">Peso fresco (kg)</th><th className="num">Peso medio (kg)</th><th className="num">Resa (kg/100 l)</th><th>Stagionatura</th><th></th></tr></thead>
            <tbody>
              {ordinate.map((l) => (
                <tr key={l.id}>
                  <td className="font-mono text-xs font-medium">{l.lotto}</td>
                  <td>{fmtData(l.data)}</td>
                  <td className="num">{fmt0(l.litriLatte)}</td>
                  <td className="num">{l.formeProdotte}</td>
                  <td className="num">{fmt1(l.pesoFrescoKg)}</td>
                  <td className="num">{fmt2(pesoMedioForma(l))}</td>
                  <td className="num">{fmt1(resa(l))}</td>
                  <td>{l.stagionaturaGiorni} gg</td>
                  <td className="whitespace-nowrap text-right">
                    <button className="btn-link mr-3" onClick={() => setDettaglio(l)}>Scheda</button>
                    <button className="btn-link mr-3" onClick={() => setLav(l)}>Modifica</button>
                    <button className="btn-danger-link" onClick={() => eliminaLavorazione(l)}>Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {scheda === 'uscite' && (uscitePerData.length === 0 ? <Vuoto>Nessuna uscita registrata.</Vuoto> : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead><tr><th>Data</th><th>Lotto</th><th>Tipo</th><th>Cliente</th><th className="num">Forme</th><th className="num">Peso (kg)</th><th className="num">€/kg</th><th className="num">Importo</th><th></th></tr></thead>
            <tbody>
              {uscitePerData.map((u) => {
                const l = lottoDi(u.lavorazioneId)
                return (
                  <tr key={u.id}>
                    <td>{fmtData(u.data)}</td>
                    <td className="font-mono text-xs">{l?.lotto ?? '—'}</td>
                    <td>{TIPI_USCITA.find((t) => t.v === u.tipo)?.l}</td>
                    <td>{u.cliente ?? '—'}</td>
                    <td className="num">{u.forme}</td>
                    <td className="num">{fmt1(u.pesoKg)}</td>
                    <td className="num">{u.prezzoKg ? fmt2(u.prezzoKg) : '—'}</td>
                    <td className="num font-semibold">{u.prezzoKg ? fmtEur(u.pesoKg * u.prezzoKg) : '—'}</td>
                    <td className="whitespace-nowrap text-right">
                      <button className="btn-link mr-3" onClick={() => setUsc(u)}>Modifica</button>
                      <button className="btn-danger-link" onClick={() => conferma('Eliminare questa uscita? Le forme torneranno disponibili in magazzino.') && elimina('uscite', u.id)}>Elimina</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* Modale lavorazione */}
      {lav && (
        <Modale titolo={lav.id ? `Modifica lotto ${lav.lotto}` : 'Nuova lavorazione'} onChiudi={() => setLav(null)}>
          <form onSubmit={salvaLavorazione} className="grid gap-4 sm:grid-cols-2">
            <Campo label="Data di produzione *">
              <input className="input" type="date" required max={oggi} value={lav.data}
                onChange={(e) => {
                  const data = e.target.value
                  // il codice lotto segue la data, se non è stato personalizzato
                  const automatico = lav.lotto === nuovoCodiceLotto(lav.data, lavorazioni, lav.id) || !lav.lotto
                  setLav({ ...lav, data, lotto: automatico && data ? nuovoCodiceLotto(data, lavorazioni, lav.id) : lav.lotto })
                }} />
            </Campo>
            <Campo label="Codice lotto *"><input className="input font-mono" required value={lav.lotto} onChange={(e) => setLav({ ...lav, lotto: e.target.value.toUpperCase() })} /></Campo>
            <Campo label="Latte lavorato (litri) *"><input className="input" type="number" min={1} required value={lav.litriLatte || ''} onChange={(e) => setLav({ ...lav, litriLatte: Number(e.target.value) })} /></Campo>
            <Campo label="Forme prodotte *"><input className="input" type="number" min={1} required value={lav.formeProdotte || ''} onChange={(e) => setLav({ ...lav, formeProdotte: Number(e.target.value) })} /></Campo>
            <Campo label="Peso fresco totale (kg) *"><input className="input" type="number" min={0.1} step="0.1" required value={lav.pesoFrescoKg || ''} onChange={(e) => setLav({ ...lav, pesoFrescoKg: Number(e.target.value) })} /></Campo>
            <Campo label="Stagionatura minima">
              <select className="input" value={lav.stagionaturaGiorni} onChange={(e) => setLav({ ...lav, stagionaturaGiorni: Number(e.target.value) })}>
                {[...new Set([...STAGIONATURE, lav.stagionaturaGiorni])].sort((a, b) => a - b).map((g) => <option key={g} value={g}>{g} giorni</option>)}
              </select>
            </Campo>
            <Campo label="Note" className="sm:col-span-2"><textarea className="input" value={lav.note ?? ''} onChange={(e) => setLav({ ...lav, note: e.target.value })} /></Campo>
            {lav.litriLatte > 0 && lav.pesoFrescoKg > 0 && (
              <p className="rounded-md bg-stone-50 p-3 text-sm text-stone-600 sm:col-span-2">
                Resa <b>{fmt1(resa(lav))} kg/100 l</b>
                {lav.formeProdotte > 0 && <> · peso medio <b>{fmt2(pesoMedioForma(lav))} kg</b>/forma</>}
                {lav.data && <> · pronto dal <b>{fmtData(dataPronta(lav))}</b></>}
              </p>
            )}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setLav(null)}>Annulla</button>
              <button className="btn-primary">Salva</button>
            </div>
          </form>
        </Modale>
      )}

      {/* Modale uscita */}
      {usc && (
        <Modale titolo={usc.id ? 'Modifica uscita' : 'Registra uscita dal magazzino'} onChiudi={() => setUsc(null)}>
          <form onSubmit={salvaUscita} className="grid gap-4 sm:grid-cols-2">
            <Campo label="Lotto *" className="sm:col-span-2">
              <select className="input" required value={usc.lavorazioneId} onChange={(e) => setUsc({ ...usc, lavorazioneId: e.target.value })}>
                <option value="">— scegli —</option>
                {conStato
                  .filter((x) => x.disp > 0 || x.l.id === usc.lavorazioneId)
                  .map(({ l, stato, disp }) => (
                    <option key={l.id} value={l.id}>{l.lotto} · {disp} forme · {stato}</option>
                  ))}
              </select>
            </Campo>
            {lottoUscita && dataPronta(lottoUscita) > usc.data && (
              <p className="rounded-md bg-arancio-50 p-3 text-sm text-arancio-800 sm:col-span-2">
                ⚠ Questo lotto completa la stagionatura minima il {fmtData(dataPronta(lottoUscita))}.
              </p>
            )}
            <Campo label="Data *"><input className="input" type="date" required value={usc.data} onChange={(e) => setUsc({ ...usc, data: e.target.value })} /></Campo>
            <Campo label="Tipo">
              <select className="input" value={usc.tipo} onChange={(e) => setUsc({ ...usc, tipo: e.target.value as TipoUscita })}>
                {TIPI_USCITA.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </Campo>
            <Campo label={`Forme * (max ${maxForme})`}><input className="input" type="number" min={1} max={maxForme || undefined} required value={usc.forme || ''} onChange={(e) => setUsc({ ...usc, forme: Number(e.target.value) })} /></Campo>
            <Campo label="Peso effettivo (kg) *"><input className="input" type="number" min={0.1} step="0.1" required value={usc.pesoKg || ''} onChange={(e) => setUsc({ ...usc, pesoKg: Number(e.target.value) })} /></Campo>
            {usc.tipo !== 'scarto' && (
              <Campo label="Cliente" className={usc.tipo === 'vendita' ? '' : 'sm:col-span-2'}>
                <input className="input" list="clienti-caseificio" value={usc.cliente ?? ''} onChange={(e) => setUsc({ ...usc, cliente: e.target.value })} />
                <datalist id="clienti-caseificio">{clienti.map((c) => <option key={c} value={c} />)}</datalist>
              </Campo>
            )}
            {usc.tipo === 'vendita' && (
              <Campo label="Prezzo (€/kg) *"><input className="input" type="number" min={0} step="0.01" required value={usc.prezzoKg ?? ''} onChange={(e) => setUsc({ ...usc, prezzoKg: Number(e.target.value) })} /></Campo>
            )}
            {lottoUscita && usc.forme > 0 && usc.pesoKg > 0 && (
              <p className="rounded-md bg-stone-50 p-3 text-sm text-stone-600 sm:col-span-2">
                Peso medio all'uscita <b>{fmt2(usc.pesoKg / usc.forme)} kg</b>
                {' '}(calo di stagionatura {fmt1((1 - usc.pesoKg / usc.forme / pesoMedioForma(lottoUscita)) * 100)}%)
                {usc.tipo === 'vendita' && usc.prezzoKg ? <> · importo <b>{fmtEur(usc.pesoKg * usc.prezzoKg)}</b></> : null}
              </p>
            )}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setUsc(null)}>Annulla</button>
              <button className="btn-primary">Salva</button>
            </div>
          </form>
        </Modale>
      )}

      {/* Scheda lotto / tracciabilità */}
      {dettaglio && (() => {
        const l = dettaglio
        const giorno = perGiorno(dati.mungiture.filter((m) => m.data === l.data)).get(l.data)
        const an = analisiDiRiferimento(dati.analisi, l.data)
        const usciteLotto = usciteDel(l, uscite).sort((a, b) => a.data.localeCompare(b.data))
        const disp = formeDisponibili(l, uscite)
        return (
          <Modale titolo={`Scheda lotto ${l.lotto}`} onChiudi={() => setDettaglio(null)}>
            <div className="space-y-5 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <BadgeStato stato={statoLotto(l, uscite, oggi)} />
                <span className="text-stone-500">Caciocavallo · stagionatura minima {l.stagionaturaGiorni} giorni</span>
              </div>
              <section>
                <h3 className="mb-2 font-semibold text-brand-800">Produzione</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <dt className="text-stone-500">Data</dt><dd>{fmtData(l.data)}</dd>
                  <dt className="text-stone-500">Latte lavorato</dt><dd>{fmt0(l.litriLatte)} l</dd>
                  <dt className="text-stone-500">Forme</dt><dd>{l.formeProdotte} ({fmt1(l.pesoFrescoKg)} kg, media {fmt2(pesoMedioForma(l))} kg)</dd>
                  <dt className="text-stone-500">Resa</dt><dd>{fmt1(resa(l))} kg/100 l</dd>
                  <dt className="text-stone-500">Pronto dal</dt><dd>{fmtData(dataPronta(l))}</dd>
                  <dt className="text-stone-500">In magazzino</dt><dd>{disp} forme</dd>
                </dl>
                {l.note && <p className="mt-2 text-stone-600">Note: {l.note}</p>}
              </section>
              <section>
                <h3 className="mb-2 font-semibold text-brand-800">Latte di origine</h3>
                <p>
                  {giorno
                    ? <>Mungiture del {fmtData(l.data)}: <b>{fmt0(giorno.litri)} l</b> da {giorno.capi} capi ({giorno.turni} turni). Usato in caseificio: {fmt0((l.litriLatte / giorno.litri) * 100)}%.</>
                    : <span className="text-stone-500">Nessuna mungitura registrata il {fmtData(l.data)}.</span>}
                </p>
                {an ? (
                  <p className="mt-2 flex flex-wrap items-center gap-2">
                    Analisi di riferimento del {fmtData(an.data)}: grasso {fmt2(an.grasso)}%, proteine {fmt2(an.proteine)}%,
                    cellule {fmt0(an.cellule * 1000)}/ml, CBT {fmt0(an.caricaBatterica * 1000)} UFC/ml <BadgeEsito esito={esitoAnalisi(an)} />
                  </p>
                ) : <p className="mt-2 text-stone-500">Nessuna analisi del latte precedente alla lavorazione.</p>}
              </section>
              <section>
                <h3 className="mb-2 font-semibold text-brand-800">Destinazione delle forme</h3>
                {usciteLotto.length === 0 ? <p className="text-stone-500">Nessuna uscita registrata.</p> : (
                  <ul className="divide-y divide-stone-100">
                    {usciteLotto.map((u) => (
                      <li key={u.id} className="flex justify-between gap-2 py-1.5">
                        <span>{fmtData(u.data)} · {TIPI_USCITA.find((t) => t.v === u.tipo)?.l}{u.cliente && ` · ${u.cliente}`}</span>
                        <span className="tabular-nums">{u.forme} forme · {fmt1(u.pesoKg)} kg</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <div className="flex justify-end gap-2">
                {disp > 0 && <button className="btn-secondary" onClick={() => { setDettaglio(null); setUsc(nuovaUscita(l)) }}>Registra uscita</button>}
                <button className="btn-primary" onClick={() => setDettaglio(null)}>Chiudi</button>
              </div>
            </div>
          </Modale>
        )
      })()}
    </>
  )
}
