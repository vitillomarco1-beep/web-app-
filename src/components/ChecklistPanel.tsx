import type { ChecklistItemDef } from '../lib/checklist'
import type { ChecklistAmmissibilita } from '../types'

interface Props {
  items: ChecklistItemDef[]
  value: ChecklistAmmissibilita
  onChange: (value: ChecklistAmmissibilita) => void
}

export default function ChecklistPanel({ items, value, onChange }: Props) {
  const checkedCount = items.filter((i) => value[i.key]).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          Requisiti di ammissibilità e addizionalità (informativo — non modifica il calcolo
          numerico)
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            checkedCount === items.length
              ? 'bg-forest-100 text-forest-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {checkedCount}/{items.length} soddisfatti
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2.5 rounded-md border border-stone-200 p-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-forest-600 focus:ring-forest-500"
              checked={!!value[item.key]}
              onChange={(e) => onChange({ ...value, [item.key]: e.target.checked })}
            />
            <div>
              <p className="text-sm text-stone-800">{item.label}</p>
              <p className="text-xs text-stone-400">{item.riferimento}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
