import { jsPDF } from 'jspdf'
import autoTableRaw, { type UserOptions } from 'jspdf-autotable'
import type { DatiCalcolo, DatiZootecnia } from '../types'
import { calcolaBilancio } from './carbonEngine'
import { TIPO_ATTIVITA_LABEL, formatDate } from './format'
import {
  DISCLAIMER_REPORT,
  GWP_VALORI,
  SPIEGAZIONE_CONVERSIONE_CO2EQ,
  calcolaPassaggi,
  checklistPer,
  descrizioneScenari,
  formulaBilancioNetto,
  haQuantificazione,
  introduzioneRothC,
  righeConfrontoRothC,
} from './reportSteps'
import { calcolaRiepilogoZootecnia, FONTE_EMISSIONI_BILANCIO_LABEL } from './riepilogoZootecnia'
import { TARGET_UE_RIDUZIONE_PERCENTO_2040, TARGET_UE_FONTE } from './praticheMitigazione'

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

/** Disegna un paragrafo di testo con a capo automatico, come riga singola di una
 * autoTable "plain" così eredita lo stesso comportamento di spostamento pagina delle
 * altre tabelle del report invece di dover gestire manualmente i salti pagina. */
function paragrafo(doc: jsPDF, testo: string, startY: number, marginX: number): number {
  autoTable(doc, {
    startY,
    margin: { left: marginX, right: marginX },
    body: [[testo]],
    theme: 'plain',
    styles: { fontSize: 8.7, textColor: STONE, cellPadding: { top: 2, bottom: 2, left: 0, right: 0 } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + 4
}

/** I font base di jsPDF (Helvetica) non includono il segno meno tipografico
 * (−, U+2212) né la freccia (→, U+2192) usati nelle stringhe di formula
 * pensate per lo schermo (font di sistema, Unicode completo): senza questa
 * sostituzione comparirebbero come caratteri estranei/mancanti nel PDF. Si
 * applica solo qui, non nelle stringhe condivise con la UI a schermo. */
function perPdf(testo: string): string {
  return testo.replace(/−/g, '-').replace(/→/g, '->')
}

function nuovaPaginaSeNecessario(doc: jsPDF, y: number, spazioRichiesto: number): number {
  if (y + spazioRichiesto > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage()
    return 20
  }
  return y
}

/** Stessa logica di RiepilogoZootecnia.tsx (lib/riepilogoZootecnia.ts), qui
 * disegnata con le primitive jsPDF/autoTable invece di JSX: un sommario in
 * cima (i tre totali, il monitoraggio obiettivo UE, il bilancio simulato) e
 * poi tutte le formule di dettaglio, sempre visibili qui (un PDF esportato va
 * mostrato per intero, non dietro un toggle che in un documento statico non
 * ha senso). */
function disegnaRiepilogoZootecniaPdf(doc: jsPDF, dati: DatiZootecnia, startY: number, marginX: number): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = startY
  const r = calcolaRiepilogoZootecnia(dati)

  y = nuovaPaginaSeNecessario(doc, y, 20)
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    body: [[
      "Nessun atto delegato dell'UE definisce oggi una metodologia di certificazione per la " +
        'zootecnia: i valori che seguono sono stime indicative di pianificazione, non un bilancio ' +
        'crediti ufficiale.',
    ]],
    theme: 'plain',
    styles: { fontSize: 9.5, textColor: AMBER, fillColor: AMBER_BG, cellPadding: 5 },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 7

  if (!r || !r.haDati) {
    return paragrafo(
      doc,
      'Nessun dato di simulazione (metano enterico, gestione reflui, bilancio alimento/emissioni) risulta ancora inserito.',
      y,
      marginX,
    )
  }

  y = nuovaPaginaSeNecessario(doc, y, 24)
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [[
      `Metano enterico (${r.tierMetanoEntericoEtichetta})`,
      `Gestione reflui (${r.sistemaStoccaggioEtichetta})`,
      'Totale emissioni dirette',
    ]],
    body: [[
      `${n(r.metanoEnterico.ch4TCO2eq)} t CO2eq`,
      `${n(r.reflui.totaleTCO2eq)} t CO2eq`,
      `${n(r.emissioniDiretteTotaliTCO2eq)} t CO2eq`,
    ]],
    theme: 'grid',
    headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 10, textColor: STONE, cellPadding: 3, fontStyle: 'bold', halign: 'center' },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  y = paragrafo(
    doc,
    perPdf(
      `Monitoraggio — obiettivo UE −${TARGET_UE_RIDUZIONE_PERCENTO_2040}% al 2040 (non vincolante): ` +
        `riduzione stimata ${n(r.progressoTargetUe.riduzioneStimataPercento)}%. ${TARGET_UE_FONTE}`,
    ),
    y,
    marginX,
  )

  y = nuovaPaginaSeNecessario(doc, y, 16)
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    body: [[
      perPdf(
        'Bilancio simulato alimento autoprodotto − emissioni dirette\n' +
          `Fonte delle emissioni usata: ${FONTE_EMISSIONI_BILANCIO_LABEL[r.fonteEmissioniBilancio]}. ` +
          'Ipotesi di pianificazione, non un bilancio crediti: nessuna normativa definisce oggi questo confronto.',
      ),
      `${n(r.bilancioSimulato.bilancioSimulatoTCO2)} t CO2eq`,
    ]],
    theme: 'plain',
    styles: { fontSize: 9, textColor: STONE, cellPadding: { top: 3, bottom: 3, left: 0, right: 0 }, valign: 'top' },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold', fontSize: 11, textColor: FOREST_DARK, cellWidth: 42 } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6

  const dettagli: [string, string][] = [
    ['Metano enterico', r.metanoEnterico.formulaCh4],
    ['Solidi volatili (VS) dei reflui', r.reflui.formulaVs],
    ['Fattore di conversione del metano (MCF)', r.reflui.formulaMcf],
    ['Metano da stoccaggio reflui', r.reflui.formulaCh4],
    ['N2O diretto da stoccaggio', r.reflui.formulaN2oDiretto],
    ['N2O indiretto da stoccaggio (volatilizzazione)', r.reflui.formulaN2oIndirettoStoccaggio],
    ['Azoto disponibile per lo spandimento', r.reflui.formulaNDisponibile],
    ['N2O indiretto da spandimento', r.reflui.formulaN2oIndirettoSpandimento],
    ['Totale gestione reflui', r.reflui.formulaTotale],
    ['Bilancio alimento/emissioni — assorbimento', r.bilancioSimulato.formulaAssorbimento],
    ['Bilancio alimento/emissioni — emissioni', r.bilancioSimulato.formulaEmissioni],
    ['Bilancio alimento/emissioni — totale', r.bilancioSimulato.formulaBilancio],
  ]
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Dettaglio del calcolo (tutte le formule)']],
    body: dettagli.map(([titolo, formula]) => [perPdf(`${titolo}\n${formula}`)]),
    theme: 'grid',
    headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
    styles: { fontSize: 8.7, textColor: STONE, cellPadding: 2.5, valign: 'top' },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const testo = data.cell.raw?.toString() ?? ''
        if (testo.includes('\n')) data.cell.styles.fontSize = 7.6
      }
    },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 7

  if (r.righeMitigazione.length > 0) {
    y = nuovaPaginaSeNecessario(doc, y, 20)
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Pratica di mitigazione potenziale (stima, non normativa)', 't CO2eq evitate/anno']],
      body: r.righeMitigazione.map((riga) => [
        riga.nome,
        `${n(riga.riduzioneMinTCO2eq)}–${n(riga.riduzioneMaxTCO2eq)}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.3, textColor: STONE, cellPadding: 2.5 },
      columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 7
  }

  return y
}

/** Costruisce il documento PDF di riepilogo di un calcolo, con tutti i passaggi
 * intermedi (non solo il risultato finale) per la massima trasparenza verso il
 * cliente. Il risultato viene sempre ricalcolato da "dati" con il motore attuale,
 * invece di usare quello eventualmente salvato: un calcolo creato prima
 * dell'introduzione del dettaglio dei passaggi avrebbe altrimenti un risultato
 * salvato privo di quel dettaglio, e il report lo mostrerebbe incompleto pur
 * essendo aggiornato all'ultima versione. */
export function costruisciReportCalcoloPdf(nomeTitolare: string, dati: DatiCalcolo): jsPDF {
  const risultato = calcolaBilancio(dati)
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
    if (dati.tipoAttivita === 'zootecnia') {
      y = disegnaRiepilogoZootecniaPdf(doc, dati, y, marginX)
    } else {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 7
    }
  } else {
    if (haQuantificazione(dati)) {
      autoTable(doc, {
        startY: y,
        margin: { left: marginX, right: marginX },
        head: [['Dati di input (quantificazione)', 'Scenario di riferimento', 'Scenario di attività']],
        body: [
          [
            'Assorbimenti di carbonio (t CO2)',
            n(dati.assorbimentiRiferimentoTCO2),
            n(dati.assorbimentiAttivitaTCO2),
          ],
          [
            'Emissioni dal suolo — ESL (t CO2eq)',
            n(dati.emissioniSuoloRiferimentoTCO2),
            n(dati.emissioniSuoloAttivitaTCO2),
          ],
          [
            'Emissioni agricole N2O — ESA (t CO2eq)',
            n(dati.emissioniAgricoleRiferimentoTCO2),
            n(dati.emissioniAgricoleAttivitaTCO2),
          ],
          ['GES associati (t CO2eq)', '—', n(dati.gesAssociatiTCO2)],
        ],
        theme: 'grid',
        headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
        styles: { fontSize: 9, textColor: STONE, cellPadding: 2.5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 75 } },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 7

      y = paragrafo(
        doc,
        'Come si interpretano lo scenario di riferimento e quello di attività: ' +
          descrizioneScenari(dati),
        y,
        marginX,
      )

      if (dati.tipoAttivita === 'agricoltura_agroforestazione' && dati.dettaglioRothC) {
        y = paragrafo(
          doc,
          'Dettaglio della simulazione RothC per gli assorbimenti di carbonio: ' +
            introduzioneRothC(dati.dettaglioRothC),
          y,
          marginX,
        )
        autoTable(doc, {
          startY: y,
          margin: { left: marginX, right: marginX },
          head: [['Passaggio della simulazione', 'Scenario di riferimento', 'Scenario di attività']],
          body: righeConfrontoRothC(dati.dettaglioRothC).map((r) => [
            r.etichetta,
            r.riferimento,
            r.attivita,
          ]),
          theme: 'grid',
          headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
          styles: { fontSize: 8.7, textColor: STONE, cellPadding: 2.5 },
          columnStyles: { 1: { halign: 'right', cellWidth: 35 }, 2: { halign: 'right', cellWidth: 35 } },
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 7
      }
    }

    const passaggi = calcolaPassaggi(dati, risultato)
    if (passaggi.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: marginX, right: marginX },
        head: [['Passaggi del calcolo (equazioni 1 e 2 dell\'allegato)', 'Valore']],
        body: passaggi.map((p) => [
          p.formula ? `${p.etichetta}\n${p.formula}` : p.etichetta,
          p.valore,
        ]),
        theme: 'grid',
        headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
        styles: { fontSize: 9, textColor: STONE, cellPadding: 2.5, valign: 'top' },
        columnStyles: { 1: { halign: 'right', cellWidth: 45 } },
        didParseCell: (data) => {
          // Nella prima colonna, la seconda riga (dopo il \n) è il calcolo coi numeri
          // reali sostituiti: la rendiamo più piccola e più chiara per distinguerla
          // dall'etichetta, mantenendo entrambe nella stessa cella così jspdf-autotable
          // calcola correttamente l'altezza della riga in automatico. Restiamo su
          // Helvetica (non un font monospaziato): i font base di jsPDF non garantiscono
          // la stessa larghezza dei caratteri di Helvetica per il calcolo dell'a-capo,
          // e cambiare font qui produceva testo che sconfinava fuori dalla cella.
          if (data.section === 'body' && data.column.index === 0) {
            const testo = data.cell.raw?.toString() ?? ''
            if (testo.includes('\n')) {
              data.cell.styles.fontSize = 8
            }
          }
        },
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
    y += boxHeight + 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...STONE_LIGHT)
    const righeFormulaBilancio = doc.splitTextToSize(
      formulaBilancioNetto(dati, risultato),
      pageWidth - marginX * 2,
    )
    doc.text(righeFormulaBilancio, marginX, y)
    y += righeFormulaBilancio.length * 3.5 + 4

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

  if (y > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage()
    y = 20
  }
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Conversione dei gas serra in CO2 equivalente', 'GWP', '']],
    body: GWP_VALORI.map((g) => [`${g.gas} (${g.formula})`, `${g.gwp}`, g.nota]),
    theme: 'grid',
    headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
    styles: { fontSize: 8.7, textColor: STONE, cellPadding: 2.5 },
    columnStyles: { 1: { halign: 'right', cellWidth: 20 }, 2: { fontSize: 7.8, textColor: STONE_LIGHT } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4
  y = paragrafo(doc, SPIEGAZIONE_CONVERSIONE_CO2EQ, y, marginX)

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
  const righe = doc.splitTextToSize(DISCLAIMER_REPORT, pageWidth - marginX * 2)
  doc.text(righe, marginX, y)

  return doc
}

