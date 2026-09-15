/**
 * Stima l'apporto di carbonio al suolo dai residui colturali (paglia, stocchi, ecc.)
 * a partire dalla resa in prodotto principale, per i seminativi (colture annuali):
 * il chicco/seme raccolto non è un pozzo di carbonio duraturo (il suo carbonio torna
 * in atmosfera entro l'anno, per consumo/respirazione), ma il residuo colturale
 * restituito al terreno contribuisce allo stock di carbonio organico del suolo — lo
 * stesso apporto richiesto in input dal simulatore RothC (lib/rothc.ts).
 *
 * NOTA DI TRASPARENZA: l'indice di raccolta (harvest index) e la frazione di
 * carbonio della sostanza secca usati qui sono valori tipici indicativi da
 * letteratura agronomica generale. In questa sessione di sviluppo non è stato
 * possibile verificarli direttamente contro una tabella IPCC o ISPRA specifica
 * (limite di accesso alla rete dell'ambiente di lavoro): vanno confermati o
 * sostituiti con la fonte di riferimento del consulente prima dell'uso in
 * certificazione. Sono comunque tutti modificabili nello strumento.
 *
 * Relazione usata (identità agronomica di base, non specifica di una fonte):
 *   Harvest Index (HI) = sostanza secca del prodotto / sostanza secca totale fuori
 *   terra della pianta
 *   → residuo (sostanza secca) = prodotto (sostanza secca) × (1/HI − 1)
 */

export interface ColturaResiduo {
  nome: string
  /** Harvest index tipico (sostanza secca prodotto / sostanza secca totale pianta). */
  harvestIndex: number
  /** Frazione di sostanza secca sul prodotto "tal quale" (umidità di raccolta tipica). */
  frazioneSostanzaSeccaProdotto: number
  /** Frazione di carbonio sulla sostanza secca del residuo. */
  frazioneCarbonioResiduo: number
}

export const COLTURE_RESIDUI: ColturaResiduo[] = [
  { nome: 'Frumento tenero', harvestIndex: 0.45, frazioneSostanzaSeccaProdotto: 0.87, frazioneCarbonioResiduo: 0.45 },
  { nome: 'Frumento duro', harvestIndex: 0.42, frazioneSostanzaSeccaProdotto: 0.87, frazioneCarbonioResiduo: 0.45 },
  { nome: 'Orzo', harvestIndex: 0.45, frazioneSostanzaSeccaProdotto: 0.87, frazioneCarbonioResiduo: 0.45 },
  { nome: 'Mais da granella', harvestIndex: 0.5, frazioneSostanzaSeccaProdotto: 0.86, frazioneCarbonioResiduo: 0.45 },
  { nome: 'Riso (risone)', harvestIndex: 0.4, frazioneSostanzaSeccaProdotto: 0.86, frazioneCarbonioResiduo: 0.42 },
  { nome: 'Soia', harvestIndex: 0.4, frazioneSostanzaSeccaProdotto: 0.87, frazioneCarbonioResiduo: 0.45 },
  { nome: 'Girasole', harvestIndex: 0.3, frazioneSostanzaSeccaProdotto: 0.91, frazioneCarbonioResiduo: 0.45 },
  { nome: 'Colza', harvestIndex: 0.3, frazioneSostanzaSeccaProdotto: 0.91, frazioneCarbonioResiduo: 0.45 },
]

export interface InputResiduiColturali {
  resaTHaTalQuale: number
  coltura: ColturaResiduo
  /** Quota di residuo effettivamente lasciata/interrata in campo (0-1): la parte
   * eventualmente raccolta per altri usi (lettiera, alimentazione zootecnica,
   * bioenergia) non torna al suolo e va esclusa. */
  quotaResiduoRestituitaAlSuolo: number
}

export interface RisultatoResiduiColturali {
  prodottoSostanzaSeccaTHa: number
  residuoTotaleSostanzaSeccaTHa: number
  residuoRestituitoSostanzaSeccaTHa: number
  apportoCarbonioTHa: number
}

export function calcolaApportoResiduiColturali(input: InputResiduiColturali): RisultatoResiduiColturali {
  const { resaTHaTalQuale, coltura, quotaResiduoRestituitaAlSuolo } = input
  const prodottoSostanzaSeccaTHa = resaTHaTalQuale * coltura.frazioneSostanzaSeccaProdotto
  const residuoTotaleSostanzaSeccaTHa = prodottoSostanzaSeccaTHa * (1 / coltura.harvestIndex - 1)
  const residuoRestituitoSostanzaSeccaTHa = residuoTotaleSostanzaSeccaTHa * quotaResiduoRestituitaAlSuolo
  const apportoCarbonioTHa = residuoRestituitoSostanzaSeccaTHa * coltura.frazioneCarbonioResiduo
  return {
    prodottoSostanzaSeccaTHa,
    residuoTotaleSostanzaSeccaTHa,
    residuoRestituitoSostanzaSeccaTHa,
    apportoCarbonioTHa,
  }
}
