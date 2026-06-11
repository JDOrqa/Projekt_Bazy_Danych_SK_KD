import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../api/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    const loadUser = async () => {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/api/users/me');
          setUser(res.data);
        } catch (err) {
          console.error('Błąd ładowania profilu', err);
          await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);
const login = async (email, password) => {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  const url = `${api.defaults.baseURL}/api/auth/login`;
    const res = await axios.post(`${api.defaults.baseURL}/api/auth/login`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const { access_token, refresh_token } = res.data;
    await AsyncStorage.setItem('access_token', access_token);
    await AsyncStorage.setItem('refresh_token', refresh_token);
    
    const userRes = await api.get('/api/users/me');
    setUser(userRes.data);
    return userRes.data;
  };

  const register = async (userData) => {
    const res = await axios.post(`${api.defaults.baseURL}/api/auth/register`, userData);
    return res.data;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};