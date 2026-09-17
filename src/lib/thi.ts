/**
 * Indice di Temperatura-Umidità (THI, Temperature-Humidity Index) — lo
 * strumento standard in zootecnia per quantificare il rischio di stress da
 * caldo nei bovini da latte: la produttività cala oltre una certa soglia,
 * quindi a parità di emissioni di metano enterico (che non calano in modo
 * proporzionale) l'intensità emissiva per litro di latte sale.
 *
 *   THI = (1,8 × T + 32) − [(0,55 − 0,0055 × UR%) × (1,8 × T − 26)]
 *
 * dove T = temperatura media dell'aria (°C), UR% = umidità relativa media (%).
 *
 * Soglie di riferimento (NRC, 1971, "A guide to environmental research on
 * animals" — le più citate in letteratura zootecnica; alcuni studi successivi,
 * es. Zimbelman et al. 2009, propongono soglie più basse per vacche ad alta
 * produzione, non usate qui in assenza di un default altrettanto consolidato):
 *   < 68: nessuno stress
 *   68–72: stress lieve
 *   72–80: stress moderato
 *   80–90: stress severo
 *   > 90: stress estremo
 *
 * I dati di temperatura e umidità vanno presi dal servizio agrometeorologico
 * pubblico della zona del cliente (si veda lib/serviziMeteoRegionali.ts) —
 * molte delle stesse stazioni usate per il clima di RothC pubblicano anche
 * l'umidità relativa.
 */

export interface CategoriaThi {
  etichetta: string
  livello: 0 | 1 | 2 | 3 | 4
}

const SOGLIE: { max: number; etichetta: string; livello: 0 | 1 | 2 | 3 | 4 }[] = [
  { max: 68, etichetta: 'Nessuno stress', livello: 0 },
  { max: 72, etichetta: 'Stress lieve', livello: 1 },
  { max: 80, etichetta: 'Stress moderato', livello: 2 },
  { max: 90, etichetta: 'Stress severo', livello: 3 },
  { max: Infinity, etichetta: 'Stress estremo', livello: 4 },
]

export function calcolaThi(temperaturaC: number, umiditaRelativaPercento: number): number {
  const t = temperaturaC
  const rh = umiditaRelativaPercento
  return 1.8 * t + 32 - (0.55 - 0.0055 * rh) * (1.8 * t - 26)
}

export function categorizzaThi(thi: number): CategoriaThi {
  const soglia = SOGLIE.find((s) => thi < s.max) ?? SOGLIE[SOGLIE.length - 1]
  return { etichetta: soglia.etichetta, livello: soglia.livello }
}

export interface MeseThi {
  temperaturaC: number
  umiditaRelativaPercento: number
}

export interface RigaThiCalcolata extends MeseThi {
  thi: number
  categoria: CategoriaThi
}

export interface RisultatoThi {
  righe: RigaThiCalcolata[]
  mesiARischio: number
  formulaRiepilogo: string
}

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(v)
}

export function calcolaThiMensile(mesi: MeseThi[]): RisultatoThi {
  const righe = mesi.map((m) => {
    const thi = calcolaThi(m.temperaturaC, m.umiditaRelativaPercento)
    return { ...m, thi, categoria: categorizzaThi(thi) }
  })
  const mesiARischio = righe.filter((r) => r.categoria.livello >= 2).length
  const formulaRiepilogo =
    mesiARischio > 0
      ? `${mesiARischio} mesi su ${righe.length} con THI ≥ 72 (stress moderato o superiore).`
      : `Nessun mese con THI ≥ 72 (stress moderato) nei valori inseriti.`
  return { righe, mesiARischio, formulaRiepilogo }
}

export { n as formattaThi }
