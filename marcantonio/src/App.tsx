import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from './public/PublicLayout'
import HomePage from './public/HomePage'
import AziendaPage from './public/AziendaPage'
import ProdottiPage from './public/ProdottiPage'
import ContattiPage from './public/ContattiPage'
import AdminLayout from './admin/AdminLayout'
import LoginPage from './admin/LoginPage'
import DashboardPage from './admin/DashboardPage'
import MandriaPage from './admin/MandriaPage'
import ProduzionePage from './admin/ProduzionePage'
import QualitaPage from './admin/QualitaPage'
import ConsegnePage from './admin/ConsegnePage'
import CaseificioPage from './admin/CaseificioPage'
import AlimentazionePage from './admin/AlimentazionePage'
import MessaggiPage from './admin/MessaggiPage'
import ImpostazioniPage from './admin/ImpostazioniPage'
import { RichiedeAccesso } from './lib/auth'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="azienda" element={<AziendaPage />} />
        <Route path="prodotti" element={<ProdottiPage />} />
        <Route path="contatti" element={<ContattiPage />} />
      </Route>
      <Route path="area-riservata/login" element={<LoginPage />} />
      <Route
        path="area-riservata"
        element={
          <RichiedeAccesso>
            <AdminLayout />
          </RichiedeAccesso>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="mandria" element={<MandriaPage />} />
        <Route path="produzione" element={<ProduzionePage />} />
        <Route path="qualita" element={<QualitaPage />} />
        <Route path="alimentazione" element={<AlimentazionePage />} />
        <Route path="caseificio" element={<CaseificioPage />} />
        <Route path="consegne" element={<ConsegnePage />} />
        <Route path="messaggi" element={<MessaggiPage />} />
        <Route path="impostazioni" element={<ImpostazioniPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
