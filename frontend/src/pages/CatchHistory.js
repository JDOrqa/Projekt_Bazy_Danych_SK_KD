import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL;

function CatchHistory() {
    const { accessToken } = useAuth();
    const navigate = useNavigate();

    const [sesje, setSesje] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [rybyMap, setRybyMap] = useState({});
    const [lakes, setLakes] = useState([]);
    const [gatunki, setGatunki] = useState([]);

    const authHeaders = { Authorization: `Bearer ${accessToken}` };

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [sesjeRes, lakesRes, gatunkiRes] = await Promise.all([
                    axios.get(`${API}/api/catches/sesje`, { headers: authHeaders }),
                    axios.get(`${API}/api/lakes/`, { headers: authHeaders }),
                    axios.get(`${API}/api/admin/gatunki`, { headers: authHeaders }),
                ]);
                setSesje(sesjeRes.data);
                setLakes(lakesRes.data);
                setGatunki(gatunkiRes.data);
            } catch (err) {
                setError('Błąd ładowania historii sesji.');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [accessToken]);

    const getLakeName = (id) => lakes.find(l => l.id === id)?.nazwa || `Łowisko #${id}`;
    const getGatunekName = (id) => gatunki.find(g => g.id === id)?.nazwa_polska || `Gatunek #${id}`;

    const handleExpand = async (sesjaId) => {
        if (expandedId === sesjaId) {
            setExpandedId(null);
            return;
        }
        setExpandedId(sesjaId);
        if (!rybyMap[sesjaId]) {
            try {
                const res = await axios.get(`${API}/api/catches/sesje/${sesjaId}/ryby`, { headers: authHeaders });
                setRybyMap(prev => ({ ...prev, [sesjaId]: res.data }));
            } catch {
                setRybyMap(prev => ({ ...prev, [sesjaId]: [] }));
            }
        }
    };

    const handleDelete = async (sesjaId) => {
        if (!window.confirm('Czy na pewno chcesz usunąć tę sesję?')) return;
        try {
            await axios.delete(`${API}/api/catches/sesje/${sesjaId}`, { headers: authHeaders });
            setSesje(prev => prev.filter(s => s.id !== sesjaId));
            if (expandedId === sesjaId) setExpandedId(null);
        } catch (err) {
            alert('Błąd usuwania sesji: ' + (err.response?.data?.detail || err.message));
        }
    };

    if (loading) return <div className="container mt-4 text-center">Ładowanie historii...</div>;

    if (error) return (
        <div className="container mt-4">
            <div className="alert alert-danger">{error}</div>
        </div>
    );

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Historia sesji połowu</h2>
                <button className="btn btn-primary" onClick={() => navigate('/new-catch')}>
                    + Nowa sesja
                </button>
            </div>

            {sesje.length === 0 ? (
                <div className="alert alert-info">Brak sesji połowu. Rozpocznij pierwszą wyprawę!</div>
            ) : (
                <div className="accordion" id="sesjeAccordion">
                    {sesje.map(s => {
                        const isOpen = expandedId === s.id;
                        const zakonczona = !!s.data_zakonczenia;
                        const ryby = rybyMap[s.id] || [];

                        return (
                            <div className="accordion-item" key={s.id}>
                                <h2 className="accordion-header">
                                    <button
                                        className={`accordion-button${isOpen ? '' : ' collapsed'}`}
                                        type="button"
                                        onClick={() => handleExpand(s.id)}
                                    >
                                        <div className="d-flex w-100 justify-content-between align-items-center pe-3">
                                            <span>
                                                <strong>{getLakeName(s.lowisko_id)}</strong>
                                                <span className="ms-2 text-muted">
                                                    {new Date(s.data_rozpoczecia).toLocaleDateString('pl-PL')}
                                                </span>
                                            </span>
                                            <span>
                                                {zakonczona
                                                    ? <span className="badge bg-secondary">Zakończona</span>
                                                    : <span className="badge bg-success">Trwa</span>}
                                            </span>
                                        </div>
                                    </button>
                                </h2>
                                {isOpen && (
                                    <div className="accordion-collapse collapse show">
                                        <div className="accordion-body">
                                            <div className="row mb-2">
                                                <div className="col-md-6">
                                                    <p className="mb-1"><strong>Start:</strong> {new Date(s.data_rozpoczecia).toLocaleString('pl-PL')}</p>
                                                    {s.data_zakonczenia && (
                                                        <p className="mb-1"><strong>Koniec:</strong> {new Date(s.data_zakonczenia).toLocaleString('pl-PL')}</p>
                                                    )}
                                                </div>
                                                <div className="col-md-6">
                                                    {s.uwagi && <p className="mb-1"><strong>Uwagi:</strong> {s.uwagi}</p>}
                                                </div>
                                            </div>

                                            <h6>Złowione ryby ({ryby.length})</h6>
                                            {ryby.length > 0 ? (
                                                <table className="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>Gatunek</th>
                                                            <th>Waga (g)</th>
                                                            <th>Dł. (cm)</th>
                                                            <th>Wypuszczona</th>
                                                            <th>Czas</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {ryby.map(r => (
                                                            <tr key={r.id}>
                                                                <td>{r.nazwa_gatunku || getGatunekName(r.gatunek_id)}</td>
                                                                <td>{r.waga_g ?? '–'}</td>
                                                                <td>{r.dlugosc_cm ?? '–'}</td>
                                                                <td>{r.wypuszczona ? 'Tak' : 'Nie'}</td>
                                                                <td>{new Date(r.czas_zlowienia).toLocaleTimeString('pl-PL')}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p className="text-muted">Brak ryb w tej sesji.</p>
                                            )}

                                            <button
                                                className="btn btn-sm btn-outline-danger mt-2"
                                                onClick={() => handleDelete(s.id)}
                                            >
                                                Usuń sesję
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default CatchHistory;
