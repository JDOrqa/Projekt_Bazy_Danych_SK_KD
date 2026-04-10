import React, { createContext, useContext, useState, ReactNode } from 'react';
import axios from 'axios';
import { User as UserType, Role } from '../types';

// Określ API URL na podstawie środowiska
const getApiUrl = () => {
  // Jeśli jest zmienna env VITE_API_URL (z docker-compose)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Jeśli jest zminna globalnie
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:8000`;
  }
  // Domyślnie dla dev
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiUrl();

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  licenseNumber?: string;
  status: 'active' | 'inactive' | 'blocked';
  roles: Role[];
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  gdprConsent: boolean;
  marketingConsent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('fish_track_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (email: string, password: string) => {
    try {
      // Backend oczekuje form-encoded data dla OAuth2
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const token = response.data.access_token;
      localStorage.setItem('auth_token', token);

      // Fetch user data
      const userResponse = await axios.get(`${API_BASE_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('User response:', userResponse.data);

      const mockUser: User = {
        id: String(userResponse.data.id || '1'),
        email: userResponse.data.email || email,
        firstName: userResponse.data.imie || 'Jan',
        lastName: userResponse.data.nazwisko || 'Kowalski',
        licenseNumber: userResponse.data.nr_licencji || undefined,
        status: userResponse.data.status || 'active',
        roles: userResponse.data.roles || [
          {
            id: '1',
            name: 'Wędkarz',
            description: 'Podstawowy użytkownik systemu',
            permissions: []
          }
        ]
      };

      console.log('Setting user:', mockUser);
      setUser(mockUser);
      localStorage.setItem('fish_track_user', JSON.stringify(mockUser));
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.detail || 'Błąd logowania');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        email: data.email,
        password: data.password,
        imie: data.firstName,
        nazwisko: data.lastName,
        zgoda_marketingowa: data.marketingConsent
      });

      // Backend zwraca token po rejestracji
      const token = response.data.access_token;
      localStorage.setItem('auth_token', token);

      // Pobierz dane użytkownika z tokenem
      const userResponse = await axios.get(`${API_BASE_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const newUser: User = {
        id: String(userResponse.data.id || '1'),
        email: userResponse.data.email || data.email,
        firstName: userResponse.data.imie || data.firstName,
        lastName: userResponse.data.nazwisko || data.lastName,
        licenseNumber: userResponse.data.nr_licencji || undefined,
        status: userResponse.data.status || 'active',
        roles: [
          {
            id: '1',
            name: 'Wędkarz',
            description: 'Podstawowy użytkownik systemu',
            permissions: []
          }
        ]
      };

      setUser(newUser);
      localStorage.setItem('fish_track_user', JSON.stringify(newUser));
    } catch (error: any) {
      console.error('Register error:', error);
      throw new Error(error.response?.data?.detail || 'Błąd rejestracji');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fish_track_user');
    localStorage.removeItem('auth_token');
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;

    try {
      const token = localStorage.getItem('auth_token');
      
      // Mapuj pola na polską konwencję backendu
      const updatePayload = {
        imie: data.firstName,
        nazwisko: data.lastName,
        nr_licencji: data.licenseNumber
      };

      const response = await axios.put(`${API_BASE_URL}/api/users/me`, updatePayload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const updatedUser: User = {
        id: String(response.data.id || user.id),
        email: response.data.email || user.email,
        firstName: response.data.imie || user.firstName,
        lastName: response.data.nazwisko || user.lastName,
        licenseNumber: response.data.nr_licencji || user.licenseNumber,
        status: response.data.status || user.status,
        roles: user.roles
      };

      setUser(updatedUser);
      localStorage.setItem('fish_track_user', JSON.stringify(updatedUser));
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error(error.response?.data?.detail || 'Błąd aktualizacji profilu');
    }
  };

  const deleteAccount = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(`${API_BASE_URL}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser(null);
      localStorage.removeItem('fish_track_user');
      localStorage.removeItem('auth_token');
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Błąd usuwania konta');
    }
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    return user.roles.some(role => role.name === roleName);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, deleteAccount, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
