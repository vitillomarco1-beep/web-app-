import { AZIENDA, BENEFICI_ROBOT, ROBOT, VALORI } from '../config/azienda'

export default function AziendaPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Chi siamo</p>
      <h1 className="mt-2 font-serif text-4xl font-bold text-brand-900">{AZIENDA.nome}</h1>

      <p className="mt-2 text-lg font-medium text-arancio-700">{AZIENDA.slogan}</p>

      {/* Testo generico: integrare con la storia reale della famiglia */}
      <div className="mt-8 space-y-5 text-lg leading-relaxed text-stone-700">
        <p>
          Dal {AZIENDA.fondazione} la famiglia Marcantonio produce caciocavallo a Castelfranco in Miscano, nel Sannio.
          Un sapere tramandato di generazione in generazione, che parte dalla stalla e arriva fino alla stagionatura delle forme.
        </p>
        <p>
          Alleviamo le nostre bovine da latte con cura e attenzione: un buon formaggio nasce da animali sani e sereni,
          da un'alimentazione di qualità e dal controllo costante del latte che ogni giorno viene munto e lavorato.
        </p>
      </div>

      <h2 className="mt-14 font-serif text-2xl font-bold text-brand-900">L'allevamento e la tradizione</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {VALORI.map((v) => (
          <div key={v.titolo} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <h3 className="font-semibold">{v.titolo}</h3>
            <p className="mt-2 text-sm text-stone-600">{v.testo}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-14 font-serif text-2xl font-bold text-brand-900">La mungitura robotizzata</h2>
      <p className="mt-4 text-stone-700">
        Le nostre vacche vengono munte da {ROBOT.totale} robot ({ROBOT.descrizione}). Sono loro a decidere quando farsi mungere,
        mentre a ogni mungitura i sensori controllano il latte e la salute di ciascun animale.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {BENEFICI_ROBOT.map((b) => (
          <li key={b.titolo} className="rounded-lg border border-stone-200 bg-white p-4">
            <span className="font-semibold">{b.titolo}</span>
            <span className="block text-sm text-stone-600">{b.testo}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-14 font-serif text-2xl font-bold text-brand-900">Qualità e controlli</h2>
      <p className="mt-4 text-stone-700">
        Il latte viene analizzato periodicamente da laboratori accreditati. Monitoriamo in particolare:
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          ['Grasso e proteine', 'indicatori del valore nutritivo e della resa casearia'],
          ['Cellule somatiche', 'indicatore della salute della mammella'],
          ['Carica batterica', "indicatore dell'igiene di mungitura e conservazione"],
          ['Sostanze inibenti', 'garanzia di assenza di residui di farmaci'],
        ].map(([t, d]) => (
          <li key={t} className="rounded-lg border border-stone-200 bg-white p-4">
            <span className="font-semibold">{t}</span>
            <span className="block text-sm text-stone-600">{d}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
