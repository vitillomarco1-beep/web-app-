import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import NewCalculationPage from './pages/NewCalculationPage'
import CalculationDetailPage from './pages/CalculationDetailPage'
import NormativaPage from './pages/NormativaPage'
import GroupsPage from './pages/GroupsPage'
import GroupDetailPage from './pages/GroupDetailPage'
import NewGroupCalculationPage from './pages/NewGroupCalculationPage'
import GroupCalculationDetailPage from './pages/GroupCalculationDetailPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/clienti" element={<ClientsPage />} />
        <Route path="/clienti/:clientId" element={<ClientDetailPage />} />
        <Route path="/clienti/:clientId/nuovo-calcolo" element={<NewCalculationPage />} />
        <Route path="/clienti/:clientId/calcoli/:calcId" element={<CalculationDetailPage />} />
        <Route path="/gruppi" element={<GroupsPage />} />
        <Route path="/gruppi/:gruppoId" element={<GroupDetailPage />} />
        <Route path="/gruppi/:gruppoId/nuovo-calcolo" element={<NewGroupCalculationPage />} />
        <Route
          path="/gruppi/:gruppoId/calcoli/:calcId"
          element={<GroupCalculationDetailPage />}
        />
        <Route path="/normativa" element={<NormativaPage />} />
      </Route>
    </Routes>
  )
}
