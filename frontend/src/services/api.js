// Plik: services/api.js
// Prekonfigurowana instancja axios z interceptorami dla odświeżania tokena.
// (Użycie opcjonalne – w projekcie można używać axios bezpośrednio z nagłówkiem).

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Interceptor do dodawania tokena do każdego żądania
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor do obsługi wygaśnięcia tokena (automatyczne odświeżanie)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/refresh`, null, {
          params: { refresh_token: refresh }
        });
        const { access_token, refresh_token } = res.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (err) {
        // Odświeżenie nieudane – wyloguj
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;