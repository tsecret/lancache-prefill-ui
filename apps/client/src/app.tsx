
import { Route, Routes } from 'react-router'
import Header from './components/Header'
import DashboardPage from './pages/Dashboard.page'
import DevicesPage from './pages/Devices.page'
import Games from './pages/Games.page'
import SettingsPage from './pages/Settings.page'
import StatsPage from './pages/Stats.page'



export function App() {

  return (
    <main>
      <Header />
      <Routes>
        <Route path='/' element={<DashboardPage />} />
        <Route path='/settings' element={<SettingsPage />} />
        <Route path='/games' element={<Games />} />
        <Route path='/stats' element={<StatsPage />} />
        <Route path='/devices' element={<DevicesPage />} />
      </Routes>
    </main>
    )
}
