/**
 * Clima storico da Open-Meteo (https://open-meteo.com/), un servizio gratuito con
 * API abilitate CORS per l'uso diretto dal browser (verificato: nessuna chiave
 * richiesta, fino a 10.000 chiamate/giorno nel livello gratuito). È un'alternativa
 * più comoda ai link regionali di lib/serviziMeteoRegionali.ts, che richiedono di
 * scaricare a mano un file dal portale dell'ente e incollarne i valori: qui il
 * download e l'aggregazione mensile li fa direttamente l'app, dalla rianalisi
 * ERA5/ERA5-Land (dal 1940 a oggi, con ~5 giorni di ritardo).
 *
 * NOTA SUI TERMINI D'USO: il livello gratuito di Open-Meteo è pensato per un uso
 * non commerciale (nessun abbonamento/pubblicità nell'app che lo richiama); un uso
 * professionale a volumi elevati potrebbe richiedere un piano a pagamento — si veda
 * https://open-meteo.com/en/pricing e https://open-meteo.com/en/terms. I dati sono
 * pubblicati in licenza CC BY 4.0: vanno sempre citati come "Open-Meteo.com"
 * nell'interfaccia che li mostra.
 *
 * CONVERSIONE EVAPORAZIONE: per ogni mese si scarica la media di temperatura media
 * giornaliera (°C), pioggia totale giornaliera (mm) ed ET0 Penman-Monteith FAO-56
 * (mm, evapotraspirazione di riferimento). RothC (lib/rothc.ts) si aspetta invece in
 * ingresso "evaporazione da vasca", che converte internamente in evapotraspirazione
 * potenziale moltiplicandola per 0.75 — la stessa grandezza che l'ET0 già
 * rappresenta. Per evitare di applicare lo sconto due volte, l'ET0 mensile viene
 * quindi diviso per 0.75 prima di essere scritto nel campo "evaporazioneMm": dopo la
 * moltiplicazione interna di RothC si ottiene di nuovo lo stesso ET0 di partenza.
 */

import type { MeseClima } from './rothc'

export interface LuogoOpenMeteo {
  id: number
  nome: string
  provincia?: string
  latitudine: number
  longitudine: number
}

export interface ClimaStoricoOpenMeteo {
  climaMensile: MeseClima[]
  primoAnno: number
  ultimoAnno: number
}

export async function cercaLuogoOpenMeteo(query: string): Promise<LuogoOpenMeteo[]> {
  const testo = query.trim()
  if (!testo) return []
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(testo)}` +
    `&count=10&language=it&countryCode=IT`
  const risposta = await fetch(url)
  if (!risposta.ok) {
    throw new Error(`Ricerca località non riuscita (HTTP ${risposta.status}).`)
  }
  const dati = await risposta.json()
  const risultati: unknown[] = Array.isArray(dati.results) ? dati.results : []
  return risultati.map((r) => {
    const v = r as Record<string, unknown>
    return {
      id: v.id as number,
      nome: v.name as string,
      provincia: (v.admin2 as string | undefined) ?? (v.admin1 as string | undefined),
      latitudine: v.latitude as number,
      longitudine: v.longitude as number,
    }
  })
}

function mediaMensile(valoriPerAnno: number[][]): number[] {
  return Array.from({ length: 12 }, (_, mese) => {
    const valori = valoriPerAnno.map((anno) => anno[mese]).filter((v) => !isNaN(v))
    if (valori.length === 0) return 0
    return valori.reduce((s, v) => s + v, 0) / valori.length
  })
}

export async function scaricaClimaStoricoOpenMeteo(
  latitudine: number,
  longitudine: number,
  numeroAnni = 5,
): Promise<ClimaStoricoOpenMeteo> {
  const oggi = new Date()
  // Il dataset ERA5 ha circa 5 giorni di ritardo: per sicurezza prendiamo come
  // ultimo anno completo quello precedente a quello corrente.
  const ultimoAnno = oggi.getUTCFullYear() - 1
  const primoAnno = ultimoAnno - numeroAnni + 1
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${latitudine}&longitude=${longitudine}` +
    `&start_date=${primoAnno}-01-01&end_date=${ultimoAnno}-12-31` +
    `&daily=temperature_2m_mean,precipitation_sum,et0_fao_evapotranspiration&timezone=auto`
  const risposta = await fetch(url)
  if (!risposta.ok) {
    const corpo = await risposta.json().catch(() => null)
    throw new Error(
      corpo?.reason
        ? `Open-Meteo: ${corpo.reason}`
        : `Richiesta ad Open-Meteo non riuscita (HTTP ${risposta.status}).`,
    )
  }
  const dati = await risposta.json()
  const tempo: string[] = dati.daily?.time ?? []
  const temperatura: (number | null)[] = dati.daily?.temperature_2m_mean ?? []
  const precipitazioni: (number | null)[] = dati.daily?.precipitation_sum ?? []
  const et0: (number | null)[] = dati.daily?.et0_fao_evapotranspiration ?? []
  if (tempo.length === 0) {
    throw new Error('Open-Meteo non ha restituito dati giornalieri per il periodo richiesto.')
  }

  const temperaturaSommaPerAnnoMese: number[][] = Array.from({ length: numeroAnni }, () => Array(12).fill(0))
  const contaGiorniPerAnnoMese: number[][] = Array.from({ length: numeroAnni }, () => Array(12).fill(0))
  const precipitazioniPerAnnoMese: number[][] = Array.from({ length: numeroAnni }, () => Array(12).fill(0))
  const et0PerAnnoMese: number[][] = Array.from({ length: numeroAnni }, () => Array(12).fill(0))

  for (let i = 0; i < tempo.length; i++) {
    const data = new Date(tempo[i] + 'T00:00:00Z')
    const anno = data.getUTCFullYear()
    const mese = data.getUTCMonth()
    const indiceAnno = anno - primoAnno
    if (indiceAnno < 0 || indiceAnno >= numeroAnni) continue
    if (temperatura[i] != null) {
      temperaturaSommaPerAnnoMese[indiceAnno][mese] += temperatura[i]!
      contaGiorniPerAnnoMese[indiceAnno][mese] += 1
    }
    if (precipitazioni[i] != null) precipitazioniPerAnnoMese[indiceAnno][mese] += precipitazioni[i]!
    if (et0[i] != null) et0PerAnnoMese[indiceAnno][mese] += et0[i]!
  }

  const temperaturaMediaPerAnnoMese = temperaturaSommaPerAnnoMese.map((anno, ia) =>
    anno.map((somma, mese) => (contaGiorniPerAnnoMese[ia][mese] > 0 ? somma / contaGiorniPerAnnoMese[ia][mese] : NaN)),
  )

  const temperaturaMensile = mediaMensile(temperaturaMediaPerAnnoMese)
  const precipitazioniMensile = mediaMensile(precipitazioniPerAnnoMese)
  const et0Mensile = mediaMensile(et0PerAnnoMese)

  const climaMensile: MeseClima[] = Array.from({ length: 12 }, (_, mese) => ({
    temperaturaC: Math.round(temperaturaMensile[mese] * 10) / 10,
    precipitazioniMm: Math.round(precipitazioniMensile[mese]),
    evaporazioneMm: Math.round((et0Mensile[mese] / 0.75) * 10) / 10,
  }))

  return { climaMensile, primoAnno, ultimoAnno }
}
