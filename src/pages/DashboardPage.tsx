import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { clientiStore, calcoliStore, gruppiStore, calcoliGruppoStore } from '../lib/storage'
import type { Cliente, Calcolo, Gruppo, CalcoloGruppo } from '../types'
import { formatTCO2, formatDate, TIPO_ATTIVITA_LABEL } from '../lib/format'
import { ATTIVITA_OPZIONI } from '../lib/attivita'

interface VoceRecente {
  id: string
  nomeCalcolo: string
  tipoAttivita: Calcolo['dati']['tipoAttivita']
  createdAt: string
  beneficioNettoTotaleTCO2: number
  titolare: string
  link: string
}

export default function DashboardPage() {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [calcoli, setCalcoli] = useState<Calcolo[]>([])
  const [gruppi, setGruppi] = useState<Gruppo[]>([])
  const [calcoliGruppo, setCalcoliGruppo] = useState<CalcoloGruppo[]>([])

  useEffect(() => {
    setClienti(clientiStore.all())
    setCalcoli(calcoliStore.all())
    setGruppi(gruppiStore.all())
    setCalcoliGruppo(calcoliGruppoStore.all())
  }, [])

  const tuttiICalcoli = [...calcoli, ...calcoliGruppo]
  const totaleCrediti = tuttiICalcoli.reduce(
    (sum, c) => sum + c.risultato.beneficioNettoTotaleTCO2,
    0,
  )

  const voci: VoceRecente[] = [
    ...calcoli.map((c) => ({
      id: c.id,
      nomeCalcolo: c.dati.nomeCalcolo,
      tipoAttivita: c.dati.tipoAttivita,
      createdAt: c.createdAt,
      beneficioNettoTotaleTCO2: c.risultato.beneficioNettoTotaleTCO2,
      titolare: clienti.find((cl) => cl.id === c.clientId)?.ragioneSociale ?? 'Cliente eliminato',
      link: `/clienti/${c.clientId}/calcoli/${c.id}`,
    })),
    ...calcoliGruppo.map((c) => ({
      id: c.id,
      nomeCalcolo: c.dati.nomeCalcolo,
      tipoAttivita: c.dati.tipoAttivita,
      createdAt: c.createdAt,
      beneficioNettoTotaleTCO2: c.risultato.beneficioNettoTotaleTCO2,
      titolare: `👥 ${gruppi.find((g) => g.id === c.gruppoId)?.nome ?? 'Gruppo eliminato'}`,
      link: `/gruppi/${c.gruppoId}/calcoli/${c.id}`,
    })),
  ]
  const ultimiCalcoli = voci.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Panoramica</h1>
        <p className="mt-1 text-sm text-stone-500">
          Calcola il bilancio dei crediti di carbonio dei tuoi clienti secondo le metodologie di
          certificazione del regolamento delegato che integra il regolamento (UE) 2024/3012.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-stone-900">Ambiti di riferimento</h2>
        <p className="mt-1 text-sm text-stone-500">
          Le tre metodologie di certificazione su cui si basa il calcolatore (calcoli singoli e di
          gruppo).
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ATTIVITA_OPZIONI.map((opt) => {
            const calcoliAmbito = tuttiICalcoli.filter((c) => c.dati.tipoAttivita === opt.tipo)
            const creditiAmbito = calcoliAmbito.reduce(
              (s, c) => s + c.risultato.beneficioNettoTotaleTCO2,
              0,
            )
            return (
              <div key={opt.tipo} className="card">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{opt.icona}</span>
                  {opt.inPreparazione && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      In preparazione
                    </span>
                  )}
                </div>
                <p className="mt-3 font-semibold text-stone-900">{opt.titolo}</p>
                <p className="mt-1 text-sm text-stone-500">{opt.descrizione}</p>
                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-sm">
                  <span className="text-stone-500">{calcoliAmbito.length} calcoli</span>
                  {opt.inPreparazione ? (
                    <span className="text-stone-400">Calcolo non ancora attivo</span>
                  ) : (
                    <span className="font-semibold text-forest-700">
                      {formatTCO2(creditiAmbito)} t CO₂eq
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm text-stone-500">Clienti gestiti</p>
          <p className="mt-1 text-3xl font-bold text-stone-900">{clienti.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-stone-500">Gruppi di gestori</p>
          <p className="mt-1 text-3xl font-bold text-stone-900">{gruppi.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-stone-500">Calcoli effettuati</p>
          <p className="mt-1 text-3xl font-bold text-stone-900">{tuttiICalcoli.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-stone-500">Crediti netti totali stimati</p>
          <p className="mt-1 text-3xl font-bold text-forest-700">
            {formatTCO2(totaleCrediti)} <span className="text-base font-medium">t CO₂eq</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">Calcoli recenti</h2>
        <Link to="/clienti" className="btn-primary">
          + Nuovo calcolo
        </Link>
      </div>

      {ultimiCalcoli.length === 0 ? (
        <div className="card text-center text-sm text-stone-500">
          Nessun calcolo effettuato finora. Inizia creando un cliente e il suo primo calcolo.
        </div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Cliente / Gruppo</th>
                <th className="px-4 py-3">Calcolo</th>
                <th className="px-4 py-3">Tipo attività</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Beneficio netto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {ultimiCalcoli.map((v) => (
                <tr key={v.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-700">{v.titolare}</td>
                  <td className="px-4 py-3">
                    <Link to={v.link} className="hover:underline">
                      {v.nomeCalcolo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {TIPO_ATTIVITA_LABEL[v.tipoAttivita]}
                  </td>
                  <td className="px-4 py-3 text-stone-500">{formatDate(v.createdAt)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-forest-700">
                    {formatTCO2(v.beneficioNettoTotaleTCO2)} t CO₂eq
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
