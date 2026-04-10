// Plik: components/PrivateRoute.js
// Komponent chroniący trasy – wymaga zalogowania.
// Jeśli brak tokena, przekierowuje do /login.

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PrivateRoute({ children }) {
  const { accessToken } = useAuth();
  return accessToken ? children : <Navigate to="/login" />;
}

export default PrivateRoute;