// Plik: pages/Register.js
// Formularz rejestracji – wysyła dane do /api/auth/register
// Po sukcesie wyświetla komunikat o konieczności potwierdzenia email.

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [form, setForm] = useState({ email: '', password: '', imie: '', nazwisko: '', nr_licencji: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/register`, form);
      setMessage('Rejestracja udana. Sprawdź email w celu aktywacji konta.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Błąd rejestracji');
    }
  };

  return (
    <div className="container mt-5">
      <h2>Rejestracja</h2>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input name="email" type="email" placeholder="Email" className="form-control mb-2" onChange={handleChange} required />
        <input name="password" type="password" placeholder="Hasło (min 8 znaków)" className="form-control mb-2" onChange={handleChange} required />
        <input name="imie" placeholder="Imię" className="form-control mb-2" onChange={handleChange} required />
        <input name="nazwisko" placeholder="Nazwisko" className="form-control mb-2" onChange={handleChange} required />
        <input name="nr_licencji" placeholder="Numer licencji" className="form-control mb-2" onChange={handleChange} />
        <button type="submit" className="btn btn-primary">Zarejestruj</button>
      </form>
    </div>
  );
}

export default Register;