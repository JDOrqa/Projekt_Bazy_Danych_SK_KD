// Plik: pages/GatunkiList.js
// Lista gatunków. Jeśli użytkownik ma rolę Moderator lub Admin, może dodawać/edytować/usunąć.

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function GatunkiList() {
    const [gatunki, setGatunki] = useState([]); // Przechowuje listę gatunków w stanie
    const [editMode, setEditMode] = useState(null); // Przechowuje ID gatunku, który jest aktualnie edytowany. Jeśli null, to żaden gatunek nie jest w trybie edycji. Jeśli 'new', to dodajemy nowy gatunek.
    const [form, setForm] = useState({ nazwa_polska: '', nazwa_lacina: '', url_zdjecia: '', opis: '' }); 
    const { accessToken, user } = useAuth();
    const canEdit = user?.roles?.some(r => ['Admin', 'Moderator'].includes(r)); 
    const fetchGatunki = useCallback(async () => {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/gatunki`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        setGatunki(res.data);
    }, [accessToken]);

    useEffect(() => {
        fetchGatunki();
    }, [fetchGatunki]);

  const handleSubmit = async (e, id = null) => {
    e.preventDefault();
    if (id) {
        await axios.put(`${process.env.REACT_APP_API_URL}/api/admin/gatunki/${id}`, form, { // Jeśli id jest podane, to aktualizujemy istniejący gatunek axios.put, w przeciwnym razie tworzymy nowy axios.post
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } else {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/admin/gatunki`, form, {   
        headers: { Authorization: `Bearer ${accessToken}` }  
      });
    }
    setEditMode(null);
    setForm({ nazwa_polska: '', nazwa_lacina: '', url_zdjecia: '', opis: '' });
    fetchGatunki();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Usunąć gatunek?')) {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/admin/gatunki/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchGatunki();
    }
  };

  return (
    <div className="container mt-4">
      <h2>Gatunki ryb</h2>
      {canEdit && (
        <button className="btn btn-primary mb-3" onClick={() => setEditMode('new')}>Dodaj nowy gatunek</button>
      )}
      {(editMode === 'new') && (
        <form onSubmit={(e) => handleSubmit(e)} className="border p-3 mb-3">
                  <input placeholder="Nazwa polska" className="form-control mb-2" onChange={e => setForm({ ...form, nazwa_polska: e.target.value })} maxLength={255} required />
                  <input placeholder="Nazwa łacińska" className="form-control mb-2" onChange={e => setForm({ ...form, nazwa_lacina: e.target.value })} maxLength={255} required />
                  <input placeholder="URL zdjęcia" className="form-control mb-2" onChange={e => setForm({ ...form, url_zdjecia: e.target.value })} maxLength={255} />
          <textarea placeholder="Opis" className="form-control mb-2" onChange={e => setForm({...form, opis: e.target.value})} maxLength={1000} />
          <button type="submit" className="btn btn-success">Zapisz</button>
          <button type="button" className="btn btn-secondary" onClick={() => setEditMode(null)}>Anuluj</button>
        </form>
      )}
      <div className="row">
        {gatunki.map(g => (
          <div key={g.id} className="col-md-4 mb-3">
            <div className="card">
              {g.url_zdjecia && <img src={g.url_zdjecia} className="card-img-top" alt={g.nazwa_polska} style={{height: '150px', objectFit: 'cover'}} />}
              <div className="card-body">
                <h5>{g.nazwa_polska}</h5>
                <p><em>{g.nazwa_lacina}</em></p>
                <p>{g.opis}</p>
                {canEdit && (
                  <div>
                    <button className="btn btn-sm btn-warning" onClick={() => { setEditMode(g.id); setForm(g); }}>Edytuj</button>
                    <button className="btn btn-sm btn-danger ml-2" onClick={() => handleDelete(g.id)}>Usuń</button>
                  </div>
                )}
              </div>
            </div>
            {editMode === g.id && (
              <form onSubmit={(e) => handleSubmit(e, g.id)} className="mt-2 border p-2">
                <input value={form.nazwa_polska} onChange={e => setForm({...form, nazwa_polska: e.target.value})} className="form-control mb-1" maxLength={255} />
                <input value={form.nazwa_lacina} onChange={e => setForm({...form, nazwa_lacina: e.target.value})} className="form-control mb-1" maxLength={255} />
                <input value={form.url_zdjecia} onChange={e => setForm({...form, url_zdjecia: e.target.value})} className="form-control mb-1" maxLength={255} />
                <textarea value={form.opis} onChange={e => setForm({...form, opis: e.target.value})} className="form-control mb-1" maxLength={1000} />
                <button type="submit" className="btn btn-success btn-sm">Zapisz</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditMode(null)}>Anuluj</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GatunkiList;