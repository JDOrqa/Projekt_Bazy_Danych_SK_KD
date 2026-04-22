// Plik: pages/Login.js
// Formularz logowania – używa AuthContext do przechowania tokenów.
// Po zalogowaniu przekierowuje na dashboard.

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            
            const params = new URLSearchParams(); // Tworzymy obiekt URLSearchParams, który automatycznie zakoduje dane w formacie application/x-www-form-urlencoded bo oauth2 tego wymaga
            params.append('username', email); 
            params.append('password', password); 
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/login`, params, { 
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const { access_token, refresh_token } = res.data;
            login(access_token, refresh_token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Błąd logowania');
        }
    };

    return (
        <div className="container mt-5" style={{ maxWidth: '400px' }}>
            <h2>Logowanie</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    className="form-control mb-2"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                    required
                />
                <input
                    type="password"
                    className="form-control mb-2"
                    placeholder="Hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    maxLength={128}
                    required
                />
                <button type="submit" className="btn btn-primary w-100">Zaloguj</button>
            </form>
            <div className="mt-3 text-center">
                Nie masz konta? <Link to="/register">Zarejestruj się</Link>
            </div>
        </div>
    );
}

export default Login;