import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const demo = (p: string) => fileURLToPath(new URL(`./src/demo/${p}`, import.meta.url))

/**
 * Versione dimostrativa (`npm run build:demo`): al posto dei dati dell'azienda reale
 * (nome, logo, utenti, sito pubblico) entrano versioni neutre, così nel file pubblicato non restano.
 */
function sostituzioniDemo(): Plugin {
  return {
    name: 'sostituzioni-demo',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || importer.includes('/src/demo/')) return null
      if (/\/config\/azienda$/.test(source)) return demo('azienda.ts')
      if (/\/components\/Logo$/.test(source) || (source === './Logo' && importer.includes('/components/'))) return demo('Logo.tsx')
      if (/logo-marcantonio\.png$/.test(source)) return demo('logo-demo.png')
      if (/^\.\/public\//.test(source) || /^\.\/admin\/(CaseificioPage|MessaggiPage)$/.test(source)) return demo('Vuota.tsx')
      return null
    },
    // titolo, descrizione e icona neutri: nella demo non resta il nome dell'azienda
    transformIndexHtml(html) {
      const icona = `data:image/png;base64,${readFileSync(demo('favicon-demo.png')).toString('base64')}`
      return html
        .replace(/<title>[^<]*<\/title>/, '<title>Gestionale di stalla · demo</title>')
        .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Versione dimostrativa del gestionale di stalla, con dati inventati." />')
        .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/png" href="${icona}" />`)
        .replace(/<link rel="apple-touch-icon"[^>]*>\s*/, '')
    },
  }
}

export default defineConfig(({ mode }) => {
  if (mode === 'demo') process.env.TEMA_DEMO = '1' // colori della demo (tailwind.config.js)
  return {
  base: './',
  plugins: [react(), ...(mode === 'demo' ? [sostituzioniDemo()] : [])],
  publicDir: mode === 'demo' ? false : 'public', // le icone dell'azienda non entrano nella demo
  }
})
