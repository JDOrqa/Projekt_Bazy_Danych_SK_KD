import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SENSOR_OPTIONS = [
    { value: 'temperatura', label: 'Temperatura wody' },
    { value: 'tlen', label: 'Poziom tlenu' },
    { value: 'ph', label: 'pH' },
    { value: 'metnosc', label: 'Mętność' },
];

function NewStation() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [lakes, setLakes] = useState([]);
    const [form, setForm] = useState({ nazwa: '', lowisko_id: '', typ_czujnikow: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadLakes = async () => {
            try {
                const res = await api.get('/api/lakes');
                setLakes(res.data);
            } catch (err) {
                console.error('Błąd pobierania łowisk:', err);
            }
        };

        loadLakes();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const toggleSensor = (sensor) => {
        setForm((prev) => {
            const current = new Set(prev.typ_czujnikow);
            if (current.has(sensor)) {
                current.delete(sensor);
            } else {
                current.add(sensor);
            }
            return { ...prev, typ_czujnikow: Array.from(current) };
        });
    };

    const handleSubmit = async () => {
        setError('');
        if (!form.nazwa || !form.lowisko_id || form.typ_czujnikow.length === 0) {
            setError('Proszę wypełnić wszystkie pola formularza.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/api/iot/stations', {
                nazwa: form.nazwa,
                lowisko_id: Number(form.lowisko_id),
                typ_czujnikow: form.typ_czujnikow,
            });
            navigate('/iot');
        } catch (err) {
            setError(err.response?.data?.detail || 'Błąd tworzenia stacji.');
            console.error('Błąd tworzenia stacji:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">Musisz się zalogować, aby dodać nową stację.</div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <h2>Nowa stacja pomiarowa</h2>
            <div className="mb-3">
                <Link to="/iot" className="btn btn-secondary">Powrót do listy stacji</Link>
            </div>
            <div className="card p-3">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="row g-3">
                    <div className="col-md-4">
                        <label className="form-label">Nazwa stacji</label>
                        <input name="nazwa" type="text" className="form-control" value={form.nazwa} onChange={handleChange} />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Łowisko</label>
                        <select name="lowisko_id" className="form-select" value={form.lowisko_id} onChange={handleChange}>
                            <option value="">Wybierz łowisko</option>
                            {lakes.map((lake) => (
                                <option key={lake.id} value={lake.id}>{lake.nazwa}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Typy czujników</label>
                        <div className="d-flex flex-wrap gap-2">
                            {SENSOR_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`btn btn-sm ${form.typ_czujnikow.includes(option.value) ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => toggleSensor(option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="col-12 d-flex justify-content-end mt-3">
                        <button className="btn btn-success" disabled={loading} onClick={handleSubmit}>
                            {loading ? 'Tworzę...' : 'Utwórz stację'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NewStation;
