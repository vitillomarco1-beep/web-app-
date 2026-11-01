import { Link } from 'react-router-dom'
import { PRODOTTI } from '../config/azienda'

export default function ProdottiPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Prodotti</p>
      <h1 className="mt-2 font-serif text-4xl font-bold text-brand-900">Dalla stalla al caciocavallo</h1>
      <p className="mt-4 max-w-2xl text-lg text-stone-600">
        Alleviamo le nostre vacche e trasformiamo il loro latte in caciocavallo, con la stessa cura in ogni fase.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PRODOTTI.map((p) => (
          <article key={p.nome} className={`flex flex-col rounded-2xl bg-white p-6 shadow-sm ${p.inEvidenza ? 'ring-2 ring-arancio-400' : 'ring-1 ring-stone-200'}`}>
            {p.inEvidenza && <span className="mb-3 self-start rounded-full bg-arancio-100 px-2.5 py-0.5 text-xs font-semibold text-arancio-800">Il nostro prodotto simbolo</span>}
            <h2 className="font-serif text-xl font-bold text-brand-900">{p.nome}</h2>
            <p className="mt-3 flex-1 text-stone-600">{p.descrizione}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {p.dettagli.map((d) => (
                <li key={d} className="flex gap-2"><span className="text-arancio-600">✓</span>{d}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="mt-12 text-center">
        <Link to="/contatti" className="btn-primary px-6 py-3">Richiedi informazioni</Link>
      </div>
    </div>
  )
}
