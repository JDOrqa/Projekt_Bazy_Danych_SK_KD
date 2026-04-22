// Plik: services/api.js
// Tworzy gotową instancję axios z automatycznym dodawaniem tokena
// i mechanizmem odświeżania access tokena (refresh token flow).

import axios from 'axios';
// Import biblioteki axios do wykonywania zapytań HTTP

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    // Ustawia bazowy adres API 
    // Dzięki temu nie musisz pisać pełnych URL-i w każdym requestcie

    headers: { 'Content-Type': 'application/json' }
    // Domyślnie każde żądanie będzie wysyłać JSON
});



// Ten interceptor odpala się PRZED każdym requestem
api.interceptors.request.use((config) => {

    const token = localStorage.getItem('access_token');
    // Pobiera access token z localStorage (jeśli istnieje)

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // Dodaje token do nagłówka Authorization
        // Dzięki temu backend wie, że użytkownik jest zalogowany
    }

    return config;
    // Zwraca zmodyfikowaną konfigurację requestu
});




// Ten interceptor odpala się PO odpowiedzi z backendu
api.interceptors.response.use(

    (response) => response,
    // Jeśli response jest OK (2xx), po prostu zwróć odpowiedź dalej

    async (error) => {
        // Jeśli wystąpił błąd

        const originalRequest = error.config;
        // Zapamiętujemy oryginalne żądanie, które się nie udało

        if (error.response?.status === 401 && !originalRequest._retry) {
            // Jeśli:
            // - mamy 401 Unauthorized (token wygasł)
            // - i jeszcze nie próbowaliśmy retry

            originalRequest._retry = true;
            // Oznaczamy, że już próbowaliśmy ponownie (żeby nie zrobić pętli)

            try {
                const refresh = localStorage.getItem('refresh_token');
                // Pobieramy refresh token (służy do odświeżania access tokena)

                const res = await axios.post(
                    `${process.env.REACT_APP_API_URL}/api/auth/refresh`,
                    {
                        refresh_token: refresh
                        // Wysyłamy refresh token do backendu
                    },
                    {
                        headers: { 'Content-Type': 'application/json' }
                        // Wymuszamy JSON
                    }
                );

                const { access_token, refresh_token } = res.data;
                // Backend zwraca nowe tokeny

                localStorage.setItem('access_token', access_token);
                localStorage.setItem('refresh_token', refresh_token);
                // Zapisujemy nowe tokeny w localStorage

                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                // Podmieniamy token w oryginalnym requestcie

                return api(originalRequest);
                // Powtarzamy pierwotne żądanie już z nowym tokenem
            }
            catch (err) {
                // Jeśli refresh token też jest nieważny lub coś padło

                localStorage.clear();
                // Usuwamy wszystkie dane logowania

                window.location.href = '/login';
                // Przekierowanie na login

                return Promise.reject(err);
                // Zwracamy błąd dalej
            }
        }

        return Promise.reject(error);
        // Jeśli to nie 401 → normalnie zwracamy błąd
    }
);

export default api;
// Eksportujemy gotową instancję axios do użycia w całej aplikacji