// Plik: frontend/src/pages/StationDetail.js
// Szczegóły stacji pomiarowej z wykresem i formularzem ręcznego dodawania odczytu (tylko admin)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const SENSOR_MAP = {
    temperatura: { field: 'temperatura_wody_c', label: 'Temperatura [°C]', placeholder: '18.5', step: '0.1' },
    tlen: { field: 'poziom_tlenu_mgl', label: 'Tlen [mg/l]', placeholder: '7.2', step: '0.1' },
    ph: { field: 'ph', label: 'pH', placeholder: '6.8', step: '0.01' },
    metnosc: { field: 'metnosc_ntu', label: 'Mętność [NTU]', placeholder: '2.3', step: '0.1' },
};

const COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'];

function StationDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const [station, setStation] = useState(null);
    const [lakes, setLakes] = useState([]);
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        reading_time: new Date().toISOString().slice(0, 16),
    });

    const isAdmin = user?.roles?.includes('Admin');

    console.log('StationDetail mounted, id:', id, 'isAdmin:', isAdmin);

    const fetchReadings = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        console.log('Token used for readings:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
        try {
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 6);
            const res = await api.get('/api/iot/readings', {
                params: {
                    station_id: id,
                    from_date: fromDate.toISOString(),
                    limit: 200,
                },
            });
            setReadings(res.data);
        } catch (err) {
            console.error('Błąd pobierania odczytów:', err.response?.status, err.response?.data);
        }
    }, [id]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                const token = localStorage.getItem('access_token');
                console.log('Token used for station:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
                const [stationRes, lakesRes] = await Promise.all([
                    api.get(`/api/iot/stations/${id}`),
                    api.get('/api/lakes'),
                ]);
                setStation(stationRes.data);
                setLakes(lakesRes.data);
            } catch (err) {
                setError(err.response?.data?.detail || 'Nie udało się wczytać danych stacji.');
            } finally {
                setLoading(false);
            }
        };
        if (id) {
            fetchData();
        } else {
            setError('Brak ID stacji w URL');
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (station) {
            fetchReadings();
            const initial = { reading_time: new Date().toISOString().slice(0, 16) };
            station.typ_czujnikow?.forEach((sensor) => {
                initial[sensor] = '';
            });
            setFormData(initial);
        }
    }, [station, fetchReadings]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSuccessMsg('');
        setError('');
        try {
            const token = localStorage.getItem('access_token');
            console.log('Token used for manual submit:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
            const payload = {
                station_id: parseInt(id, 10),
                reading_time: new Date(formData.reading_time).toISOString(),
                water_temp_c: formData.temperatura ? parseFloat(formData.temperatura) || null : null,
                oxygen_mgl: formData.tlen ? parseFloat(formData.tlen) || null : null,
                ph: formData.ph ? parseFloat(formData.ph) || null : null,
                turbidity_ntu: formData.metnosc ? parseFloat(formData.metnosc) || null : null,
            };
            console.log('Submitting manual reading:', payload);
            await api.post('/api/iot/readings/manual', payload);
            setSuccessMsg('Odczyt dodany pomyślnie.');
            const reset = { reading_time: new Date().toISOString().slice(0, 16) };
            station.typ_czujnikow?.forEach((sensor) => {
                reset[sensor] = '';
            });
            setFormData(reset);
            fetchReadings();
        } catch (err) {
            console.error('Error submitting reading:', err.response?.status, err.response?.data);
            setError(err.response?.data?.detail || 'Nie udało się dodać odczytu.');
        } finally {
            setSubmitting(false);
        }
    };

    const lakeName = station ? lakes.find((l) => l.id === station.lowisko_id)?.nazwa : '';

    const chartData = useMemo(() => {
        if (!station) return null;
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(d.toISOString().slice(0, 10));
        }
        const grouped = {};
        labels.forEach((lbl) => {
            grouped[lbl] = { temperatura_wody_c: [], poziom_tlenu_mgl: [], ph: [], metnosc_ntu: [] };
        });
        readings.forEach((item) => {
            const lbl = new Date(item.czas_odczytu).toISOString().slice(0, 10);
            if (!grouped[lbl]) return;
            ['temperatura_wody_c', 'poziom_tlenu_mgl', 'ph', 'metnosc_ntu'].forEach((field) => {
                if (item[field] != null) grouped[lbl][field].push(Number(item[field]));
            });
        });
        const activeSensors = station.typ_czujnikow?.filter((s) => SENSOR_MAP[s]) || [];
        const datasets = activeSensors.map((sensor, i) => {
            const { field, label } = SENSOR_MAP[sensor];
            return {
                label,
                data: labels.map((lbl) => {
                    const vals = grouped[lbl][field] || [];
                    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                }),
                borderColor: COLORS[i % COLORS.length],
                backgroundColor: COLORS[i % COLORS.length],
                tension: 0.3,
                spanGaps: true,
            };
        });
        return { labels, datasets };
    }, [readings, station]);

    const chartOptions = {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: {
            x: { title: { display: true, text: 'Data' } },
            y: { beginAtZero: false },
        },
    };

    if (loading) return <div className="text-center mt-4">Ładowanie...</div>;

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h2>Szczegóły stacji</h2>
                    <p className="mb-0">{station?.nazwa || 'Ładowanie...'}</p>
                </div>
                <Link to="/iot" className="btn btn-secondary">Powrót do listy</Link>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {successMsg && <div className="alert alert-success">{successMsg}</div>}

            {station ? (
                <>
                    <div className="card p-3 mb-4">
                        <div className="row">
                            <div className="col-md-6">
                                <h5>Informacje o stacji</h5>
                                <p><strong>Łowisko:</strong> {lakeName || station.lowisko_id}</p>
                                <p><strong>Czujniki:</strong> {station.typ_czujnikow?.join(', ') || 'brak'}</p>
                                <p><strong>Ostatnia aktywność:</strong> {station.last_seen ? new Date(station.last_seen).toLocaleString('pl-PL') : 'brak danych'}</p>
                            </div>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="card p-3 mb-4">
                            <h5>Dodaj odczyt ręcznie (Admin)</h5>
                            <form onSubmit={handleManualSubmit}>
                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <label className="form-label">Data i godzina</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            name="reading_time"
                                            value={formData.reading_time}
                                            onChange={handleFormChange}
                                            required
                                        />
                                    </div>
                                    {station.typ_czujnikow?.map((sensor) => {
                                        const cfg = SENSOR_MAP[sensor];
                                        if (!cfg) return null;
                                        return (
                                            <div className="col-md-2" key={sensor}>
                                                <label className="form-label">{cfg.label}</label>
                                                <input
                                                    type="number"
                                                    step={cfg.step}
                                                    className="form-control"
                                                    name={sensor}
                                                    value={formData[sensor] || ''}
                                                    onChange={handleFormChange}
                                                    placeholder={cfg.placeholder}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                <button type="submit" className="btn btn-primary mt-3" disabled={submitting}>
                                    {submitting ? 'Dodawanie...' : 'Dodaj odczyt'}
                                </button>
                            </form>
                        </div>
                    )}

                    {readings.length === 0 ? (
                        <div className="alert alert-info">Brak odczytów dla tej stacji z ostatniego tygodnia.</div>
                    ) : (
                        <>
                            <div className="card p-3 mb-4">
                                <h5>Średnie dzienne (ostatnie 7 dni)</h5>
                                <Line data={chartData} options={chartOptions} />
                            </div>
                            <div className="card p-3">
                                <h5>Odczyty</h5>
                                <div className="table-responsive">
                                    <table className="table table-sm table-striped">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Temp. [°C]</th>
                                                <th>O₂ [mg/l]</th>
                                                <th>pH</th>
                                                <th>Mętność [NTU]</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {readings.map((item) => (
                                                <tr key={item.id}>
                                                    <td>{new Date(item.czas_odczytu).toLocaleString('pl-PL')}</td>
                                                    <td>{item.temperatura_wody_c ?? '-'}</td>
                                                    <td>{item.poziom_tlenu_mgl ?? '-'}</td>
                                                    <td>{item.ph ?? '-'}</td>
                                                    <td>{item.metnosc_ntu ?? '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            ) : (
                <div className="alert alert-warning">Nie znaleziono stacji.</div>
            )}
        </div>
    );
}

export default StationDetail;