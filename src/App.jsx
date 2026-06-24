import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AddProperty from './pages/AddProperty'
import PropertyDetail from './pages/PropertyDetail'
import Contacts from './pages/Contacts'
import Financials from './pages/Financials'
import MapView from './pages/MapView'
import Profile from './pages/Profile'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/properties/new" element={<AddProperty />} />
                <Route path="/properties/:id" element={<PropertyDetail />} />
                <Route path="/map" element={<MapView />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/financials" element={<Financials />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
