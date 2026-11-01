import { AZIENDA, VALORI } from '../config/azienda'

export default function AziendaPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-prato-600">Chi siamo</p>
      <h1 className="mt-2 font-serif text-4xl font-bold text-prato-900">{AZIENDA.nome}</h1>

      {/* Testo segnaposto: sostituire con la storia reale dell'azienda */}
      <div className="mt-8 space-y-5 text-lg leading-relaxed text-stone-700">
        <p>
          Siamo un'azienda agricola a conduzione familiare specializzata nell'allevamento di bovine da latte.
          Ogni giorno ci prendiamo cura della nostra mandria con passione, esperienza e attenzione ai dettagli.
        </p>
        <p>
          Crediamo che un latte buono nasca da animali sani e sereni: per questo investiamo in stalle confortevoli,
          alimentazione di qualità e nel monitoraggio costante della salute di ogni capo.
        </p>
      </div>

      <h2 className="mt-14 font-serif text-2xl font-bold text-prato-900">L'allevamento</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {VALORI.map((v) => (
          <div key={v.titolo} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <h3 className="font-semibold">{v.titolo}</h3>
            <p className="mt-2 text-sm text-stone-600">{v.testo}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-14 font-serif text-2xl font-bold text-prato-900">Qualità e controlli</h2>
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
