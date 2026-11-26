import { RotateCcw } from 'lucide-react'
import { ricominciaDemo, scegliScenario, scenarioDemo, type Scenario } from '../lib/demo'

const SCENARI: { id: Scenario; nome: string }[] = [
  { id: 'robot', nome: 'Stalla con robot' },
  { id: 'sala', nome: 'Stalla con sala di mungitura' },
]

/** Barra della versione dimostrativa: scelta della stalla di esempio e ritorno ai dati iniziali. */
export default function DemoBar() {
  const attuale = scenarioDemo()
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
      <span className="text-sm text-amber-900"><b>Demo</b> con dati inventati: prova tutto, niente si rompe.</span>
      <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 ring-1 ring-amber-200" role="tablist" aria-label="Stalla di esempio">
        {SCENARI.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={attuale === s.id} onClick={() => attuale !== s.id && scegliScenario(s.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${attuale === s.id ? 'bg-amber-400 text-stone-900' : 'text-stone-600 hover:bg-amber-100'}`}>{s.nome}</button>
        ))}
      </div>
      <button type="button" onClick={ricominciaDemo} className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-amber-900 hover:underline">
        <RotateCcw className="h-4 w-4" />Ricomincia
      </button>
    </div>
  )
}
