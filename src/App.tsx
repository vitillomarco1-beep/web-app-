import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import NewCalculationPage from './pages/NewCalculationPage'
import CalculationDetailPage from './pages/CalculationDetailPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/clienti" element={<ClientsPage />} />
        <Route path="/clienti/:clientId" element={<ClientDetailPage />} />
        <Route path="/clienti/:clientId/nuovo-calcolo" element={<NewCalculationPage />} />
        <Route path="/clienti/:clientId/calcoli/:calcId" element={<CalculationDetailPage />} />
      </Route>
    </Routes>
  )
}
