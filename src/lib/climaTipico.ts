import type { MeseClima } from './rothc'

export interface ProfiloClimatico {
  nome: string
  climaMensile: MeseClima[]
}

function mese(temperaturaC: number, precipitazioniMm: number, evaporazioneMm: number): MeseClima {
  return { temperaturaC, precipitazioniMm, evaporazioneMm }
}

/**
 * Profili climatici mensili indicativi per alcune macro-zone italiane, usati come
 * punto di partenza rapido nel simulatore RothC. Sono stime di massima basate su
 * conoscenza climatologica generale (non dati misurati da una stazione): vanno
 * sempre verificati e sostituiti con dati reali della zona specifica quando
 * disponibili (stazione meteo aziendale, ARPA regionale, servizio agrometeorologico).
 */
export const PROFILI_CLIMATICI: ProfiloClimatico[] = [
  {
    nome: 'Campania interna (Caserta, valle del Volturno)',
    climaMensile: [
      mese(7, 90, 20),
      mese(8, 85, 30),
      mese(11, 75, 50),
      mese(14, 70, 75),
      mese(18, 55, 110),
      mese(22, 35, 140),
      mese(25, 20, 160),
      mese(25, 30, 150),
      mese(21, 65, 100),
      mese(16, 110, 60),
      mese(11, 130, 30),
      mese(8, 110, 20),
    ],
  },
  {
    nome: 'Pianura Padana',
    climaMensile: [
      mese(2, 55, 15),
      mese(4, 50, 25),
      mese(9, 65, 45),
      mese(14, 80, 65),
      mese(18, 85, 95),
      mese(23, 70, 120),
      mese(25, 55, 135),
      mese(24, 70, 115),
      mese(20, 75, 80),
      mese(14, 95, 45),
      mese(8, 90, 20),
      mese(3, 60, 12),
    ],
  },
  {
    nome: 'Appennino centrale (collina, 400-600 m)',
    climaMensile: [
      mese(3, 80, 15),
      mese(4, 75, 25),
      mese(8, 70, 45),
      mese(12, 75, 65),
      mese(16, 65, 95),
      mese(20, 50, 125),
      mese(23, 35, 145),
      mese(23, 45, 130),
      mese(18, 70, 85),
      mese(13, 95, 45),
      mese(8, 105, 20),
      mese(4, 90, 12),
    ],
  },
  {
    nome: 'Sud Italia interno/arido (Puglia, Sicilia, Basilicata)',
    climaMensile: [
      mese(8, 55, 25),
      mese(9, 50, 35),
      mese(11, 45, 60),
      mese(15, 40, 85),
      mese(19, 30, 120),
      mese(24, 15, 155),
      mese(27, 10, 175),
      mese(27, 15, 165),
      mese(23, 35, 115),
      mese(18, 65, 65),
      mese(13, 75, 30),
      mese(9, 65, 20),
    ],
  },
  {
    nome: 'Prealpi / Alpi',
    climaMensile: [
      mese(-1, 60, 10),
      mese(0, 55, 15),
      mese(4, 70, 30),
      mese(9, 90, 50),
      mese(13, 110, 75),
      mese(17, 120, 95),
      mese(19, 110, 105),
      mese(19, 105, 90),
      mese(15, 90, 60),
      mese(9, 100, 30),
      mese(4, 85, 12),
      mese(0, 65, 8),
    ],
  },
]
