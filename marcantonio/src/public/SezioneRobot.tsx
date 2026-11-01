import { Activity, Clock, Droplets, Heart, Users, Wheat, type LucideIcon } from 'lucide-react'
import { BENEFICI_ROBOT, ROBOT } from '../config/azienda'

const ICONE: Record<(typeof BENEFICI_ROBOT)[number]['icona'], LucideIcon> = {
  clock: Clock, heart: Heart, activity: Activity, droplet: Droplets, wheat: Wheat, users: Users,
}

/** Sezione del sito pubblico sui benefici della mungitura robotizzata. */
export default function SezioneRobot() {
  return (
    <section className="bg-brand-900 py-16 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-end gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-arancio-300">Mungitura robotizzata</p>
            <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Sono le nostre vacche a decidere quando farsi mungere</h2>
            <p className="mt-4 text-brand-100">
              Abbiamo scelto la mungitura robotizzata per il benessere degli animali e per la qualità del latte:
              una tradizione che dura dal 1900, con la tecnologia di oggi.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              [String(ROBOT.totale), 'robot di mungitura'],
              ['24 h', 'su 24, tutti i giorni'],
              ['0', 'orari fissi per le vacche'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <dt className="sr-only">{l}</dt>
                <dd className="font-serif text-3xl font-bold text-arancio-400">{v}</dd>
                <dd className="mt-1 text-xs leading-tight text-brand-100">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFICI_ROBOT.map((b) => {
            const Icona = ICONE[b.icona]
            return (
              <div key={b.titolo} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition hover:bg-white/10">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-arancio-500 text-brand-900"><Icona className="h-5 w-5" strokeWidth={2} /></span>
                <h3 className="mt-4 font-semibold">{b.titolo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-100">{b.testo}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
