import { Link } from 'react-router-dom'
import { AZIENDA, PRODOTTI, VALORI } from '../config/azienda'
import SezioneRobot from './SezioneRobot'

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 text-white">
        <svg className="absolute -bottom-px left-0 w-full text-crema-50" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
          <path fill="currentColor" d="M0 50c240 30 480 30 720 0s480-30 720 0v30H0z" />
        </svg>
        <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-20 sm:pt-28">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-arancio-300">{AZIENDA.nome} · dal {AZIENDA.fondazione}</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight sm:text-5xl">
            Il caciocavallo di Castelfranco in Miscano, <span className="text-arancio-400">dal latte della nostra stalla</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-brand-100">
            Una tradizione di famiglia che dal {AZIENDA.fondazione} unisce l'allevamento delle bovine da latte e l'arte casearia della pasta filata.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/prodotti" className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-brand-800 shadow hover:bg-crema-100">I nostri prodotti</Link>
            <Link to="/contatti" className="rounded-md border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Contattaci</Link>
          </div>
        </div>
      </section>

      {/* Valori */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-serif text-3xl font-bold text-brand-900">Perché i nostri prodotti</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALORI.map((v) => (
            <div key={v.titolo} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
              <div className="mb-3 h-1 w-10 rounded bg-arancio-500" />
              <h3 className="font-semibold text-stone-900">{v.titolo}</h3>
              <p className="mt-2 text-sm text-stone-600">{v.testo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mungitura robotizzata */}
      <SezioneRobot />

      {/* Filiera */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-serif text-3xl font-bold text-brand-900">Dalla stalla alla tavola</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              ['Allevamento', 'Le nostre bovine da latte, accudite ogni giorno in stalla.'],
              ['Mungitura robotizzata', 'Ogni vacca si fa mungere quando vuole; il latte viene subito refrigerato.'],
              ['Filatura', 'La cagliata viene filata a caldo e modellata a mano nella tipica forma.'],
              ['Stagionatura', 'Le forme riposano appese, a coppie, fino alla giusta maturazione.'],
            ].map(([t, d], i) => (
              <li key={t} className="relative rounded-xl border border-stone-200 p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-arancio-500 font-bold text-brand-900">{i + 1}</span>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-stone-600">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Prodotti in breve */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-serif text-3xl font-bold text-brand-900">I nostri prodotti</h2>
          <Link to="/prodotti" className="btn-link">Vedi tutti →</Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PRODOTTI.map((p) => (
            <div key={p.nome} className={`rounded-xl bg-white p-6 shadow-sm ring-1 ${p.inEvidenza ? 'ring-2 ring-arancio-400' : 'ring-stone-200'}`}>
              <h3 className="font-semibold text-stone-900">{p.nome}</h3>
              <p className="mt-2 text-sm text-stone-600">{p.descrizione}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto mb-16 max-w-6xl px-4">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-crema-200 p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif text-2xl font-bold text-brand-900">Vuoi assaggiare il nostro caciocavallo o visitare l'azienda?</h2>
            <p className="mt-1 text-stone-700">Scrivici: ti risponderemo al più presto.</p>
          </div>
          <Link to="/contatti" className="btn-primary px-6 py-3">Scrivici</Link>
        </div>
      </section>
    </>
  )
}
