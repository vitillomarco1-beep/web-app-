/**
 * Registro dei parametri di un'analisi di laboratorio di un alimento zootecnico
 * (fieno, insilato, granella, ecc.), sul modello dei referti "Dairy One"/NIR più
 * diffusi (es. Cortal Extrasoy): umidità e sostanza secca sono "as sampled", tutti
 * gli altri parametri sono espressi sulla sostanza secca (Dry Matter Basis), la
 * base comparabile tra alimenti a umidità diversa.
 *
 * Solo sostanzaSeccaPercento e carbonioSostanzaSeccaPercento entrano oggi nel
 * calcolo dell'assorbimento di CO2 della simulazione zootecnica (si veda
 * lib/simulazioneZootecnia.ts). Il resto — proteina, fibra (ADF/NDF), amido,
 * minerali, energia, fermentazione, digeribilità della fibra nel tempo — viene
 * raccolto per completare il fascicolo dell'alimento con i dati del referto reale,
 * pronto per un uso futuro (es. bilanci nutrizionali, o un eventuale affinamento
 * dell'intensità emissiva di metano enterico in funzione della fibra della
 * razione, oggi non implementato: l'intensità emissiva della simulazione resta un
 * valore fisso per tipologia di allevamento da letteratura).
 */

export interface AnalisiAlimento {
  // Base (as sampled)
  sostanzaSeccaPercento?: number
  umiditaPercento?: number

  // Usato nel calcolo di assorbimento CO2 (si veda simulazioneZootecnia.ts)
  carbonioSostanzaSeccaPercento?: number

  // Proteine
  proteinaGrezzaPercento?: number
  adicpPercento?: number
  proteinaSolubilePercentoCP?: number
  proteinaDegradabilePercentoCP?: number
  ndicpPercento?: number

  // Fibra e carboidrati
  adfPercento?: number
  andfomPercento?: number
  ligninaPercento?: number
  nfcPercento?: number
  amidoPercento?: number
  wscPercento?: number
  escPercento?: number

  // Grassi
  grassoGrezzoPercento?: number
  grassiTotaliPercento?: number
  c181OleicoPercento?: number
  c182LinoleicoPercento?: number
  c183LinolenicoPercento?: number
  rufalPercento?: number

  // Minerali
  ceneriPercento?: number
  calcioPercento?: number
  fosforoPercento?: number
  magnesioPercento?: number
  potassioPercento?: number
  zolfoPercento?: number
  cloroPercento?: number

  // Energia e valore nutritivo
  tdnPercento?: number
  nelMcalKg?: number
  nemMcalKg?: number
  negMcalKg?: number
  meMcalKg?: number
  relativeFeedValue?: number
  relativeForageQuality?: number
  milkKgPerTonDM?: number
  horseDEMcalKg?: number

  // Fermentazione (insilati/fieno umido)
  ammoniacaPercento?: number
  acidoLatticoPercento?: number
  acidoAceticoPercento?: number
  acidoButirricoPercento?: number
  vfaScore?: number

  // Digeribilità della fibra nel tempo
  uNdfom30hPercento?: number
  uNdfom120hPercento?: number
  uNdfom240hPercento?: number
  ndfDom30hPercentoNdf?: number
  ndfDom120hPercentoNdf?: number
  ndfDom240hPercentoNdf?: number
}

export interface CampoAnalisiAlimento {
  key: keyof AnalisiAlimento
  label: string
  unita: string
}

export interface GruppoAnalisiAlimento {
  titolo: string
  campi: CampoAnalisiAlimento[]
}

/** Tutti i parametri, raggruppati per la resa in tabella, tranne
 * sostanza secca/umidità/carbonio che hanno una collocazione dedicata nella UI
 * (guidano direttamente il calcolo di assorbimento CO2). */
export const GRUPPI_ANALISI_ALIMENTO: GruppoAnalisiAlimento[] = [
  {
    titolo: 'Proteine',
    campi: [
      { key: 'proteinaGrezzaPercento', label: 'Proteina grezza (CP)', unita: '% s.s.' },
      { key: 'adicpPercento', label: 'ADICP', unita: '% s.s.' },
      { key: 'proteinaSolubilePercentoCP', label: 'Proteina solubile', unita: '% CP' },
      { key: 'proteinaDegradabilePercentoCP', label: 'Proteina degradabile', unita: '% CP' },
      { key: 'ndicpPercento', label: 'NDICP', unita: '% s.s.' },
    ],
  },
  {
    titolo: 'Fibra e carboidrati (influenzano il metano enterico)',
    campi: [
      { key: 'adfPercento', label: 'ADF', unita: '% s.s.' },
      { key: 'andfomPercento', label: 'aNDFom (NDF)', unita: '% s.s.' },
      { key: 'ligninaPercento', label: 'Lignina (ADL)', unita: '% s.s.' },
      { key: 'nfcPercento', label: 'NFC', unita: '% s.s.' },
      { key: 'amidoPercento', label: 'Amido', unita: '% s.s.' },
      { key: 'wscPercento', label: 'WSC (zuccheri solubili)', unita: '% s.s.' },
      { key: 'escPercento', label: 'ESC (zuccheri semplici)', unita: '% s.s.' },
    ],
  },
  {
    titolo: 'Grassi',
    campi: [
      { key: 'grassoGrezzoPercento', label: 'Grasso grezzo', unita: '% s.s.' },
      { key: 'grassiTotaliPercento', label: 'Grassi totali', unita: '% s.s.' },
      { key: 'c181OleicoPercento', label: 'C18:1 Oleico', unita: '% s.s.' },
      { key: 'c182LinoleicoPercento', label: 'C18:2 Linoleico', unita: '% s.s.' },
      { key: 'c183LinolenicoPercento', label: 'C18:3 Linolenico', unita: '% s.s.' },
      { key: 'rufalPercento', label: 'RUFAL', unita: '% s.s.' },
    ],
  },
  {
    titolo: 'Minerali',
    campi: [
      { key: 'ceneriPercento', label: 'Ceneri (Ash)', unita: '% s.s.' },
      { key: 'calcioPercento', label: 'Calcio (Ca)', unita: '% s.s.' },
      { key: 'fosforoPercento', label: 'Fosforo (P)', unita: '% s.s.' },
      { key: 'magnesioPercento', label: 'Magnesio (Mg)', unita: '% s.s.' },
      { key: 'potassioPercento', label: 'Potassio (K)', unita: '% s.s.' },
      { key: 'zolfoPercento', label: 'Zolfo (S)', unita: '% s.s.' },
      { key: 'cloroPercento', label: 'Cloro (Cl)', unita: '% s.s.' },
    ],
  },
  {
    titolo: 'Energia e valore nutritivo',
    campi: [
      { key: 'tdnPercento', label: 'TDN', unita: '% s.s.' },
      { key: 'nelMcalKg', label: 'NEL (lattazione)', unita: 'Mcal/kg s.s.' },
      { key: 'nemMcalKg', label: 'NEM (mantenimento)', unita: 'Mcal/kg s.s.' },
      { key: 'negMcalKg', label: 'NEG (accrescimento)', unita: 'Mcal/kg s.s.' },
      { key: 'meMcalKg', label: 'ME (energia metabolizzabile)', unita: 'Mcal/kg s.s.' },
      { key: 'relativeFeedValue', label: 'Relative Feed Value (RFV)', unita: 'indice' },
      { key: 'relativeForageQuality', label: 'Relative Forage Quality (RFQ)', unita: 'indice' },
      { key: 'milkKgPerTonDM', label: 'Milk Kg/Metric Ton DM', unita: 'kg/t s.s.' },
      { key: 'horseDEMcalKg', label: 'Horse DE', unita: 'Mcal/kg s.s.' },
    ],
  },
  {
    titolo: 'Fermentazione (insilati/fieno umido)',
    campi: [
      { key: 'ammoniacaPercento', label: 'Ammoniaca (eq. proteico)', unita: '% s.s.' },
      { key: 'acidoLatticoPercento', label: 'Acido lattico', unita: '% s.s.' },
      { key: 'acidoAceticoPercento', label: 'Acido acetico', unita: '% s.s.' },
      { key: 'acidoButirricoPercento', label: 'Acido butirrico', unita: '% s.s.' },
      { key: 'vfaScore', label: 'VFA Score', unita: 'indice' },
    ],
  },
  {
    titolo: 'Digeribilità della fibra nel tempo (influenza il metano enterico)',
    campi: [
      { key: 'uNdfom30hPercento', label: 'uNDFom 30h', unita: '% s.s.' },
      { key: 'uNdfom120hPercento', label: 'uNDFom 120h', unita: '% s.s.' },
      { key: 'uNdfom240hPercento', label: 'uNDFom 240h', unita: '% s.s.' },
      { key: 'ndfDom30hPercentoNdf', label: 'NDFDom 30h', unita: '% NDF' },
      { key: 'ndfDom120hPercentoNdf', label: 'NDFDom 120h', unita: '% NDF' },
      { key: 'ndfDom240hPercentoNdf', label: 'NDFDom 240h', unita: '% NDF' },
    ],
  },
]

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(v)
}

/** Stima indicativa del carbonio sulla sostanza secca a partire dalle ceneri
 * (% s.s.): il carbonio è contenuto solo nella frazione organica (sostanza
 * organica = 100% − ceneri%), di cui è tipicamente il 45-50% in peso — qui si usa
 * un valore centrale di 0,46, la stessa approssimazione diffusa nei bilanci del
 * carbonio di compost e residui colturali. È più precisa del default fisso al
 * 45% sull'intera sostanza secca (che ignora il contenuto minerale, molto
 * variabile tra un insilato e una granella), ma resta comunque una stima: in
 * assenza di un'analisi elementare diretta del carbonio, va trattata come tale. */
export function suggerisciCarbonioDaCeneri(ceneriPercento: number): { valore: number; formula: string } {
  const fattoreCarbonioSuOM = 0.46
  const sostanzaOrganicaPercento = 100 - ceneriPercento
  const valore = sostanzaOrganicaPercento * fattoreCarbonioSuOM
  const formula = `(100 − ${n(ceneriPercento)}) × 0,46 = ${n(valore)} % s.s.`
  return { valore, formula }
}
