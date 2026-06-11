// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';

export const AuthContext = createContext(); // Tworzymy kontekst autoryzacji, który będzie przechowywał informacje o tokenach, użytkowniku i funkcjach logowania/wylogowania.

export const useAuth = () => useContext(AuthContext); // useAuth pozwala na szybki dostęp do danych i funkcji związanych z autoryzacją bez konieczności ręcznego importowania kontekstu i używania useContext w każdym komponencie.

export const AuthProvider = ({ children }) => { // Główna logika autoryzacji – zarządzanie tokenami, pobieranie danych użytkownika, odświeżanie tokenów i funkcje logowania/wylogowania.
    const [accessToken, setAccessToken] = useState(localStorage.getItem('access_token')); // Przechowuje access token w stanie, inicjalizując go z localStorage, jeśli jest dostępny.Dzięki temu po odświeżeniu strony nadal będziemy zalogowani, jeśli tokeny są ważne.
    const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token')); // Przechowuje refresh token w stanie, inicjalizując go z localStorage, jeśli jest dostępny. Dzięki temu po odświeżeniu strony nadal będziemy mogli odświeżać access token, jeśli refresh token jest ważny.
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async (token) => { // Funkcja do pobierania danych użytkownika na podstawie tokena. Ustawia dane użytkownika w stanie.
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/me`, { // Endpoint do pobierania danych aktualnie zalogowanego użytkownika
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
        } catch (err) {
            console.error('Błąd pobierania profilu', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshAccessToken = useCallback(async () => { // Funkcja do odświeżania tokena, wywoływana co 50 sekund
        if (!refreshToken) return;
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/refresh`, { 
                refresh_token: refreshToken
            }, {
                headers: { 'Content-Type': 'application/json' } // Wymuszamy JSON, bo backend tego oczekuje
            }); 
            const { access_token, refresh_token } = response.data; // Backend zwraca nowe tokeny
            setAccessToken(access_token); // Aktualizujemy tokeny w stanie
            setRefreshToken(refresh_token); // Aktualizujemy tokeny w stanie
            localStorage.setItem('access_token', access_token); // Zapisujemy nowe tokeny w localStorage, żeby były dostępne przy odświeżeniu strony
            localStorage.setItem('refresh_token', refresh_token); // Zapisujemy nowe tokeny w localStorage, żeby były dostępne przy odświeżeniu strony
            axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`; // Ustawiamy nowy token w nagłówkach, żeby kolejne żądania były autoryzowane
            await fetchUser(access_token);
        } catch (err) {
            console.error('Odświeżanie tokena nieudane', err);
            logout();
        }
    }, [refreshToken, fetchUser]);

    useEffect(() => { // Przy pierwszym załadowaniu sprawdzamy, czy mamy tokeny i jeśli tak, to ustawiamy nagłówek i pobieramy dane użytkownika. Ustawiamy też interwał do odświeżania tokena.
        if (accessToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`; // Ustawiamy token w nagłówkach, żeby kolejne żądania były autoryzowane
            fetchUser(accessToken);
            const interval = setInterval(refreshAccessToken, 1000 * 60 * 15); // Odświeżaj co 15 min
            return () => clearInterval(interval);
        } else {
            delete axios.defaults.headers.common['Authorization']; // Jeśli nie mamy tokena, upewniamy się, że nagłówek jest czysty
            setLoading(false);
        }
    }, [accessToken, fetchUser, refreshAccessToken]);

    const login = useCallback((access, refresh) => { // Ustawia tokeny, zapisuje je w localStorage, ustawia nagłówek i pobiera dane użytkownika
        setLoading(true);
        setAccessToken(access);
        setRefreshToken(refresh);
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access}`; // Ustawiamy token w nagłówkach, żeby kolejne żądania były autoryzowane
        fetchUser(access);
    }, [fetchUser]);

    const refreshUser = useCallback(async () => { // Odświeża dane użytkownika
        if (!accessToken) return;
        await fetchUser(accessToken);
    }, [accessToken, fetchUser]);

    const logout = useCallback(() => { // Usuwa tokeny, czyści dane użytkownika i nagłówki
        setAccessToken(null);
        setRefreshToken(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    }, []);

    const authValue = useMemo( // Memoizujemy wartość kontekstu, żeby nie powodować niepotrzebnych renderów
        () => ({ accessToken, refreshToken, user, loading, login, logout, refreshUser }), // Zwracamy wszystkie potrzebne dane i funkcje w kontekście
        [accessToken, refreshToken, user, loading, login, logout, refreshUser] // Odświeżamy wartość tylko gdy któreś z tych pól się zmieni
    );

    return (
        <AuthContext.Provider value={authValue}>
            {children}
        </AuthContext.Provider>
    );
};
