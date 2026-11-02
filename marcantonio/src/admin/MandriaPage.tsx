import { useMemo, useState } from 'react'
import { Pencil, Search, Upload, X, Tag } from 'lucide-react'
import { useStore } from '../lib/store'
import type { AnimaleDC } from '../lib/types'
import { PageHeader, StatTile, Vuoto } from '../components/ui'
import ImportDairyComp from '../components/ImportDairyComp'
import { categoria, etichettaColonna, nomeAutomaticoGruppo, perGruppo, riepilogo, inLattazione } from '../lib/dairycomp'
import { applicaGruppiRobot } from '../lib/gruppi'
import { fmt0, fmtData } from '../lib/format'

type Ordine = { col: string; giu: boolean }

/** Mandria: tutti gli animali presenti secondo l'ultima lista completa di DairyComp, divisi per gruppo. */
export default function MandriaPage() {
  const { dati, imposta } = useStore()
  const lista = dati.mandriaDC[0]
  const [importa, setImporta] = useState(false)
  const [gruppo, setGruppo] = useState<string | null>(null)
  const [cerca, setCerca] = useState('')
  const [ordine, setOrdine] = useState<Ordine>({ col: 'id', giu: false })
  const [rinomina, setRinomina] = useState<string | null>(null)
  const [testoNome, setTestoNome] = useState('')

  const animali = useMemo(() => lista?.animali ?? [], [lista])
  const gruppi = useMemo(() => perGruppo(animali), [animali])

  if (!lista) {
    return (
      <>
        <PageHeader titolo="Mandria" icona={Tag} descrizione="Tutti gli animali presenti, divisi per gruppo" />
        <Vuoto>
          <p>Carica la lista completa di DairyComp (tutti i gruppi) per vedere la mandria.</p>
          <button className="btn-primary mt-4" onClick={() => setImporta(true)}><Upload className="h-4 w-4" />Importa da DairyComp</button>
        </Vuoto>
        {importa && <ImportDairyComp destinazione="mandria" onChiudi={() => setImporta(false)} onImportato={() => setImporta(false)} />}
      </>
    )
  }

  const stallaDi = (g: number | null) => dati.stalle.find((s) => s.gruppoDairyComp !== undefined && s.gruppoDairyComp === g)
  const nomeGruppo = (g: number | null, a: AnimaleDC[]) =>
    dati.nomiGruppi.find((x) => x.id === String(g))?.nome || nomeAutomaticoGruppo(a, stallaDi(g)?.numero)
  const salvaNome = (g: string) => {
    const altri = dati.nomiGruppi.filter((x) => x.id !== g)
    imposta('nomiGruppi', testoNome.trim() ? [...altri, { id: g, nome: testoNome.trim() }] : altri)
    setRinomina(null)
  }

  // vacche munte dal robot di un altro gruppo (stesso controllo della sezione Latte)
  const incoerenze = new Map(applicaGruppiRobot(animali, dati.robotVacche, dati.robotGiorni, dati.stalle, lista.data).incoerenze.map((x) => [x.vacca, x]))

  // riepilogo per categoria
  const perCategoria = animali.reduce((m, a) => m.set(categoria(a), (m.get(categoria(a)) ?? 0) + 1), new Map<string, number>())
  const manze = (perCategoria.get('Manze') ?? 0) + (perCategoria.get('Manze in riproduzione') ?? 0)

  // colonne da mostrare: campi riconosciuti presenti + tutte le altre colonne del file
  const presente = (k: keyof AnimaleDC) => animali.some((a) => a[k] !== null && a[k] !== undefined)
  const extra = [...new Set(animali.flatMap((a) => Object.keys(a.extra ?? {})))]
  const colonne: { col: string; label: string; num: boolean }[] = [
    { col: 'id', label: 'Animale', num: false },
    ...(presente('lattazione') ? [{ col: 'lattazione', label: 'Latt.', num: true }] : []),
    ...(presente('dim') ? [{ col: 'dim', label: 'Giorni latt.', num: true }] : []),
    ...(presente('codiceRiproduttivo') ? [{ col: 'codiceRiproduttivo', label: 'Stato rip.', num: false }] : []),
    ...(presente('giorniGravidanza') ? [{ col: 'giorniGravidanza', label: 'Giorni grav.', num: true }] : []),
    ...(presente('latte') ? [{ col: 'latte', label: 'Latte kg', num: true }] : []),
    ...extra.map((k) => ({ col: k, label: etichettaColonna(k), num: animali.some((a) => typeof a.extra?.[k] === 'number') })),
  ]
  const valore = (a: AnimaleDC, col: string): string | number | null => {
    if (col in a && col !== 'extra') return (a as unknown as Record<string, string | number | null>)[col] ?? null
    return a.extra?.[col] ?? null
  }

  const ricerca = cerca.trim().toLowerCase()
  const selezionati = ricerca
    ? animali.filter((a) => a.id.toLowerCase().includes(ricerca) || String(a.extra?.MATR ?? '').toLowerCase().includes(ricerca))
    : gruppo !== null ? animali.filter((a) => String(a.gruppo) === gruppo) : []
  const ordinati = [...selezionati].sort((a, b) => {
    const x = valore(a, ordine.col), y = valore(b, ordine.col)
    if (x === null) return 1
    if (y === null) return -1
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'it', { numeric: true })
    return ordine.giu ? -c : c
  })
  const gruppoSel = gruppo !== null ? gruppi.find(([g]) => String(g) === gruppo) : undefined
  const latt = gruppoSel ? gruppoSel[1].filter(inLattazione) : []
  const rLatt = latt.length ? riepilogo(latt) : null

  return (
    <>
      <PageHeader titolo="Mandria" icona={Tag} descrizione={`Tutti gli animali presenti · lista DairyComp del ${fmtData(lista.data)}`}
        azioni={<button className="btn-primary" onClick={() => setImporta(true)}><Upload className="h-4 w-4" />Importa da DairyComp</button>} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatTile etichetta="Animali presenti" valore={fmt0(animali.length)} unita="capi" nota={`${gruppi.length} gruppi`} />
        <StatTile etichetta="In lattazione" valore={fmt0(perCategoria.get('In lattazione') ?? 0)} unita="vacche" />
        <StatTile etichetta="Asciutte" valore={fmt0(perCategoria.get('Asciutte') ?? 0)} unita="vacche" />
        <StatTile etichetta="Manze" valore={fmt0(manze)} unita="capi" nota={perCategoria.get('Manze in riproduzione') ? `${perCategoria.get('Manze in riproduzione')} fecondate o gravide` : undefined} />
        <StatTile etichetta="Maschi" valore={fmt0(perCategoria.get('Maschi') ?? 0)} unita="capi" />
      </div>

      {/* Ricerca */}
      <div className="relative mt-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input className="input pl-9" placeholder="Cerca un animale (numero o matricola) in tutti i gruppi…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        {cerca && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700" onClick={() => setCerca('')} aria-label="Cancella ricerca"><X className="h-4 w-4" /></button>}
      </div>

      {/* Pulsanti dei gruppi */}
      {!ricerca && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {gruppi.map(([g, a]) => {
            const sel = gruppo === String(g)
            const st = stallaDi(g)
            const stati = [...a.reduce((m, x) => m.set(x.codiceRiproduttivo ?? '—', (m.get(x.codiceRiproduttivo ?? '—') ?? 0) + 1), new Map<string, number>())].sort((x, y) => y[1] - x[1]).slice(0, 3)
            return (
              <button key={String(g)} onClick={() => setGruppo(sel ? null : String(g))}
                className={`rounded-2xl p-4 text-left transition ${sel ? 'bg-brand-700 text-white shadow-lg' : 'bg-white ring-1 ring-stone-200 hover:ring-brand-300'}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${sel ? 'text-brand-100' : 'text-stone-500'}`}>Gruppo {g ?? '—'}</span>
                  {st && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sel ? 'bg-white/20' : 'bg-arancio-100 text-arancio-800'}`}>Stalla {st.numero}</span>}
                </div>
                <div className="mt-1 font-serif text-3xl font-bold">{a.length}</div>
                <div className={`mt-0.5 line-clamp-2 text-sm font-medium ${sel ? 'text-white' : 'text-stone-800'}`}>{nomeGruppo(g, a)}</div>
                <div className={`mt-1 text-[11px] ${sel ? 'text-brand-100' : 'text-stone-500'}`}>{stati.map(([s, n]) => `${n} ${s.toLowerCase()}`).join(' · ')}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* Elenco del gruppo scelto o della ricerca */}
      {(ricerca || gruppoSel) ? (
        <section className="card mt-6 overflow-x-auto p-0">
          <div className="flex flex-wrap items-center gap-3 p-5 pb-3">
            {ricerca ? (
              <h2 className="font-semibold">Risultati della ricerca <span className="font-normal text-stone-500">({ordinati.length})</span></h2>
            ) : gruppoSel && (
              <>
                {rinomina === gruppo ? (
                  <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); salvaNome(gruppo!) }}>
                    <input className="input w-64" autoFocus value={testoNome} onChange={(e) => setTestoNome(e.target.value)} placeholder={nomeAutomaticoGruppo(gruppoSel[1], stallaDi(gruppoSel[0])?.numero)} />
                    <button className="btn-primary px-3 py-2">Salva</button>
                    <button type="button" className="btn-secondary px-3 py-2" onClick={() => setRinomina(null)}>Annulla</button>
                  </form>
                ) : (
                  <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-brand-900">
                    Gruppo {gruppoSel[0] ?? '—'} · {nomeGruppo(gruppoSel[0], gruppoSel[1])}
                    <button className="text-stone-400 hover:text-brand-700" title="Rinomina il gruppo" aria-label="Rinomina il gruppo"
                      onClick={() => { setRinomina(gruppo); setTestoNome(dati.nomiGruppi.find((x) => x.id === gruppo)?.nome ?? '') }}>
                      <Pencil className="h-4 w-4" />
                    </button>
                  </h2>
                )}
                <span className="text-sm text-stone-500">
                  {gruppoSel[1].length} capi
                  {rLatt && <> · {latt.length} in lattazione · DIM medio {rLatt.dimMedio !== null ? fmt0(rLatt.dimMedio) : '—'}{rLatt.lattazioneMedia !== null && <> · {fmt0((rLatt.primipare / latt.length) * 100)}% primipare</>}</>}
                </span>
                <button className="btn-link ml-auto" onClick={() => setGruppo(null)}>Chiudi</button>
              </>
            )}
          </div>
          <table className="table">
            <thead>
              <tr>
                {colonne.map((c) => (
                  <th key={c.col} className={c.num ? 'num' : ''}>
                    <button className="uppercase hover:text-stone-800" onClick={() => setOrdine({ col: c.col, giu: ordine.col === c.col ? !ordine.giu : c.num })}>
                      {c.label}{ordine.col === c.col ? (ordine.giu ? ' ↓' : ' ↑') : ''}
                    </button>
                  </th>
                ))}
                {ricerca && <th>Gruppo</th>}
                <th>Categoria</th>
              </tr>
            </thead>
            <tbody>
              {ordinati.slice(0, 500).map((a) => {
                const inc = incoerenze.get(a.id)
                return (
                  <tr key={a.id}>
                    {colonne.map((c) => {
                      const v = valore(a, c.col)
                      return (
                        <td key={c.col} className={c.num ? 'num' : c.col === 'id' ? 'font-semibold' : 'whitespace-nowrap'}>
                          {v === null || v === '' ? '—' : v}
                          {c.col === 'id' && inc && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200" title="Munta dal robot di un altro gruppo: da sistemare in DairyComp">munta al gr. {inc.gruppoRobot}</span>}
                        </td>
                      )
                    })}
                    {ricerca && <td>{a.gruppo ?? '—'}</td>}
                    <td className="whitespace-nowrap text-xs text-stone-500">{categoria(a)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {ordinati.length === 0 && <p className="p-5 text-sm text-stone-500">Nessun animale trovato.</p>}
        </section>
      ) : (
        <p className="mt-6 text-sm text-stone-500">Tocca un gruppo per vedere i suoi animali.</p>
      )}

      {importa && <ImportDairyComp destinazione="mandria" onChiudi={() => setImporta(false)} onImportato={() => setImporta(false)} />}
    </>
  )
}
