import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// HashRouter (invece di BrowserRouter) mantiene lo stato di navigazione nel
// frammento dell'URL (#/...): funziona indipendentemente dal percorso reale su
// cui l'app viene servita (utile in particolare per le anteprime pubblicate
// come artifact, ospitate su un dominio/percorso dedicato non prevedibile).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
