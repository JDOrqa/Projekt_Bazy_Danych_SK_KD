// Plik: pages/LimitsManagement.js
// Zarządzanie limitami połowowymi – widok dla Admina i Właściciela.
// Pełny CRUD: lista, dodawanie, edycja, usuwanie.

import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PUSTY_FORMULARZ = {
  lowisko_id: '',
  gatunek_id: '',
  wymiar_min_cm: '',
  wymiar_max_cm: '',
  limit_dzienny: '',
  limit_tygodniowy: '',
  limit_roczny: '',
  sezon_od: '',
  sezon_do: '',
};

function LimitsManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [limity, setLimity] = useState([]);
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
      const [limityRes, lowiskaRes, gatunkiRes] = await Promise.all([
        api.get('/api/limits/'),
        api.get('/api/lakes/'),
        api.get('/api/admin/gatunki'),
      ]);
      setLimity(limityRes.data);
      setLowiska(lowiskaRes.data);
      setGatunki(gatunkiRes.data);
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
    setFormularz(PUSTY_FORMULARZ);
    setEdytowanyId(null);
    setPokazFormularz(true);
  };

  const otworzEdycje = (limit) => {
    setFormularz({
      lowisko_id: limit.lowisko_id,
      gatunek_id: limit.gatunek_id,
      wymiar_min_cm: limit.wymiar_min_cm ?? '',
      wymiar_max_cm: limit.wymiar_max_cm ?? '',
      limit_dzienny: limit.limit_dzienny ?? '',
      limit_tygodniowy: limit.limit_tygodniowy ?? '',
      limit_roczny: limit.limit_roczny ?? '',
      sezon_od: limit.sezon_ochronny?.[0] ?? '',
      sezon_do: limit.sezon_ochronny?.[1] ?? '',
    });
    setEdytowanyId(limit.id);
    setPokazFormularz(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const budujPayload = () => {
    const payload = {
      lowisko_id: parseInt(formularz.lowisko_id),
      gatunek_id: parseInt(formularz.gatunek_id),
    };
    if (formularz.wymiar_min_cm !== '') payload.wymiar_min_cm = parseFloat(formularz.wymiar_min_cm);
    if (formularz.wymiar_max_cm !== '') payload.wymiar_max_cm = parseFloat(formularz.wymiar_max_cm);
    if (formularz.limit_dzienny !== '') payload.limit_dzienny = parseInt(formularz.limit_dzienny);
    if (formularz.limit_tygodniowy !== '') payload.limit_tygodniowy = parseInt(formularz.limit_tygodniowy);
    if (formularz.limit_roczny !== '') payload.limit_roczny = parseInt(formularz.limit_roczny);
    if (formularz.sezon_od && formularz.sezon_do) {
      payload.sezon_ochronny = [formularz.sezon_od, formularz.sezon_do];
    }
    return payload;
  };

  const handleZapisz = async (e) => {
    e.preventDefault();
    if (!formularz.lowisko_id || !formularz.gatunek_id) {
      setBlad('Wybierz łowisko i gatunek.');
      return;
    }
    try {
      if (edytowanyId) {
        const { lowisko_id, gatunek_id, ...updatePayload } = budujPayload();
        await api.put(`/api/limits/${edytowanyId}`, updatePayload);
        pokazKomunikat('Limit zaktualizowany.');
      } else {
        await api.post('/api/limits/', budujPayload());
        pokazKomunikat('Limit dodany.');
      }
      resetFormularz();
      await pobierzDane();
    } catch (err) {
      setBlad('Błąd zapisu: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleUsun = async (id) => {
    if (!window.confirm('Czy na pewno usunąć ten limit?')) return;
    try {
      await api.delete(`/api/limits/${id}`);
      pokazKomunikat('Limit usunięty.');
      await pobierzDane();
    } catch (err) {
      setBlad('Błąd usuwania: ' + (err.response?.data?.detail || err.message));
    }
  };

  const limityFiltrowane = filtrLowisko
    ? limity.filter(l => l.lowisko_id === parseInt(filtrLowisko))
    : limity;

  if (loading) return <div className="container mt-4 text-center">Ładowanie...</div>;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Limity połowowe</h2>
        {!pokazFormularz && canCreate && (
          <button className="btn btn-success" onClick={otworzDodawanie}>
            + Dodaj limit
          </button>
        )}
      </div>

      {blad && <div className="alert alert-danger">{blad}</div>}
      {sukces && <div className="alert alert-success">{sukces}</div>}

      {/* Formularz dodawania / edycji */}
      {pokazFormularz && (
        <div className="card mb-4">
          <div className="card-header">
            <strong>{edytowanyId ? 'Edytuj limit' : 'Dodaj nowy limit'}</strong>
          </div>
          <div className="card-body">
            <form onSubmit={handleZapisz}>
              <div className="row g-3">
                {/* Łowisko i gatunek – tylko przy dodawaniu */}
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
                  <label className="form-label">Wymiar min. (cm)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="wymiar_min_cm"
                    value={formularz.wymiar_min_cm}
                    onChange={handleZmiana}
                    min="0"
                    step="0.1"
                    placeholder="np. 30"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Wymiar max. (cm)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="wymiar_max_cm"
                    value={formularz.wymiar_max_cm}
                    onChange={handleZmiana}
                    min="0"
                    step="0.1"
                    placeholder="np. 70"
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Limit dzienny</label>
                  <input
                    type="number"
                    className="form-control"
                    name="limit_dzienny"
                    value={formularz.limit_dzienny}
                    onChange={handleZmiana}
                    min="0"
                    placeholder="np. 5"
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Limit tygodniowy</label>
                  <input
                    type="number"
                    className="form-control"
                    name="limit_tygodniowy"
                    value={formularz.limit_tygodniowy}
                    onChange={handleZmiana}
                    min="0"
                    placeholder="np. 20"
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Limit roczny</label>
                  <input
                    type="number"
                    className="form-control"
                    name="limit_roczny"
                    value={formularz.limit_roczny}
                    onChange={handleZmiana}
                    min="0"
                    placeholder="np. 100"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Sezon ochronny (opcjonalnie)</label>
                  <div className="row g-2">
                    <div className="col-md-3">
                      <input
                        type="date"
                        className="form-control"
                        name="sezon_od"
                        value={formularz.sezon_od}
                        onChange={handleZmiana}
                      />
                      <small className="text-muted">Od</small>
                    </div>
                    <div className="col-md-3">
                      <input
                        type="date"
                        className="form-control"
                        name="sezon_do"
                        value={formularz.sezon_do}
                        onChange={handleZmiana}
                      />
                      <small className="text-muted">Do</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  {edytowanyId ? 'Zapisz zmiany' : 'Dodaj limit'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetFormularz}>
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filtr po łowisku */}
      <div className="mb-3 d-flex align-items-center gap-2">
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
        <span className="text-muted">({limityFiltrowane.length} limitów)</span>
      </div>

      {/* Tabela limitów */}
      {limityFiltrowane.length === 0 ? (
        <div className="alert alert-info">Brak limitów. Dodaj pierwszy limit klikając przycisk powyżej.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-dark">
              <tr>
                <th>Łowisko</th>
                <th>Gatunek</th>
                <th>Min. (cm)</th>
                <th>Max. (cm)</th>
                <th>Dzienny</th>
                <th>Tygodniowy</th>
                <th>Roczny</th>
                <th>Sezon ochronny</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {limityFiltrowane.map(limit => (
                <tr key={limit.id}>
                  <td>{limit.nazwa_lowiska || limit.lowisko_id}</td>
                  <td>{limit.nazwa_gatunku || limit.gatunek_id}</td>
                  <td>{limit.wymiar_min_cm ?? <span className="text-muted">—</span>}</td>
                  <td>{limit.wymiar_max_cm ?? <span className="text-muted">—</span>}</td>
                  <td>{limit.limit_dzienny ?? <span className="text-muted">—</span>}</td>
                  <td>{limit.limit_tygodniowy ?? <span className="text-muted">—</span>}</td>
                  <td>{limit.limit_roczny ?? <span className="text-muted">—</span>}</td>
                  <td>
                    {limit.sezon_ochronny
                      ? `${limit.sezon_ochronny[0]} – ${limit.sezon_ochronny[1]}`
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    {canCreate && (
                      <button
                        className="btn btn-sm btn-warning me-1"
                        onClick={() => otworzEdycje(limit)}
                      >
                        Edytuj
                      </button>
                    )}
                    {canCreate && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleUsun(limit.id)}
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

export default LimitsManagement;
