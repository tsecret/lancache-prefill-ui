
import { Route, Routes } from 'react-router'
import Header from './components/Header'
import DashboardPage from './pages/Dashboard.page'
import SettingsPage from './pages/Settings.page'



export function App() {

  return (
    <main>
      <Header />
      <Routes>
        <Route path='/' element={<DashboardPage />} />
        <Route path='/settings' element={<SettingsPage />} />
      </Routes>
    </main>
    )
}
