// Plik: pages/ZarybieniePage.js
// Rejestr zarybień – widok dla Admina i Właściciela.
// Pełny CRUD: lista, dodawanie, edycja, usuwanie.

import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PUSTY_FORMULARZ = {
  lowisko_id: '',
  gatunek_id: '',
  data_zarybienia: '',
  ilosc: '',
  koszt: '',
  uwagi: '',
};

function ZarybieniePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [zarybienia, setZarybienia] = useState([]);
  const [lowiska, setLowiska] = useState([]);
  const [gatunki, setGatunki] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blad, setBlad] = useState(null);
  const [sukces, setSukces] = useState(null);

  const [formularz, setFormularz] = useState(PUSTY_FORMULARZ);
  const [edytowanyId, setEdytowanyId] = useState(null);
  const [pokazFormularz, setPokazFormularz] = useState(false);
  const [filtrLowisko, setFiltrLowisko] = useState('');

  const pobierzDane = useCallback(async () => {
    setLoading(true);
    try {
      const [zRes, lRes, gRes] = await Promise.all([
        api.get('/api/zarybienia/'),
        api.get('/api/lakes/'),
        api.get('/api/admin/gatunki'),
      ]);
      setZarybienia(zRes.data);
      setLowiska(lRes.data);
      setGatunki(gRes.data);
    } catch (err) {
      setBlad('Błąd pobierania danych: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    pobierzDane();
  }, [pobierzDane]);

  const pokazKomunikat = (msg, typ = 'sukces') => {
    if (typ === 'sukces') setSukces(msg);
    else setBlad(msg);
    setTimeout(() => { setSukces(null); setBlad(null); }, 4000);
  };

  const handleZmiana = (e) => {
    const { name, value } = e.target;
    setFormularz(prev => ({ ...prev, [name]: value }));
  };

  const resetFormularz = () => {
    setFormularz(PUSTY_FORMULARZ);
    setEdytowanyId(null);
    setPokazFormularz(false);
  };

  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
      const roles = user?.roles || [];
      setCanCreate(roles.includes('Właściciel') || roles.includes('Admin'));
      pobierzDane();
  }, [user, pobierzDane]);

  const otworzDodawanie = () => {
    setFormularz({
      ...PUSTY_FORMULARZ,
      data_zarybienia: new Date().toISOString().split('T')[0],
    });
    setEdytowanyId(null);
    setPokazFormularz(true);
  };

  const otworzEdycje = (z) => {
    setFormularz({
      lowisko_id: z.lowisko_id,
      gatunek_id: z.gatunek_id,
      data_zarybienia: z.data_zarybienia,
      ilosc: z.ilosc ?? '',
      koszt: z.koszt ?? '',
      uwagi: z.uwagi ?? '',
    });
    setEdytowanyId(z.id);
    setPokazFormularz(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleZapisz = async (e) => {
    e.preventDefault();
    if (!formularz.data_zarybienia) {
      setBlad('Podaj datę zarybienia.');
      return;
    }
    if (!edytowanyId && (!formularz.lowisko_id || !formularz.gatunek_id)) {
      setBlad('Wybierz łowisko i gatunek.');
      return;
    }

    try {
      if (edytowanyId) {
        const payload = {
          data_zarybienia: formularz.data_zarybienia,
        };
        if (formularz.ilosc !== '') payload.ilosc = parseInt(formularz.ilosc);
        if (formularz.koszt !== '') payload.koszt = parseFloat(formularz.koszt);
        if (formularz.uwagi !== '') payload.uwagi = formularz.uwagi;
        await api.put(`/api/zarybienia/${edytowanyId}`, payload);
        pokazKomunikat('Zarybienie zaktualizowane.');
      } else {
        const payload = {
          lowisko_id: parseInt(formularz.lowisko_id),
          gatunek_id: parseInt(formularz.gatunek_id),
          data_zarybienia: formularz.data_zarybienia,
        };
        if (formularz.ilosc !== '') payload.ilosc = parseInt(formularz.ilosc);
        if (formularz.koszt !== '') payload.koszt = parseFloat(formularz.koszt);
        if (formularz.uwagi !== '') payload.uwagi = formularz.uwagi;
        await api.post('/api/zarybienia/', payload);
        pokazKomunikat('Zarybienie dodane.');
      }
      resetFormularz();
      await pobierzDane();
    } catch (err) {
      setBlad('Błąd zapisu: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleUsun = async (id) => {
    if (!window.confirm('Czy na pewno usunąć to zarybienie?')) return;
    try {
      await api.delete(`/api/zarybienia/${id}`);
      pokazKomunikat('Zarybienie usunięte.');
      await pobierzDane();
    } catch (err) {
      setBlad('Błąd usuwania: ' + (err.response?.data?.detail || err.message));
    }
  };

  const formatKoszt = (koszt) => {
    if (koszt == null) return '—';
    return `${parseFloat(koszt).toFixed(2)} zł`;
  };

  const zarybieniaFiltrowane = filtrLowisko
    ? zarybienia.filter(z => z.lowisko_id === parseInt(filtrLowisko))
    : zarybienia;

  // Podsumowanie dla filtrowanego widoku
  const sumaIlosc = zarybieniaFiltrowane.reduce((s, z) => s + (z.ilosc || 0), 0);
  const sumaKoszt = zarybieniaFiltrowane.reduce((s, z) => s + (parseFloat(z.koszt) || 0), 0);

  if (loading) return <div className="container mt-4 text-center">Ładowanie...</div>;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Zarybienia</h2>
        {!pokazFormularz && canCreate && (
          <button className="btn btn-success" onClick={otworzDodawanie}>
            + Dodaj zarybienie
          </button>
        )}
      </div>

      {blad && <div className="alert alert-danger">{blad}</div>}
      {sukces && <div className="alert alert-success">{sukces}</div>}

      {/* Formularz dodawania / edycji */}
      {pokazFormularz && (
        <div className="card mb-4">
          <div className="card-header">
            <strong>{edytowanyId ? 'Edytuj zarybienie' : 'Dodaj nowe zarybienie'}</strong>
          </div>
          <div className="card-body">
            <form onSubmit={handleZapisz}>
              <div className="row g-3">
                {!edytowanyId && (
                  <>
                    <div className="col-md-6">
                      <label className="form-label">Łowisko *</label>
                      <select
                        className="form-select"
                        name="lowisko_id"
                        value={formularz.lowisko_id}
                        onChange={handleZmiana}
                        required
                      >
                        <option value="">-- wybierz łowisko --</option>
                        {lowiska.map(l => (
                          <option key={l.id} value={l.id}>{l.nazwa}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Gatunek *</label>
                      <select
                        className="form-select"
                        name="gatunek_id"
                        value={formularz.gatunek_id}
                        onChange={handleZmiana}
                        required
                      >
                        <option value="">-- wybierz gatunek --</option>
                        {gatunki.map(g => (
                          <option key={g.id} value={g.id}>{g.nazwa_polska}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="col-md-3">
                  <label className="form-label">Data zarybienia *</label>
                  <input
                    type="date"
                    className="form-control"
                    name="data_zarybienia"
                    value={formularz.data_zarybienia}
                    onChange={handleZmiana}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Ilość (szt.)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="ilosc"
                    value={formularz.ilosc}
                    onChange={handleZmiana}
                    min="1"
                    placeholder="np. 500"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Koszt (zł)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="koszt"
                      value={formularz.koszt}
                      onChange={handleZmiana}
                      min="0"
                      step="0.01"
                      placeholder="np. 1200.00"
                    />
                </div>
                <div className="col-12">
                  <label className="form-label">Uwagi</label>
                  <textarea
                    className="form-control"
                    name="uwagi"
                    value={formularz.uwagi}
                    onChange={handleZmiana}
                    rows={2}
                    placeholder="Dodatkowe informacje o zarzybieniu..."
                  />
                </div>
              </div>

              <div className="mt-3 d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  {edytowanyId ? 'Zapisz zmiany' : 'Dodaj zarybienie'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetFormularz}>
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filtr i podsumowanie */}
      <div className="mb-3 d-flex flex-wrap align-items-center gap-3">
        <div className="d-flex align-items-center gap-2">
          <label className="form-label mb-0">Filtruj po łowisku:</label>
          <select
            className="form-select w-auto"
            value={filtrLowisko}
            onChange={e => setFiltrLowisko(e.target.value)}
          >
            <option value="">Wszystkie</option>
            {lowiska.map(l => (
              <option key={l.id} value={l.id}>{l.nazwa}</option>
            ))}
          </select>
        </div>
        {zarybieniaFiltrowane.length > 0 && (
          <div className="d-flex gap-3">
            <span className="badge bg-secondary fs-6">
              Łącznie: {zarybieniaFiltrowane.length} zarybień
            </span>
            <span className="badge bg-info text-dark fs-6">
              Suma ilości: {sumaIlosc.toLocaleString('pl-PL')} szt.
            </span>
            <span className="badge bg-success fs-6">
              Suma kosztów: {sumaKoszt.toFixed(2)} zł
            </span>
          </div>
        )}
      </div>

      {/* Tabela zarybień */}
      {zarybieniaFiltrowane.length === 0 ? (
        <div className="alert alert-info">
          Brak zarybień. Dodaj pierwsze zarybienie klikając przycisk powyżej.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-dark">
              <tr>
                <th>Data</th>
                <th>Łowisko</th>
                <th>Gatunek</th>
                <th>Ilość (szt.)</th>
                <th>Koszt</th>
                <th>Uwagi</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {zarybieniaFiltrowane.map(z => (
                <tr key={z.id}>
                  <td>{new Date(z.data_zarybienia).toLocaleDateString('pl-PL')}</td>
                  <td>{z.nazwa_lowiska || z.lowisko_id}</td>
                  <td>{z.nazwa_gatunku || z.gatunek_id}</td>
                  <td>{z.ilosc != null ? z.ilosc.toLocaleString('pl-PL') : <span className="text-muted">—</span>}</td>
                  <td>{formatKoszt(z.koszt)}</td>
                  <td>
                    {z.uwagi
                      ? <span title={z.uwagi}>{z.uwagi.length > 40 ? z.uwagi.slice(0, 40) + '…' : z.uwagi}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    {canCreate && (
                      <button
                        className="btn btn-sm btn-warning me-1"
                        onClick={() => otworzEdycje(z)}
                      >
                        Edytuj
                      </button>
                    )}
                    {canCreate && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleUsun(z.id)}
                      >
                        Usuń
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ZarybieniePage;
