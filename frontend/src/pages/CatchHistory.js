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
            const res = await axios.get(`${API_URL}/api/catches/sesje/${id}/ryby`, { headers });
            setRybyMap(prev => ({ ...prev, [id]: res.data }));
        }
    };

    const deleteSession = async (id) => {
        if (!window.confirm('Usunąć?')) return;
        await axios.delete(`${API_URL}/api/catches/sesje/${id}`, { headers });
        setData(prev => ({ ...prev, sesje: prev.sesje.filter(s => s.id !== id) }));
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
                        gatunki={data.gatunki}
                        onToggle={() => toggleSession(sesja.id)}
                        onDelete={() => deleteSession(sesja.id)}
                    />
                ))}
            </div>
        </div>
    );
}


function SessionItem({ sesja, isOpen, ryby, lakeName, gatunki, onToggle, onDelete }) {
    return (
        <div className="accordion-item">
            <h2 className="accordion-header">
                <button className={`accordion-button ${!isOpen ? 'collapsed' : ''}`} onClick={onToggle}>
                 <strong>{lakeName || 'Nieznane'}</strong>
                 <span className="ms-2">{new Date(sesja.data_rozpoczecia).toLocaleDateString()}</span>
                </button>
            </h2>
            {isOpen && (
                <div className="accordion-body">
                    <p>Start: {new Date(sesja.data_rozpoczecia).toLocaleString()}</p>
                    <table className="table table-sm">
                        <thead>
                         <tr><th>Gatunek</th><th>Waga</th><th>Długość</th></tr>
                        </thead>
                        <tbody>
                            {ryby.map(r => (
                           <tr key={r.id}>
                          <td>{r.nazwa_gatunku || gatunki.find(g => g.id === r.gatunek_id)?.nazwa_polska}</td>
                            <td>{r.waga_g || '-'}g</td>
                            <td>{r.dlugosc_cm || '-'}cm</td>
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