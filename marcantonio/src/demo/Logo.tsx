import { NOME_DEMO } from '../lib/demo'

/** Logo neutro della versione dimostrativa. */
export default function Logo({ altezza = 'h-12', suScuro = false }: { altezza?: string; suScuro?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${altezza} ${suScuro ? 'text-white' : 'text-brand-900'}`}>
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-400 text-sm font-black text-stone-900">GS</span>
      <span className="font-serif text-lg font-bold leading-tight">{NOME_DEMO}</span>
    </span>
  )
}
