import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { FishingGrounds } from './pages/FishingGrounds';
import { AddFishingGround } from './pages/AddFishingGround';
import { Sessions } from './pages/Sessions';
import { StartSession } from './pages/StartSession';
import { SessionDetail } from './pages/SessionDetail';
import { Species } from './pages/Species';
import { Verification } from './pages/Verification';
import { Stations } from './pages/Stations';
import { Limits } from './pages/Limits';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/register',
    element: <Register />
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'lowiska',
        element: <FishingGrounds />
      },
      {
        path: 'lowiska/dodaj',
        element: <AddFishingGround />
      },
      {
        path: 'lowiska/:id',
        element: <AddFishingGround />
      },
      {
        path: 'sesje',
        element: <Sessions />
      },
      {
        path: 'sesje/rozpocznij',
        element: <StartSession />
      },
      {
        path: 'sesje/:id',
        element: <SessionDetail />
      },
      {
        path: 'gatunki',
        element: <Species />
      },
      {
        path: 'weryfikacja',
        element: <Verification />
      },
      {
        path: 'stacje',
        element: <Stations />
      },
      {
        path: 'limity',
        element: <Limits />
      },
      {
        path: 'admin',
        element: <Admin />
      },
      {
        path: 'profile',
        element: <Profile />
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
]);
