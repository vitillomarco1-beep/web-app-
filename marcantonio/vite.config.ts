import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

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
  }
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'demo' ? [sostituzioniDemo()] : [])],
}))
