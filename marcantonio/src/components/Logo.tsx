export default function Logo({ chiaro = false }: { chiaro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <circle cx="16" cy="16" r="15" className={chiaro ? 'fill-white' : 'fill-prato-600'} />
        <path d="M11 9h10l-1.5 4v10a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V13z" className={chiaro ? 'fill-prato-600' : 'fill-white'} />
        <path d="M12.5 17h7v6a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2z" className={chiaro ? 'fill-prato-300' : 'fill-crema-200'} />
      </svg>
      <span className={`font-serif text-lg font-bold leading-none ${chiaro ? 'text-white' : 'text-prato-800'}`}>
        Marcantonio
        <span className={`block text-[10px] font-sans font-medium uppercase tracking-[0.2em] ${chiaro ? 'text-prato-100' : 'text-stone-500'}`}>
          Latte bovino
        </span>
      </span>
    </span>
  )
}
