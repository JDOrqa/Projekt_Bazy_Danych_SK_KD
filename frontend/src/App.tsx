import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { FishingGrounds } from './pages/FishingGrounds';
import { AddFishingGround } from './pages/AddFishingGround';
import { FishingGroundDetail } from './pages/FishingGroundDetail';
import { Profile } from './pages/Profile';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/lowiska" element={<FishingGrounds />} />
            <Route path="/lowiska/dodaj" element={<AddFishingGround />} />
            <Route path="/lowiska/:id" element={<FishingGroundDetail />} />
            <Route path="/lowiska/:id/edytuj" element={<AddFishingGround />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/sesje" element={<NotFound />} />
            <Route path="/sesje/rozpocznij" element={<NotFound />} />
            <Route path="/sesje/:id" element={<NotFound />} />
            <Route path="/gatunki" element={<NotFound />} />
            <Route path="/weryfikacja" element={<NotFound />} />
            <Route path="/stacje" element={<NotFound />} />
            <Route path="/limity" element={<NotFound />} />
            <Route path="/admin" element={<NotFound />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
