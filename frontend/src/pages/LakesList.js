// Plik: pages/LakesList.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';

function LakesList() {
    const navigate = useNavigate();
    const [lakes, setLakes] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newLake, setNewLake] = useState({
        nazwa: '',
        typ: '',
        powierzchnia_ha: '',
        glebokosc_max: '',
        opis: '',
        granice: []
    });
    const { accessToken, user } = useAuth();
    const [canCreate, setCanCreate] = useState(false);
    const handlePolygonChange = (coords) => {
        setNewLake(prev => ({ ...prev, granice: coords }));
    };
    const fetchLakes = useCallback(async () => {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/lakes`);
        setLakes(res.data);
    }, []);

    useEffect(() => {
        const roles = user?.roles || [];
        setCanCreate(roles.includes('Właściciel') || roles.includes('Admin'));
        fetchLakes();
    }, [user, fetchLakes]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await axios.post(`${process.env.REACT_APP_API_URL}/api/lakes`, newLake, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        setShowForm(false);
        fetchLakes();
    };

    return (
        <div className="container mt-4">
            <h2>Łowiska</h2>
            {canCreate && <button className="btn btn-primary mb-3" onClick={() => setShowForm(!showForm)}>Dodaj łowisko</button>}
            {showForm && (
                <form onSubmit={handleSubmit} className="mb-4 border p-3">
                    <input
                        placeholder="Nazwa"
                        className="form-control mb-2"
                        value={newLake.nazwa}
                        onChange={e => setNewLake({ ...newLake, nazwa: e.target.value })}
                        maxLength={255}
                        required
                    />
                    <select
                        className="form-select mb-2"
                        value={newLake.typ}
                        onChange={e => setNewLake({ ...newLake, typ: e.target.value })}
                    >
                        <option value="">-- Wybierz typ --</option>
                        <option value="jezioro">Jezioro</option>
                        <option value="rzeka">Rzeka</option>
                        <option value="staw">Staw</option>
                        <option value="zalew">Zalew</option>
                    </select>
                    <input type="number" placeholder="Powierzchnia (ha)" className="form-control mb-2" onChange={e => setNewLake({ ...newLake, powierzchnia_ha: parseFloat(e.target.value) })} />
                    <input type="number" placeholder="Głębokość max (m)" className="form-control mb-2" onChange={e => setNewLake({ ...newLake, glebokosc_max: parseFloat(e.target.value) })} />
                    <textarea placeholder="Opis" className="form-control mb-2" onChange={e => setNewLake({ ...newLake, opis: e.target.value })} maxLength={1000} />
                    <MapComponent
                        initialPolygonCoords={newLake.granice}
                        readonly={false}
                        onPolygonChange={handlePolygonChange}
                    />
                    <button type="submit" className="btn btn-success">Zapisz</button>
                </form>
            )}
            <div className="row">
                {lakes.map(lake => (
                    <div key={lake.id} className="col-md-4 mb-3">
                        <div className="card h-100" style={{ cursor: 'pointer' }} onClick={() => navigate(`/lakes/${lake.id}`)}>
                            <div className="card-body">
                                <h5>{lake.nazwa}</h5>
                                <p>{lake.typ} | {lake.powierzchnia_ha} ha</p>
                                <p>{lake.opis}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default LakesList;