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
import PesataPage from './admin/PesataPage'
import LattePage from './admin/LattePage'
import RobotPage from './admin/RobotPage'
import SalutePage from './admin/SalutePage'
import FarmaciPage from './admin/FarmaciPage'
import PartiPage from './admin/PartiPage'
import VitelliPage from './admin/VitelliPage'
import FertilitaPage from './admin/FertilitaPage'
import CaricaSettimanaPage from './admin/CaricaSettimanaPage'
import { RichiedeAccesso } from './lib/auth'
import type { ReactNode } from 'react'

/** Pagine riservate al titolare. */
const T = (el: ReactNode) => <RichiedeAccesso ruoli={['titolare']}>{el}</RichiedeAccesso>

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
        <Route index element={T(<DashboardPage />)} />
        <Route path="pesata" element={<PesataPage />} />
        <Route path="latte" element={T(<LattePage />)} />
        <Route path="mungiture" element={T(<RobotPage />)} />
        <Route path="salute" element={T(<SalutePage />)} />
        <Route path="farmaci" element={T(<FarmaciPage />)} />
        <Route path="parti" element={T(<PartiPage />)} />
        <Route path="vitelli" element={T(<VitelliPage />)} />
        <Route path="fertilita" element={T(<FertilitaPage />)} />
        <Route path="margine" element={<Navigate to="/area-riservata/alimentazione?scheda=margine" replace />} />
        <Route path="carica" element={T(<CaricaSettimanaPage />)} />
        <Route path="mandria" element={T(<MandriaPage />)} />
        <Route path="produzione" element={T(<ProduzionePage />)} />
        <Route path="qualita" element={T(<QualitaPage />)} />
        <Route path="alimentazione" element={T(<AlimentazionePage />)} />
        <Route path="caseificio" element={T(<CaseificioPage />)} />
        <Route path="consegne" element={T(<ConsegnePage />)} />
        <Route path="messaggi" element={T(<MessaggiPage />)} />
        <Route path="impostazioni" element={T(<ImpostazioniPage />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
