// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [accessToken, setAccessToken] = useState(localStorage.getItem('access_token'));
    const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token'));
    const [user, setUser] = useState(null);

    const fetchUser = useCallback(async (token) => {
        if (!token) return;
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
        } catch (err) {
            console.error('Błąd pobierania profilu', err);
        }
    }, []);

    const refreshAccessToken = useCallback(async () => {
        if (!refreshToken) return;
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/refresh`, null, {
                params: { refresh_token: refreshToken }
            });
            const { access_token, refresh_token } = response.data;
            setAccessToken(access_token);
            setRefreshToken(refresh_token);
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            await fetchUser(access_token);
        } catch (err) {
            console.error('Odświeżanie tokena nieudane', err);
            logout();
        }
    }, [refreshToken, fetchUser]);

    useEffect(() => {
        if (accessToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            fetchUser(accessToken);
            const interval = setInterval(refreshAccessToken, 1000 * 60 * 25); // co 25 minut
            return () => clearInterval(interval);
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [accessToken, fetchUser, refreshAccessToken]);

    const login = useCallback((access, refresh) => {
        setAccessToken(access);
        setRefreshToken(refresh);
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        fetchUser(access);
    }, [fetchUser]);

    const refreshUser = useCallback(async () => {
        if (!accessToken) return;
        await fetchUser(accessToken);
    }, [accessToken, fetchUser]);

    const logout = useCallback(() => {
        setAccessToken(null);
        setRefreshToken(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    }, []);

    const authValue = useMemo(
        () => ({ accessToken, refreshToken, user, login, logout, refreshUser }),
        [accessToken, refreshToken, user, login, logout, refreshUser]
    );

    return (
        <AuthContext.Provider value={authValue}>
            {children}
        </AuthContext.Provider>
    );
};
