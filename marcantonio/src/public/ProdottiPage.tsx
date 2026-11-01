import { Link } from 'react-router-dom'
import { PRODOTTI } from '../config/azienda'

export default function ProdottiPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-prato-600">Prodotti</p>
      <h1 className="mt-2 font-serif text-4xl font-bold text-prato-900">Il nostro latte</h1>
      <p className="mt-4 max-w-2xl text-lg text-stone-600">
        Produciamo latte bovino per l'industria casearia e per il consumo diretto, con la stessa cura in ogni fase.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PRODOTTI.map((p) => (
          <article key={p.nome} className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <h2 className="font-serif text-xl font-bold text-prato-900">{p.nome}</h2>
            <p className="mt-3 flex-1 text-stone-600">{p.descrizione}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {p.dettagli.map((d) => (
                <li key={d} className="flex gap-2"><span className="text-prato-600">✓</span>{d}</li>
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
