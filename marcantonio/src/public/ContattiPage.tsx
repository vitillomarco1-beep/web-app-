import { useState, type FormEvent } from 'react'
import { AZIENDA } from '../config/azienda'
import { useStore } from '../lib/store'
import { nuovoId } from '../lib/format'

const VUOTO = { nome: '', email: '', telefono: '', oggetto: 'Informazioni', testo: '' }

export default function ContattiPage() {
  const { aggiungi } = useStore()
  const [form, setForm] = useState(VUOTO)
  const [inviato, setInviato] = useState(false)
  const set = (k: keyof typeof VUOTO) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  const invia = (e: FormEvent) => {
    e.preventDefault()
    // Il messaggio viene salvato nell'area riservata → Messaggi.
    aggiungi('messaggi', { id: nuovoId(), data: new Date().toISOString(), letto: false, ...form })
    setForm(VUOTO)
    setInviato(true)
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Contatti</p>
        <h1 className="mt-2 font-serif text-4xl font-bold text-brand-900">Parliamone</h1>
        <p className="mt-4 text-stone-600">Per ordini di caciocavallo, forniture, vendita diretta, visite in azienda o qualsiasi altra richiesta.</p>
        <dl className="mt-8 space-y-4 text-sm">
          <div><dt className="font-semibold">Indirizzo</dt><dd className="text-stone-600">{AZIENDA.indirizzo}</dd></div>
          <div><dt className="font-semibold">Telefono</dt><dd><a className="text-brand-700 hover:underline" href={`tel:${AZIENDA.telefono.replace(/\s/g, '')}`}>{AZIENDA.telefono}</a></dd></div>
          <div><dt className="font-semibold">Email</dt><dd><a className="text-brand-700 hover:underline" href={`mailto:${AZIENDA.email}`}>{AZIENDA.email}</a></dd></div>
          <div><dt className="font-semibold">Orari</dt><dd className="text-stone-600">{AZIENDA.orari}</dd></div>
        </dl>
      </div>

      <div className="card lg:col-span-3">
        {inviato ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-700">✓</div>
            <h2 className="mt-4 text-xl font-semibold">Messaggio inviato</h2>
            <p className="mt-2 text-stone-600">Grazie! Ti risponderemo al più presto.</p>
            <button className="btn-secondary mt-6" onClick={() => setInviato(false)}>Invia un altro messaggio</button>
          </div>
        ) : (
          <form onSubmit={invia} className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">Nome e cognome *</span><input className="input" required value={form.nome} onChange={set('nome')} /></label>
            <label className="block"><span className="label">Email *</span><input className="input" type="email" required value={form.email} onChange={set('email')} /></label>
            <label className="block"><span className="label">Telefono</span><input className="input" type="tel" value={form.telefono} onChange={set('telefono')} /></label>
            <label className="block"><span className="label">Oggetto</span>
              <select className="input" value={form.oggetto} onChange={set('oggetto')}>
                {['Informazioni', 'Ordine caciocavallo', 'Vendita diretta', 'Fornitura per negozi/ristoranti', 'Visita in azienda', 'Altro'].map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2"><span className="label">Messaggio *</span><textarea className="input min-h-32" required value={form.testo} onChange={set('testo')} /></label>
            <p className="text-xs text-stone-500 sm:col-span-2">Inviando il modulo acconsenti al trattamento dei dati per rispondere alla tua richiesta.</p>
            <div className="sm:col-span-2"><button className="btn-primary">Invia messaggio</button></div>
          </form>
        )}
      </div>
    </div>
  )
}
