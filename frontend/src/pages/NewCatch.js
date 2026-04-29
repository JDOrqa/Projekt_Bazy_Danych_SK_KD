import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL;

// Mapowanie typów ostrzeżeń na czytelne etykiety
const ETYKIETY_OSTRZEZEN = {
    wymiar_minimalny: '📏 Za mała',
    wymiar_maksymalny: '📏 Za duża',
    gatunek_chroniony: '🛡️ Gatunek chroniony',
    inwazyna: '⚠️ Gatunek inwazyjny',
    sezon_ochronny: '📅 Sezon ochronny',
    no_kill: '🔄 Łowisko No Kill',
    limit_dzienny: '🔢 Limit dzienny',
};

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
        wypuszczona: false,
        uwagi: '',
    });

    // Stan ostrzeżeń – gdy backend zwróci 422 z wymuszeniem wypuszczenia
    const [ostrzezenia, setOstrzezenia] = useState(null);
    // Czy użytkownik potwierdził wypuszczenie po zobaczeniu ostrzeżeń
    const [potwierdzoneWypuszczenie, setPotwierdzoneWypuszczenie] = useState(false);

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
<<<<<<< Updated upstream
                setMetody(metodyRes.data);
                setPrzynety(przynetyRes.data);
            } catch (err) {
=======
            } catch {
>>>>>>> Stashed changes
                setError('Błąd ładowania danych pomocniczych.');
            }

            try {
                const activeRes = await axios.get(`${API}/api/catches/sesje/aktywna`, { headers: authHeaders });
                setSesja(activeRes.data);
                const rybyRes = await axios.get(`${API}/api/catches/sesje/${activeRes.data.id}/ryby`, { headers: authHeaders });
                setRyby(rybyRes.data);
            } catch {
                // brak aktywnej sesji – OK
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

    // Resetuje stan ostrzeżeń przy zmianie formularza
    const handleRybFormChange = (field, value) => {
        setRybForm(f => ({ ...f, [field]: value }));
        // Jeśli użytkownik zmienia gatunek lub długość – wyczyść ostrzeżenia
        if (field === 'gatunek_id' || field === 'dlugosc_cm') {
            setOstrzezenia(null);
            setPotwierdzoneWypuszczenie(false);
        }
    };

    const handleAddRyba = async (e) => {
        e.preventDefault();
        if (rybLoading) return;
        setRybError(null);
<<<<<<< Updated upstream
        setRybLoading(true);
=======

        // Jeśli są aktywne ostrzeżenia z wymuszeniem, użytkownik musi potwierdzić
        const czyWymuszoneWypuszczenie = ostrzezenia !== null;
        const wypuszczona = czyWymuszoneWypuszczenie ? true : rybForm.wypuszczona;

>>>>>>> Stashed changes
        try {
            const payload = {
                gatunek_id: parseInt(rybForm.gatunek_id),
                metoda_id: rybForm.metoda_id ? parseInt(rybForm.metoda_id) : null,
                przyneta_id: rybForm.przyneta_id ? parseInt(rybForm.przyneta_id) : null,
                waga_g: rybForm.waga_g ? parseInt(rybForm.waga_g) : null,
                dlugosc_cm: rybForm.dlugosc_cm ? parseFloat(rybForm.dlugosc_cm) : null,
                wypuszczona,
                uwagi: rybForm.uwagi || null,
            };
<<<<<<< Updated upstream
            const res = await axios.post(`${API}/api/catches/sesje/${sesja.id}/ryby`, payload, { headers: authHeaders });
            setRyby(prev => [...prev, res.data]);
            setRybForm(f => ({ ...f, waga_g: '', dlugosc_cm: '', uwagi: '', metoda_id: '', przyneta_id: '' }));
        } catch (err) {
            setRybError(err.response?.data?.detail || 'Błąd dodawania ryby.');
        } finally {
            setRybLoading(false);
=======

            const res = await axios.post(
                `${API}/api/catches/sesje/${sesja.id}/ryby`,
                payload,
                { headers: authHeaders }
            );

            // Sukces – dodaj rybę do listy i wyczyść formularz
            setRyby(prev => [res.data, ...prev]);
            setRybForm(f => ({ ...f, waga_g: '', dlugosc_cm: '', uwagi: '', wypuszczona: false }));
            setOstrzezenia(null);
            setPotwierdzoneWypuszczenie(false);

        } catch (err) {
            const detail = err.response?.data?.detail;

            // HTTP 422 z wymuszeniem wypuszczenia
            if (err.response?.status === 422 && detail?.typ === 'wymuszenie_wypuszczenia') {
                setOstrzezenia(detail);
                setPotwierdzoneWypuszczenie(false);
                return;
            }

            setRybError(
                typeof detail === 'string'
                    ? detail
                    : detail?.wiadomosc || 'Błąd dodawania ryby.'
            );
>>>>>>> Stashed changes
        }
    };

    const handleOdrzucOstrzezenia = () => {
        // Użytkownik anuluje – czyści ostrzeżenia, ryba nie jest dodawana
        setOstrzezenia(null);
        setPotwierdzoneWypuszczenie(false);
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

    // ===== EKRAN STARTOWY – brak sesji =====
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

    // ===== GŁÓWNY WIDOK SESJI =====
    return (
<<<<<<< Updated upstream
        <div className="container mt-4" style={{ maxWidth: 900 }}>
=======
        <div className="container mt-4" style={{ maxWidth: 800 }}>

            {/* Karta sesji */}
>>>>>>> Stashed changes
            <div className="card mb-4">
                <div className="card-body">
                    <h4 className="card-title">
                        Sesja #{sesja.id}
                        {sesjaZakonczona
                            ? <span className="badge bg-secondary ms-2">Zakończona</span>
                            : <span className="badge bg-success ms-2">Trwa</span>}
                    </h4>
                    <p className="mb-1">
                        <strong>Łowisko:</strong>{' '}
                        {lakes.find(l => l.id === sesja.lowisko_id)?.nazwa || sesja.lowisko_id}
                    </p>
                    <p className="mb-1">
                        <strong>Rozpoczęto:</strong>{' '}
                        {new Date(sesja.data_rozpoczecia).toLocaleString('pl-PL')}
                    </p>
                    {sesja.data_zakonczenia && (
                        <p className="mb-1">
                            <strong>Zakończono:</strong>{' '}
                            {new Date(sesja.data_zakonczenia).toLocaleString('pl-PL')}
                        </p>
                    )}
                    {sesja.uwagi && <p className="mb-0"><strong>Uwagi:</strong> {sesja.uwagi}</p>}
                    {error && <div className="alert alert-danger mt-2">{error}</div>}

                    {!sesjaZakonczona && (
                        <div className="d-flex gap-2 mt-3">
                            <button className="btn btn-warning" onClick={handleKoniecSesji}>
                                Zakończ sesję
                            </button>
                            <button className="btn btn-outline-danger" onClick={handleDeleteSesja}>
                                Usuń sesję
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Lista ryb */}
            <h5>Złowione ryby ({ryby.length})</h5>
            {ryby.length > 0 && (
                <div className="table-responsive mb-3">
<<<<<<< Updated upstream
                    <table className="table table-sm">
                        <thead>
=======
                    <table className="table table-sm table-bordered">
                        <thead className="table-light">
>>>>>>> Stashed changes
                            <tr>
                                <th>Gatunek</th>
                                <th>Waga (g)</th>
                                <th>Dł. (cm)</th>
<<<<<<< Updated upstream
                                <th>Metoda</th>
                                <th>Przynęta</th>
                                <th>Wypuszczona</th>
=======
                                <th>Status</th>
>>>>>>> Stashed changes
                                <th>Czas</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {ryby.map(r => (
<<<<<<< Updated upstream
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
=======
                                <tr key={r.id} className={r.narusza_limit ? 'table-warning' : ''}>
                                    <td>{r.nazwa_gatunku || gatunek(r.gatunek_id)}</td>
                                    <td>{r.waga_g ?? '–'}</td>
                                    <td>{r.dlugosc_cm ?? '–'}</td>
                                    <td>
                                        {r.wypuszczona
                                            ? <span className="badge bg-info text-dark">Wypuszczona</span>
                                            : <span className="badge bg-success">Zatrzymana</span>
                                        }
                                        {r.narusza_limit && (
                                            <span
                                                className="badge bg-warning text-dark ms-1"
                                                title={r.powod_naruszenia}
                                            >
                                                ⚠️ Naruszenie
                                            </span>
                                        )}
                                    </td>
                                    <td>{new Date(r.czas_zlowienia).toLocaleTimeString('pl-PL')}</td>
                                    <td>
                                        {!sesjaZakonczona && (
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => handleDeleteRyba(r.id)}
                                            >
                                                Usuń
                                            </button>
>>>>>>> Stashed changes
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Formularz dodawania ryby */}
            {!sesjaZakonczona && (
                <div className="card">
                    <div className="card-body">
                        <h6 className="card-title">Dodaj rybę</h6>

                        {rybError && <div className="alert alert-danger">{rybError}</div>}
<<<<<<< Updated upstream
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
=======

                        {/* Panel ostrzeżeń – pojawia się gdy backend zwróci 422 */}
                        {ostrzezenia && (
                            <div className="alert alert-danger border-danger mb-3">
                                <h6 className="alert-heading fw-bold">
                                    🚫 Ryba musi zostać wypuszczona!
                                </h6>
                                <ul className="mb-2">
                                    {ostrzezenia.ostrzezenia.map((o, i) => (
                                        <li key={i}>
                                            <strong>{ETYKIETY_OSTRZEZEN[o.typ] || o.typ}:</strong>{' '}
                                            {o.wiadomosc}
                                        </li>
                                    ))}
                                </ul>
                                <hr />
                                <p className="mb-2">
                                    Aby zapisać połów, musisz potwierdzić że ryba zostanie wypuszczona.
                                </p>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-danger"
                                        onClick={handleAddRyba}
                                    >
                                        ✓ Potwierdzam – wypuszczam rybę
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleOdrzucOstrzezenia}
                                    >
                                        Anuluj
>>>>>>> Stashed changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Formularz – ukryty gdy czekamy na potwierdzenie */}
                        {!ostrzezenia && (
                            <form onSubmit={handleAddRyba}>
                                <div className="row g-2">
                                    <div className="col-md-6">
                                        <label className="form-label">Gatunek *</label>
                                        <select
                                            className="form-select"
                                            required
                                            value={rybForm.gatunek_id}
                                            onChange={e => handleRybFormChange('gatunek_id', e.target.value)}
                                        >
                                            <option value="">-- wybierz --</option>
                                            {gatunki.map(g => (
                                                <option key={g.id} value={g.id}>
                                                    {g.nazwa_polska}
                                                    {g.wymiar_min_cm ? ` (min. ${g.wymiar_min_cm} cm)` : ''}
                                                    {g.gatunek_chroniony ? ' 🛡️' : ''}
                                                    {g.inwazyjny ? ' ⚠️' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label">Waga (g)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="form-control"
                                            value={rybForm.waga_g}
                                            onChange={e => handleRybFormChange('waga_g', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label">Długość (cm)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            className="form-control"
                                            value={rybForm.dlugosc_cm}
                                            onChange={e => handleRybFormChange('dlugosc_cm', e.target.value)}
                                        />
                                    </div>

                                    <div className="col-md-6 d-flex align-items-end">
                                        <div className="form-check mb-1">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="wypuszczona"
                                                checked={rybForm.wypuszczona}
                                                onChange={e => handleRybFormChange('wypuszczona', e.target.checked)}
                                            />
                                            <label className="form-check-label" htmlFor="wypuszczona">
                                                Wypuszczona
                                            </label>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">Uwagi</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={rybForm.uwagi}
                                            onChange={e => handleRybFormChange('uwagi', e.target.value)}
                                        />
                                    </div>

                                    <div className="col-12">
                                        <button type="submit" className="btn btn-success">
                                            Dodaj rybę
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NewCatch;
