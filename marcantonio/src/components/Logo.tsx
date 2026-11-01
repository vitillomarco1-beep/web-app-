import logo from '../assets/logo-marcantonio.png'

/**
 * Logo ufficiale Fratelli Marcantonio.
 * Su sfondi scuri (`suScuro`) viene posato su un riquadro chiaro, perché la scritta
 * prugna del marchio non sarebbe leggibile direttamente sul fondo scuro.
 */
export default function Logo({ altezza = 'h-12', suScuro = false }: { altezza?: string; suScuro?: boolean }) {
  const img = <img src={logo} alt="Fratelli Marcantonio – dal 1900 il caciocavallo di Castelfranco in Miscano" className={`${altezza} w-auto`} />
  if (!suScuro) return img
  return <span className="inline-block rounded-lg bg-crema-50 px-3 py-2">{img}</span>
}
