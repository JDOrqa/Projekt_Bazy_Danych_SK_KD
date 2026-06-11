// src/screens/CatchScreen.js
// Ekran dla aktywnej sesji – dodawanie ryb, lista złowionych, zakończenie sesji.
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CatchScreen({ route, navigation }) {
    const { sesjaId: initialSesjaId } = route.params || {};
    const { accessToken } = useAuth();

    // Stany podstawowe
    const [sesja, setSesja] = useState(null);
    const [ryby, setRyby] = useState([]);
    const [loading, setLoading] = useState(true);
    const [gatunki, setGatunki] = useState([]);
    const [metody, setMetody] = useState([]);
    const [przynety, setPrzynety] = useState([]);

    // Formularz
    const [form, setForm] = useState({
        gatunek_id: '',
        metoda_id: '',
        przyneta_id: '',
        waga_g: '',
        dlugosc_cm: '',
        wypuszczona: false,
        uwagi: '',
    });

    // Wynik pomiaru (z MeasureScreen)
    const [wynikPomiaru, setWynikPomiaru] = useState(null);
    // Przechowuje wynik, który przyszedł zanim załadowały się gatunki
    const pendingWynikRef = useRef(null);

    // ------------------------------------------------------------
    // 1. Pobranie sesji i słowników
    // ------------------------------------------------------------
    useEffect(() => {
        const fetchSession = async () => {
            try {
                let sesjaData;
                if (initialSesjaId) {
                    const res = await api.get(`/api/catches/sesje/${initialSesjaId}`);
                    sesjaData = res.data;
                } else {
                    const res = await api.get('/api/catches/sesje/aktywna');
                    sesjaData = res.data;
                }
                setSesja(sesjaData);
                const rybyRes = await api.get(`/api/catches/sesje/${sesjaData.id}/ryby`);
                setRyby(rybyRes.data);
            } catch (err) {
                if (err.response?.status === 404) {
                    Alert.alert('Brak aktywnej sesji', 'Rozpocznij nową sesję z dashboardu.');
                    navigation.goBack();
                } else {
                    Alert.alert('Błąd', 'Nie udało się pobrać sesji.');
                    console.error(err);
                }
            } finally {
                setLoading(false);
            }
        };

        const fetchDictionaries = async () => {
            try {
                const [gatunkiRes, metodyRes, przynetyRes] = await Promise.all([
                    api.get('/api/admin/gatunki'),
                    api.get('/api/catches/metody'),
                    api.get('/api/catches/przynety'),
                ]);
                setGatunki(gatunkiRes.data);
                setMetody(metodyRes.data);
                setPrzynety(przynetyRes.data);
            } catch (err) {
                console.error('Błąd ładowania słowników', err);
            }
        };

        fetchSession();
        fetchDictionaries();
    }, [initialSesjaId]);

    // ------------------------------------------------------------
    // 2. Obsługa wyniku pomiaru (przychodzi z MeasureScreen)
    // ------------------------------------------------------------
    const processMeasurement = (wynik) => {
        if (!wynik) return;

        // Długość
        if (wynik.dlugosc_cm) {
            setForm(prev => ({ ...prev, dlugosc_cm: wynik.dlugosc_cm.toString() }));
        }

        // Gatunek – tylko jeśli lista gatunków już jest
        if (wynik.gatunek) {
            if (gatunki.length > 0) {
                const gatunekNazwa = wynik.gatunek;
                const znaleziony = gatunki.find(g =>
                    g.nazwa_polska?.toLowerCase() === gatunekNazwa.toLowerCase() ||
                    g.nazwa_lacina?.toLowerCase() === gatunekNazwa.toLowerCase()
                );
                if (znaleziony) {
                    setForm(prev => ({ ...prev, gatunek_id: znaleziony.id.toString() }));
                } else {
                    Alert.alert('Uwaga', `Nieznany gatunek "${wynik.gatunek}". Wybierz ręcznie z listy.`);
                }
            } else {
                // Lista jeszcze niezaładowana – zapisz do przetworzenia później
                pendingWynikRef.current = wynik;
            }
        }

        setWynikPomiaru(wynik);
    };

    // Odbieranie wyniku z parametru nawigacji
    useEffect(() => {
        if (route.params?.wynikPomiaru) {
            processMeasurement(route.params.wynikPomiaru);
            // Czyścimy parametr, aby nie przetwarzać go wielokrotnie
            navigation.setParams({ wynikPomiaru: undefined });
        }
    }, [route.params?.wynikPomiaru]);

    // Gdy lista gatunków w końcu się załaduje, przetwórz oczekujący wynik
    useEffect(() => {
        if (gatunki.length > 0 && pendingWynikRef.current) {
            processMeasurement(pendingWynikRef.current);
            pendingWynikRef.current = null;
        }
    }, [gatunki]);

    // ------------------------------------------------------------
    // 3. Dodawanie ryby
    // ------------------------------------------------------------
    const handleFormChange = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const addFish = async () => {
        if (!form.gatunek_id) {
            Alert.alert('Błąd', 'Wybierz gatunek');
            return;
        }
        try {
            const payload = {
                gatunek_id: parseInt(form.gatunek_id),
                metoda_id: form.metoda_id ? parseInt(form.metoda_id) : null,
                przyneta_id: form.przyneta_id ? parseInt(form.przyneta_id) : null,
                waga_g: form.waga_g ? parseInt(form.waga_g) : null,
                dlugosc_cm: form.dlugosc_cm ? parseFloat(form.dlugosc_cm) : null,
                wypuszczona: form.wypuszczona,
                uwagi: form.uwagi || null,
                wynik_id: wynikPomiaru?.wynik_id || null,
            };
            const res = await api.post(`/api/catches/sesje/${sesja.id}/ryby`, payload);
            setRyby(prev => [res.data, ...prev]);
            // Reset formularza (zachowujemy tylko wynik do ewentualnego kolejnego użycia)
            setForm({
                gatunek_id: '',
                metoda_id: '',
                przyneta_id: '',
                waga_g: '',
                dlugosc_cm: '',
                wypuszczona: false,
                uwagi: '',
            });
            setWynikPomiaru(null);
            Alert.alert('Sukces', 'Ryba dodana');
        } catch (err) {
            Alert.alert('Błąd', err.response?.data?.detail || 'Nie udało się dodać ryby');
        }
    };

    // ------------------------------------------------------------
    // 4. Zakończenie sesji
    // ------------------------------------------------------------
    const endSession = async () => {
        if (!sesja) return;
        try {
            await api.post(`/api/catches/sesje/${sesja.id}/end`, {});
            Alert.alert('Sesja zakończona', 'Wróć do dashboardu');
            navigation.replace('Dashboard');
        } catch (err) {
            Alert.alert('Błąd', 'Nie udało się zakończyć sesji');
        }
    };

    // ------------------------------------------------------------
    // Render
    // ------------------------------------------------------------
    if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
    if (!sesja) return <View><Text>Brak sesji</Text></View>;

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Aktywna sesja</Text>
            <Text style={styles.lake}>Łowisko: {sesja.nazwa_lowiska || '?'}</Text>
            <Text style={styles.time}>Start: {new Date(sesja.data_rozpoczecia).toLocaleString()}</Text>

            <View style={styles.formCard}>
                <Text style={styles.formTitle}>Dodaj rybę</Text>

                {/* Gatunek */}
                <Text style={styles.label}>Gatunek *</Text>
                <Picker
                    selectedValue={form.gatunek_id}
                    onValueChange={(v) => handleFormChange('gatunek_id', v)}
                    style={styles.picker}
                >
                    <Picker.Item label="-- wybierz --" value="" />
                    {gatunki.map(g => (
                        <Picker.Item key={g.id} label={g.nazwa_polska} value={g.id.toString()} />
                    ))}
                </Picker>

                {/* Metoda */}
                <Text style={styles.label}>Metoda</Text>
                <Picker
                    selectedValue={form.metoda_id}
                    onValueChange={(v) => handleFormChange('metoda_id', v)}
                    style={styles.picker}
                >
                    <Picker.Item label="-- brak --" value="" />
                    {metody.map(m => (
                        <Picker.Item key={m.id} label={m.nazwa} value={m.id.toString()} />
                    ))}
                </Picker>

                {/* Przynęta */}
                <Text style={styles.label}>Przynęta</Text>
                <Picker
                    selectedValue={form.przyneta_id}
                    onValueChange={(v) => handleFormChange('przyneta_id', v)}
                    style={styles.picker}
                >
                    <Picker.Item label="-- brak --" value="" />
                    {przynety.map(p => (
                        <Picker.Item key={p.id} label={p.nazwa} value={p.id.toString()} />
                    ))}
                </Picker>

                <TextInput
                    placeholder="Waga (g)"
                    keyboardType="numeric"
                    value={form.waga_g}
                    onChangeText={(v) => handleFormChange('waga_g', v)}
                    style={styles.input}
                />
                <TextInput
                    placeholder="Długość (cm)"
                    keyboardType="numeric"
                    value={form.dlugosc_cm}
                    onChangeText={(v) => handleFormChange('dlugosc_cm', v)}
                    style={styles.input}
                />

                {/* Checkbox "wypuszczona" (natywny TouchableOpacity) */}
                <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => handleFormChange('wypuszczona', !form.wypuszczona)}
                >
                    <View style={[styles.checkbox, form.wypuszczona && styles.checkboxChecked]} />
                    <Text style={styles.checkboxLabel}>Wypuszczona</Text>
                </TouchableOpacity>

                <TextInput
                    placeholder="Uwagi"
                    value={form.uwagi}
                    onChangeText={(v) => handleFormChange('uwagi', v)}
                    style={styles.input}
                />

                <TouchableOpacity style={styles.measureButton} onPress={() => navigation.navigate('Measure')}>
                    <Text style={styles.buttonText}>Zmierz rybę</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={addFish}>
                    <Text style={styles.buttonText}>+ Dodaj rybę</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.catchListTitle}>Złowione ryby ({ryby.length})</Text>
            {ryby.map(r => (
                <View key={r.id} style={styles.catchItem}>
                    <Text>{r.nazwa_gatunku} – {r.dlugosc_cm} cm, {r.waga_g} g</Text>
                    <Text>Wypuszczona: {r.wypuszczona ? 'Tak' : 'Nie'}</Text>
                </View>
            ))}

            <TouchableOpacity style={styles.endButton} onPress={endSession}>
                <Text style={styles.buttonText}>Zakończ sesję</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, flex: 1, backgroundColor: '#fff', marginTop: 25 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
    lake: { fontSize: 18, fontWeight: '600' },
    time: { fontSize: 14, color: '#666', marginBottom: 16 },
    formCard: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 16 },
    formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    label: { fontSize: 14, fontWeight: '500', marginBottom: 4, marginTop: 8 },
    picker: { backgroundColor: '#fff', marginBottom: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 6 },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 6, marginBottom: 12, backgroundColor: '#fff' },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: '#0d6efd', borderRadius: 4, marginRight: 8 },
    checkboxChecked: { backgroundColor: '#0d6efd' },
    checkboxLabel: { fontSize: 16 },
    measureButton: { backgroundColor: '#ffc107', padding: 10, borderRadius: 6, alignItems: 'center', marginBottom: 8 },
    addButton: { backgroundColor: '#28a745', padding: 10, borderRadius: 6, alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: 'bold' },
    catchListTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 12 },
    catchItem: { backgroundColor: '#e9ecef', padding: 8, borderRadius: 6, marginBottom: 8 },
    endButton: { backgroundColor: '#dc3545', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 20, marginBottom: 40 },
});