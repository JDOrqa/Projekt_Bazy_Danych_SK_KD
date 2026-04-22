// Plik: pages/Dashboard.js
// Strona główna po zalogowaniu – wyświetla statystyki użytkownika.
// Wykorzystuje endpoint /api/users/dashboard

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState({ liczba_sesji: 0, liczba_zlowionych_ryb: 0, ulubione_lowisko: null, ostatnie_polowy: [] });

  useEffect(() => {
    const fetchDashboard = async () => {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/dashboard`, { // Ustawienie nagłówków z tokenem autoryzacji
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setStats(res.data);
    };
    fetchDashboard();
  }, [accessToken]);

  return (
    <div className="container mt-4">
      <h2>Dashboard</h2>
      <div className="row">
      <div className="col-md-4">
       <div className="card text-white bg-primary mb-3">
       <div className="card-header">Sesje połowów</div>
       <div className="card-body"><h1>{stats.liczba_sesji}</h1></div>
        </div>
        </div>
        <div className="col-md-4">
        <div className="card text-white bg-success mb-3">
        <div className="card-header">Złowione ryby</div>
         <div className="card-body"><h1>{stats.liczba_zlowionych_ryb}</h1></div>
         </div>
        </div>
        <div className="col-md-4">
        <div className="card text-white bg-info mb-3">
         <div className="card-header">Ulubione łowisko</div>
         <div className="card-body">{stats.ulubione_lowisko || 'Brak'}</div>
        </div>
       </div>
      </div>
      <h3>Ostatnie połowy</h3>
      <table className="table">
        <thead><tr><th>Gatunek</th><th>Waga (kg)</th><th>Data</th></tr></thead>
        <tbody>
          {stats.ostatnie_polowy.map((p, idx) => (
              <tr key={idx}><td>{p.gatunek}</td><td>{p.waga_kg}</td><td>{new Date(p.data).toLocaleString()}</td></tr> // Formatowanie daty do czytelnej formy
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Dashboard;