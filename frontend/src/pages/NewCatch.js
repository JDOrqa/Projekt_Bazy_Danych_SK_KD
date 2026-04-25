import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL;

function NewCatch() {
    const { accessToken } = useAuth();

    const [lakes, setLakes] = useState([]);
    const [gatunki, setGatunki] = useState([]);
    const [metody, setMetody] = useState([]);
    const [przynety, setPrzynety] = useState([]);

    const [sesja, setSesja] = useState(null);
    const [ryby, setRyby] = useState([]);
    const [checkingActive, setCheckingActive] = useState(true);

    const [sesjaForm, setSesjaForm] = useState({ lowisko_id: '', uwagi: '' });
    const [rybForm, setRybForm] = useState({
        gatunek_id: '',
        metoda_id: '',
        przyneta_id: '',
        waga_g: '',
        dlugosc_cm: '',
        wypuszczona: true,
        uwagi: '',
    });

    const [error, setError] = useState(null);
    const [rybError, setRybError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [rybLoading, setRybLoading] = useState(false);

    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [lakesRes, gatunkiRes, metodyRes, przynetyRes] = await Promise.all([
                    axios.get(`${API}/api/lakes/`, { headers: authHeaders }),
                    axios.get(`${API}/api/admin/gatunki`, { headers: authHeaders }),
                    axios.get(`${API}/api/catches/metody`, { headers: authHeaders }),
                    axios.get(`${API}/api/catches/przynety`, { headers: authHeaders }),
                ]);
                setLakes(lakesRes.data);
                setGatunki(gatunkiRes.data);
                setMetody(metodyRes.data);
                setPrzynety(przynetyRes.data);
            } catch (err) {
                setError('Błąd ładowania danych pomocniczych.');
            }

            try {
                const activeRes = await axios.get(`${API}/api/catches/sesje/aktywna`, { headers: authHeaders });
                setSesja(activeRes.data);
                const rybyRes = await axios.get(`${API}/api/catches/sesje/${activeRes.data.id}/ryby`, { headers: authHeaders });
                setRyby(rybyRes.data);
            } catch {
            } finally {
                setCheckingActive(false);
            }
        };
        fetchData();
    }, [accessToken]);

    const handleStartSesja = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await axios.post(`${API}/api/catches/sesje/start`, {
                lowisko_id: parseInt(sesjaForm.lowisko_id),
                uwagi: sesjaForm.uwagi || null,
            }, { headers: authHeaders });
            setSesja(res.data);
            setRyby([]);
        } catch (err) {
            setError(err.response?.data?.detail || 'Błąd rozpoczęcia sesji.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRyba = async (e) => {
        e.preventDefault();
        if (rybLoading) return;
        setRybError(null);
        setRybLoading(true);
        try {
            const payload = {
                gatunek_id: parseInt(rybForm.gatunek_id),
                metoda_id: rybForm.metoda_id ? parseInt(rybForm.metoda_id) : null,
                przyneta_id: rybForm.przyneta_id ? parseInt(rybForm.przyneta_id) : null,
                waga_g: rybForm.waga_g ? parseInt(rybForm.waga_g) : null,
                dlugosc_cm: rybForm.dlugosc_cm ? parseFloat(rybForm.dlugosc_cm) : null,
                wypuszczona: rybForm.wypuszczona,
                uwagi: rybForm.uwagi || null,
            };
            const res = await axios.post(`${API}/api/catches/sesje/${sesja.id}/ryby`, payload, { headers: authHeaders });
            setRyby(prev => [...prev, res.data]);
            setRybForm(f => ({ ...f, waga_g: '', dlugosc_cm: '', uwagi: '', metoda_id: '', przyneta_id: '' }));
        } catch (err) {
            setRybError(err.response?.data?.detail || 'Błąd dodawania ryby.');
        } finally {
            setRybLoading(false);
        }
    };

    const handleDeleteRyba = async (rybaId) => {
        try {
            await axios.delete(`${API}/api/catches/ryby/${rybaId}`, { headers: authHeaders });
            setRyby(prev => prev.filter(r => r.id !== rybaId));
        } catch (err) {
            setRybError(err.response?.data?.detail || 'Błąd usuwania ryby.');
        }
    };

    const handleKoniecSesji = async () => {
        if (!window.confirm('Czy na pewno chcesz zakończyć sesję?')) return;
        setError(null);
        try {
            const res = await axios.post(`${API}/api/catches/sesje/${sesja.id}/end`, {}, { headers: authHeaders });
            setSesja(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Błąd zakończenia sesji.');
        }
    };

    const handleDeleteSesja = async () => {
        if (!window.confirm('Czy na pewno chcesz usunąć tę sesję?')) return;
        try {
            await axios.delete(`${API}/api/catches/sesje/${sesja.id}`, { headers: authHeaders });
            setSesja(null);
            setRyby([]);
        } catch {
            alert('Błąd usuwania sesji.');
        }
    };

    const gatunek = (id) => gatunki.find(g => g.id === id)?.nazwa_polska || `#${id}`;

    if (checkingActive) {
        return <div className="container mt-4 text-center">Ładowanie...</div>;
    }

    if (!sesja) {
        return (
            <div className="container mt-4" style={{ maxWidth: 600 }}>
                <h2>Nowa sesja połowu</h2>
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={handleStartSesja}>
                    <div className="mb-3">
                        <label className="form-label">Łowisko</label>
                        <select
                            className="form-select"
                            required
                            value={sesjaForm.lowisko_id}
                            onChange={e => setSesjaForm(f => ({ ...f, lowisko_id: e.target.value }))}
                        >
                            <option value="">-- wybierz łowisko --</option>
                            {lakes.map(l => <option key={l.id} value={l.id}>{l.nazwa}</option>)}
                        </select>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Uwagi (opcjonalne)</label>
                        <textarea
                            className="form-control"
                            rows={2}
                            value={sesjaForm.uwagi}
                            onChange={e => setSesjaForm(f => ({ ...f, uwagi: e.target.value }))}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Rozpoczynanie...' : 'Rozpocznij sesję'}
                    </button>
                </form>
            </div>
        );
    }

    const sesjaZakonczona = !!sesja.data_zakonczenia;

    return (
        <div className="container mt-4" style={{ maxWidth: 900 }}>
            <div className="card mb-4">
                <div className="card-body">
                    <h4 className="card-title">
                        Sesja #{sesja.id}
                        {sesjaZakonczona
                            ? <span className="badge bg-secondary ms-2">Zakończona</span>
                            : <span className="badge bg-success ms-2">Trwa</span>}
                    </h4>
                    <p className="mb-1"><strong>Łowisko:</strong> {lakes.find(l => l.id === sesja.lowisko_id)?.nazwa || sesja.lowisko_id}</p>
                    <p className="mb-1"><strong>Rozpoczęto:</strong> {new Date(sesja.data_rozpoczecia).toLocaleString('pl-PL')}</p>
                    {sesja.data_zakonczenia && <p className="mb-1"><strong>Zakończono:</strong> {new Date(sesja.data_zakonczenia).toLocaleString('pl-PL')}</p>}
                    {sesja.uwagi && <p className="mb-0"><strong>Uwagi:</strong> {sesja.uwagi}</p>}
                    {error && <div className="alert alert-danger mt-2">{error}</div>}

                    {!sesjaZakonczona && (
                        <div className="d-flex gap-2 mt-3">
                            <button className="btn btn-warning" onClick={handleKoniecSesji}>Zakończ sesję</button>
                            <button className="btn btn-outline-danger" onClick={handleDeleteSesja}>Usuń sesję</button>
                        </div>
                    )}
                </div>
            </div>

            <h5>Złowione ryby ({ryby.length})</h5>
            {ryby.length > 0 && (
                <div className="table-responsive mb-3">
                    <table className="table table-sm">
                        <thead>
                            <tr>
                                <th>Gatunek</th>
                                <th>Waga (g)</th>
                                <th>Dł. (cm)</th>
                                <th>Metoda</th>
                                <th>Przynęta</th>
                                <th>Wypuszczona</th>
                                <th>Czas</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {ryby.map(r => (
                                <tr key={r.id}>
                                    <td>{r.nazwa_gatunku || gatunek(r.gatunek_id)}</td>
                                    <td>{r.waga_g ?? '–'}</td>
                                    <td>{r.dlugosc_cm ?? '–'}</td>
                                    <td>{r.nazwa_metody || '–'}</td>
                                    <td>{r.nazwa_przynety || '–'}</td>
                                    <td>{r.wypuszczona ? 'Tak' : 'Nie'}</td>
                                    <td>{new Date(r.czas_zlowienia).toLocaleTimeString('pl-PL')}</td>
                                    <td>
                                        {!sesjaZakonczona && (
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteRyba(r.id)}>Usuń</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!sesjaZakonczona && (
                <div className="card">
                    <div className="card-body">
                        <h6>Dodaj rybę</h6>
                        {rybError && <div className="alert alert-danger">{rybError}</div>}
                        <form onSubmit={handleAddRyba}>
                            <div className="row g-2">
                                <div className="col-md-6">
                                    <label className="form-label">Gatunek *</label>
                                    <select
                                        className="form-select"
                                        required
                                        value={rybForm.gatunek_id}
                                        onChange={e => setRybForm(f => ({ ...f, gatunek_id: e.target.value }))}
                                    >
                                        <option value="">-- wybierz --</option>
                                        {gatunki.map(g => <option key={g.id} value={g.id}>{g.nazwa_polska}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Waga (g)</label>
                                    <input
                                        type="number"
                                        min="1"                                   
                                        className="form-control"
                                        required
                                        value={rybForm.waga_g}
                                        onChange={e => setRybForm(f => ({ ...f, waga_g: e.target.value }))}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Długość (cm)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        className="form-control"
                                        required
                                        value={rybForm.dlugosc_cm}
                                        onChange={e => setRybForm(f => ({ ...f, dlugosc_cm: e.target.value }))}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Metoda połowu</label>
                                    <select
                                        className="form-select"
                                        value={rybForm.metoda_id}
                                        onChange={e => setRybForm(f => ({ ...f, metoda_id: e.target.value }))}
                                    >
                                        <option value="">-- brak / nie wybrano --</option>
                                        {metody.map(m => <option key={m.id} value={m.id}>{m.nazwa}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Przynęta</label>
                                    <select
                                        className="form-select"
                                        value={rybForm.przyneta_id}
                                        onChange={e => setRybForm(f => ({ ...f, przyneta_id: e.target.value }))}
                                    >
                                        <option value="">-- brak / nie wybrano --</option>
                                        {przynety.map(p => <option key={p.id} value={p.id}>{p.nazwa}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-6 d-flex align-items-end">
                                    <div className="form-check mb-1">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="wypuszczona"
                                            checked={rybForm.wypuszczona}
                                            onChange={e => setRybForm(f => ({ ...f, wypuszczona: e.target.checked }))}
                                        />
                                        <label className="form-check-label" htmlFor="wypuszczona">Wypuszczona</label>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Uwagi</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={rybForm.uwagi}
                                        onChange={e => setRybForm(f => ({ ...f, uwagi: e.target.value }))}
                                    />
                                </div>
                                <div className="col-12">
                                    <button type="submit" className="btn btn-success" disabled={rybLoading}>
                                        {rybLoading ? 'Dodawanie...' : 'Dodaj rybę'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NewCatch;
