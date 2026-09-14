import { jsPDF } from 'jspdf'
import autoTableRaw, { type UserOptions } from 'jspdf-autotable'
import type {
  DatiAgricolturaAgroforestazione,
  DatiCalcolo,
  DatiImboschimento,
  RisultatoCalcolo,
} from '../types'
import { TIPO_ATTIVITA_LABEL, formatDate } from './format'
import { CHECKLIST_AGRICOLTURA, CHECKLIST_IMBOSCHIMENTO, CHECKLIST_ZOOTECNIA } from './checklist'
import type { ChecklistItemDef } from './checklist'

/** Evita che jspdf-autotable spezzi una riga a metà tra due pagine (di default può
 * troncare il testo di una cella lasciandone la coda orfana sulla pagina successiva
 * senza le altre colonne): forziamo lo spostamento dell'intera riga. */
function autoTable(doc: jsPDF, options: UserOptions) {
  autoTableRaw(doc, { rowPageBreak: 'avoid', ...options })
}

const FOREST: [number, number, number] = [49, 111, 69]
const FOREST_DARK: [number, number, number] = [29, 59, 41]
const STONE: [number, number, number] = [68, 64, 60]
const STONE_LIGHT: [number, number, number] = [120, 113, 108]
const AMBER: [number, number, number] = [180, 83, 9]
const AMBER_BG: [number, number, number] = [255, 251, 235]

function n(v: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(v)
}

function haQuantificazione(
  dati: DatiCalcolo,
): dati is DatiAgricolturaAgroforestazione | DatiImboschimento {
  return dati.tipoAttivita !== 'zootecnia'
}

function checklistPer(dati: DatiCalcolo): { items: ChecklistItemDef[]; valori: Record<string, boolean> } | null {
  switch (dati.tipoAttivita) {
    case 'agricoltura_agroforestazione':
      return { items: CHECKLIST_AGRICOLTURA, valori: dati.checklist }
    case 'imboschimento':
      return { items: CHECKLIST_IMBOSCHIMENTO, valori: dati.checklist }
    case 'zootecnia':
      return { items: CHECKLIST_ZOOTECNIA, valori: dati.checklist }
  }
}

/** Costruisce il documento PDF di riepilogo di un calcolo, con tutti i passaggi
 * intermedi (non solo il risultato finale) per la massima trasparenza verso il
 * cliente. */
export function costruisciReportCalcoloPdf(
  nomeTitolare: string,
  dati: DatiCalcolo,
  risultato: RisultatoCalcolo,
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const marginX = 18
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...FOREST_DARK)
  doc.text('Report di calcolo — crediti di carbonio', marginX, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...STONE_LIGHT)
  doc.text(`${nomeTitolare} — ${dati.nomeCalcolo}`, marginX, y)
  y += 5
  doc.text(`Metodologia: ${TIPO_ATTIVITA_LABEL[dati.tipoAttivita]}`, marginX, y)
  y += 5
  doc.text(
    `Documento generato il ${new Intl.DateTimeFormat('it-IT', { dateStyle: 'long' }).format(new Date())}`,
    marginX,
    y,
  )
  y += 6

  doc.setDrawColor(224, 239, 226)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 6

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Dati generali', '']],
    body: [
      ['Area di attività', `${n(dati.areaAttivitaHa)} ha`],
      ['Data inizio periodo di attività', formatDate(dati.dataInizioPeriodoAttivita)],
      ['Durata periodo di certificazione', `${dati.durataPeriodoCertificazioneAnni} anni`],
    ],
    theme: 'grid',
    headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
    styles: { fontSize: 9, textColor: STONE, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 75 } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 7

  if (!risultato.metodologiaDisponibile) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      body: [[
        'Per questa metodologia non esiste ancora un atto delegato dell\'UE che ne stabilisca ' +
          'la metodologia di certificazione: il bilancio in t CO2eq non è ancora calcolabile. ' +
          'I dati aziendali sono comunque registrati, pronti per quando la normativa sarà pubblicata.',
      ]],
      theme: 'plain',
      styles: { fontSize: 9.5, textColor: AMBER, fillColor: AMBER_BG, cellPadding: 5 },
    })
    return doc
  }

  if (haQuantificazione(dati)) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Dati di input (quantificazione)', 'Scenario di attività', 'Scenario di riferimento']],
      body: [
        [
          'Assorbimenti di carbonio (t CO2)',
          n(dati.assorbimentiAttivitaTCO2),
          n(dati.assorbimentiRiferimentoTCO2),
        ],
        [
          'Emissioni dal suolo — ESL (t CO2eq)',
          n(dati.emissioniSuoloAttivitaTCO2),
          n(dati.emissioniSuoloRiferimentoTCO2),
        ],
        [
          'Emissioni agricole N2O — ESA (t CO2eq)',
          n(dati.emissioniAgricoleAttivitaTCO2),
          n(dati.emissioniAgricoleRiferimentoTCO2),
        ],
        ['GES associati (t CO2eq)', n(dati.gesAssociatiTCO2), '—'],
      ],
      theme: 'grid',
      headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
      styles: { fontSize: 9, textColor: STONE, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 75 } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 7
  }

  const d = risultato.dettaglio
  if (d) {
    const passaggi: [string, string][] = []
    passaggi.push([
      'Fattore di riduzione per incertezza (INC) applicato',
      `${(d.fattoreIncertezzaEffettivo * 100).toFixed(1)}%`,
    ])
    if (d.emissioniAgricoleRiferimentoAggiornatoTCO2 !== undefined) {
      passaggi.push([
        'Livello di riferimento ESA aggiornato (sez. 2.3.3, -1%/anno)',
        `${n(d.emissioniAgricoleRiferimentoAggiornatoTCO2)} t CO2eq`,
      ])
    }
    passaggi.push([
      'Beneficio lordo — assorbimento di carbonio',
      `${n(d.beneficioLordoAssorbimentoTCO2)} t CO2eq`,
    ])
    passaggi.push([
      'Beneficio lordo — riduzione emissioni dal suolo',
      `${n(d.beneficioLordoRiduzioneEmissioniTCO2)} t CO2eq`,
    ])
    if (d.gesAssociatiQuotaAssorbimentoTCO2 !== 0) {
      passaggi.push([
        'GES associati sottratti — quota assorbimento',
        `-${n(d.gesAssociatiQuotaAssorbimentoTCO2)} t CO2eq`,
      ])
    }
    if (d.gesAssociatiQuotaRiduzioneTCO2 !== 0) {
      passaggi.push([
        'GES associati sottratti — quota riduzione emissioni',
        `-${n(d.gesAssociatiQuotaRiduzioneTCO2)} t CO2eq`,
      ])
    }
    passaggi.push([
      'Beneficio netto — assorbimento di carbonio',
      `${n(risultato.beneficioNettoAssorbimentoTCO2)} t CO2eq`,
    ])
    passaggi.push([
      'Beneficio netto — riduzione emissioni dal suolo',
      `${n(risultato.beneficioNettoRiduzioneEmissioniTCO2)} t CO2eq`,
    ])
    if (risultato.aggiustamentoLavorazionePratiTCO2) {
      passaggi.push([
        'Detrazione per lavorazione di prati permanenti (12%, sez. 2.2)',
        `-${n(risultato.aggiustamentoLavorazionePratiTCO2)} t CO2eq`,
      ])
    }
    if (risultato.deficitCreditiTCO2 > 0 || (dati as DatiAgricolturaAgroforestazione).deficitCreditiPrecedenteTCO2) {
      const deficitPrecedente = 'deficitCreditiPrecedenteTCO2' in dati ? dati.deficitCreditiPrecedenteTCO2 ?? 0 : 0
      if (deficitPrecedente > 0) {
        passaggi.push([
          'Deficit di crediti riportato dal periodo precedente',
          `-${n(deficitPrecedente)} t CO2eq`,
        ])
      }
    }

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Passaggi del calcolo (equazioni 1 e 2 dell\'allegato)', 'Valore']],
      body: passaggi,
      theme: 'grid',
      headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
      styles: { fontSize: 9, textColor: STONE, cellPadding: 2.5 },
      columnStyles: { 1: { halign: 'right', cellWidth: 45 } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // Riquadro risultato finale
  const boxHeight = 16
  if (y + boxHeight > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage()
    y = 20
  }
  doc.setFillColor(...FOREST)
  doc.roundedRect(marginX, y, pageWidth - marginX * 2, boxHeight, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Bilancio netto totale certificabile', marginX + 5, y + boxHeight / 2 + 1.5, {
    baseline: 'middle',
  })
  doc.setFontSize(14)
  doc.text(
    `${n(risultato.beneficioNettoTotaleTCO2)} t CO2eq`,
    pageWidth - marginX - 5,
    y + boxHeight / 2 + 1.5,
    { align: 'right', baseline: 'middle' },
  )
  y += boxHeight + 5

  // Passaggio finale: dal bilancio in t CO2eq al numero esatto di unità di credito.
  // Nel quadro UE (e nella generalità degli standard MRV) 1 unità certificata = 1 t
  // CO2eq; le unità emesse sono arrotondate per difetto (convenzione conservativa,
  // coerente con l'approccio prudenziale richiesto dall'allegato per l'incertezza).
  const numeroUnita = Math.floor(risultato.beneficioNettoTotaleTCO2)
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    body: [[
      'Numero di unità di credito certificabili\n(1 unità certificata = 1 t CO2eq; arrotondamento per difetto)',
      `${numeroUnita} unità`,
    ]],
    theme: 'plain',
    styles: { fontSize: 9.5, textColor: STONE, cellPadding: { top: 3, bottom: 3, left: 0, right: 0 } },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: FOREST_DARK, fontSize: 12 } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  if (risultato.deficitCreditiTCO2 > 0) {
    doc.setTextColor(...AMBER)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(
      `Attenzione: risultato negativo. Deficit di ${n(risultato.deficitCreditiTCO2)} t CO2eq da riportare al periodo di certificazione successivo.`,
      marginX,
      y,
    )
    y += 8
  }

  // Checklist di ammissibilità/addizionalità
  const checklist = checklistPer(dati)
  if (checklist) {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      y = 20
    }
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Requisiti di ammissibilità e addizionalità', 'Stato']],
      body: checklist.items.map((item) => [
        item.label,
        checklist.valori[item.key] ? 'Soddisfatto' : 'Da verificare',
      ]),
      theme: 'grid',
      headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
      styles: { fontSize: 8.7, textColor: STONE, cellPadding: 2.5 },
      columnStyles: { 1: { cellWidth: 32 } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const soddisfatto = data.cell.raw === 'Soddisfatto'
          data.cell.styles.textColor = soddisfatto ? FOREST_DARK : AMBER
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8
  }

  if (y > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage()
    y = 20
  }
  doc.setDrawColor(231, 229, 228)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 5
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.8)
  doc.setTextColor(...STONE_LIGHT)
  const disclaimer =
    'Tutti i valori sono espressi in tonnellate di CO2 equivalente (t CO2eq): le eventuali ' +
    'emissioni di CH4 e N2O incluse nei dati di input si intendono già convertite in CO2eq ' +
    'utilizzando i potenziali di riscaldamento globale (GWP) del regolamento delegato (UE) ' +
    "2020/1044 o dell'ultima relazione di valutazione IPCC, come richiesto dall'allegato, " +
    'sez. 2.2. Documento generato automaticamente dal Carbon Farming Calculator sulla base dei ' +
    "dati inseriti dal consulente. È uno strumento di supporto professionale: non sostituisce " +
    'la verifica di un organismo di certificazione accreditato ai sensi del regolamento ' +
    '(UE) 2024/3012.'
  const righe = doc.splitTextToSize(disclaimer, pageWidth - marginX * 2)
  doc.text(righe, marginX, y)

  return doc
}

/** Genera il report e lo apre in una nuova scheda (come blob), invece di forzarne
 * il download: più affidabile in contesti sandboxati (es. anteprime pubblicate). */
export function apriReportCalcoloPdf(
  nomeTitolare: string,
  dati: DatiCalcolo,
  risultato: RisultatoCalcolo,
): void {
  const doc = costruisciReportCalcoloPdf(nomeTitolare, dati, risultato)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
