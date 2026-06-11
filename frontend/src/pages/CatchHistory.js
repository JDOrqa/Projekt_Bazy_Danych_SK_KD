import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

function CatchHistory() {
    const { accessToken } = useAuth();
    const navigate = useNavigate();

    const [data, setData] = useState({ sesje: [], lakes: [], gatunki: [] });
    const [loading, setLoading] = useState(true);
    const [rybyMap, setRybyMap] = useState({});
    const [expandedId, setExpandedId] = useState(null);

    const headers = { Authorization: `Bearer ${accessToken}` };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [s, l, g] = await Promise.all([
                    axios.get(`${API_URL}/api/catches/sesje`, { headers }),
                    axios.get(`${API_URL}/api/lakes/`, { headers }),
                    axios.get(`${API_URL}/api/admin/gatunki`, { headers })
                ]);
                setData({ sesje: s.data, lakes: l.data, gatunki: g.data });
            } catch (err) {
                console.error("Błąd ładowania", err);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [accessToken]);

    const toggleSession = async (id) => {
        if (expandedId === id) return setExpandedId(null);
        setExpandedId(id);

        if (!rybyMap[id]) {
            try {
                const res = await axios.get(`${API_URL}/api/catches/sesje/${id}/ryby`, { headers });
                setRybyMap(prev => ({ ...prev, [id]: res.data }));
            } catch (err) {
                console.error("Błąd pobierania ryb", err);
                setRybyMap(prev => ({ ...prev, [id]: [] }));
            }
        }
    };

    const gatunek = (id) => {
        const g = data.gatunki.find(g => g.id === id);
        return g ? g.nazwa_polska : `#${id}`;
    };

    const handleDeleteRyba = async (rybaId, sesjaId) => {
        if (!window.confirm('Czy na pewno chcesz usunąć tę rybę?')) return;
        try {
            await axios.delete(`${API_URL}/api/catches/ryby/${rybaId}`, { headers });
            const updated = await axios.get(`${API_URL}/api/catches/sesje/${sesjaId}/ryby`, { headers });
            setRybyMap(prev => ({ ...prev, [sesjaId]: updated.data }));
        } catch (err) {
            alert('Błąd usuwania ryby: ' + (err.response?.data?.detail || err.message));
        }
    };

    const deleteSession = async (id) => {
        if (!window.confirm('Usunąć sesję?')) return;
        await axios.delete(`${API_URL}/api/catches/sesje/${id}`, { headers });
        setData(prev => ({ ...prev, sesje: prev.sesje.filter(s => s.id !== id) }));
        if (expandedId === id) setExpandedId(null);
    };

    if (loading) return <div className="text-center mt-5">Ładowanie...</div>;

    return (
        <div className="container mt-4">
            <header className="d-flex justify-content-between mb-4">
                <h2>Historia sesji</h2>
                <button className="btn btn-primary" onClick={() => navigate('/new-catch')}>+ Nowa</button>
            </header>

            <div className="accordion">
                {data.sesje.map(sesja => (
                    <SessionItem
                        key={sesja.id}
                        sesja={sesja}
                        isOpen={expandedId === sesja.id}
                        ryby={rybyMap[sesja.id] || []}
                        lakeName={data.lakes.find(l => l.id === sesja.lowisko_id)?.nazwa}
                        gatunek={gatunek}
                        onToggle={() => toggleSession(sesja.id)}
                        onDelete={() => deleteSession(sesja.id)}
                        onDeleteRyba={handleDeleteRyba}
                    />
                ))}
            </div>
        </div>
    );
}

function SessionItem({ sesja, isOpen, ryby, lakeName, gatunek, onToggle, onDelete, onDeleteRyba }) {
    const zakonczona = !!sesja.koniec_czas || !!sesja.data_zakonczenia;

    return (
        <div className="accordion-item">
            <h2 className="accordion-header">
                <button className={`accordion-button ${!isOpen ? 'collapsed' : ''}`} onClick={onToggle}>
                    <strong>{lakeName || 'Nieznane'}</strong>
                    <span className="ms-2">{new Date(sesja.data_rozpoczecia || sesja.start_czas).toLocaleDateString()}</span>
                </button>
            </h2>
            {isOpen && (
                <div className="accordion-body">
                    <p>Start: {new Date(sesja.data_rozpoczecia || sesja.start_czas).toLocaleString()}</p>
                    {sesja.koniec_czas && <p>Koniec: {new Date(sesja.koniec_czas).toLocaleString()}</p>}
                    <table className="table table-sm">
                        <thead>
                            <tr>
                                <th>Gatunek</th>
                                <th>Waga (g)</th>
                                <th>Długość (cm)</th>
                                <th>Wypuszczona</th>
                                <th>Zdjęcia</th>
                                <th>Czas</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {ryby.map(r => (
                                <tr key={r.id} className={r.narusza_limit ? 'table-warning' : ''}>
                                    <td>{r.nazwa_gatunku || gatunek(r.gatunek_id)}</td>
                                    <td>{r.waga_g ?? '–'}</td>
                                    <td>{r.dlugosc_cm ?? '–'}</td>
                                    <td>{r.wypuszczona ? 'Tak' : 'Nie'}</td>
                                    <td>
                                        {r.zdjecia && r.zdjecia.length > 0 ? (
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {r.zdjecia.map((url, idx) => {
                                                    const fullUrl = `${API_URL}/${url}`;
                                                    return (
                                                        <a key={idx} href={fullUrl} target="_blank" rel="noopener noreferrer">
                                                            <img src={fullUrl} alt="zdjęcie" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        ) : <span className="text-muted">brak</span>}
                                    </td>
                                    <td>{new Date(r.czas_zlowienia).toLocaleTimeString('pl-PL')}</td>
                                    <td>
                                        {!zakonczona && (
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => onDeleteRyba(r.id, sesja.id)}>
                                                Usuń
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button className="btn btn-sm btn-outline-danger" onClick={onDelete}>Usuń sesję</button>
                </div>
            )}
        </div>
    );
}

export default CatchHistory;