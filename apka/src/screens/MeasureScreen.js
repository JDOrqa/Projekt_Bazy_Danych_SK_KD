// src/screens/MeasureScreen.js
// Rysowanie prostokąta (przeciągnij palcem) – automatycznie zaznacza 4 narożniki karty.
import React, { useState, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, Image,
    StyleSheet, Alert, ActivityIndicator,
    ScrollView, Dimensions, PanResponder,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Rect, Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DISPLAY_SIZE = SCREEN_WIDTH - 40;   // maksymalny rozmiar podglądu
const HIT_RADIUS = 20;                   // dla ewentualnych uchwytów (opcjonalnie)

// ─── UTILS ───────────────────────────────────────────
function toNatural(pt, dispW, dispH, natW, natH) {
    return [
        Math.round((pt.x / dispW) * natW),
        Math.round((pt.y / dispH) * natH),
    ];
}

// ─── KOMPONENT ───────────────────────────────────────
export default function MeasureScreen() {
    const navigation = useNavigation();
    const [photo, setPhoto] = useState(null); // { uri, naturalWidth, naturalHeight, displayW, displayH }
    const [rect, setRect] = useState(null);   // { x, y, width, height } – współrzędne display
    const [result, setResult] = useState(null);
    const [debugUri, setDebugUri] = useState(null);
    const [loading, setLoading] = useState(false);
    const [measureResult, setMeasureResult] = useState(null);

    // PanResponder do rysowania prostokąta
    const startPointRef = useRef(null);
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                startPointRef.current = { x: locationX, y: locationY };
                setRect(null); // kasujemy poprzedni prostokąt
            },

            onPanResponderMove: (evt) => {
                if (!startPointRef.current) return;
                const { locationX, locationY } = evt.nativeEvent;
                const x1 = startPointRef.current.x;
                const y1 = startPointRef.current.y;
                const x2 = locationX;
                const y2 = locationY;
                setRect({
                    x: Math.min(x1, x2),
                    y: Math.min(y1, y2),
                    width: Math.abs(x2 - x1),
                    height: Math.abs(y2 - y1),
                });
            },

            onPanResponderRelease: () => {
                startPointRef.current = null;
            },
        })
    ).current;

    // ── pomocnicze: getDisplayDims ─────────────────────
    function getDisplayDims(natW, natH) {
        const ratio = Math.min(DISPLAY_SIZE / natW, DISPLAY_SIZE / natH);
        return {
            displayW: Math.round(natW * ratio),
            displayH: Math.round(natH * ratio),
        };
    }

    // ── załaduj zdjęcie ─────────────────────────────────
    async function pickImage() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Błąd', 'Potrzebujemy dostępu do galerii.');
            return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.9,
        });
        if (!res.canceled) loadPhoto(res.assets[0]);
    }

    async function takePhoto() {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Błąd', 'Potrzebujemy dostępu do aparatu.');
            return;
        }
        const res = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.9,
        });
        if (!res.canceled) loadPhoto(res.assets[0]);
    }

    function loadPhoto(asset) {
        const natW = asset.width || 1200;
        const natH = asset.height || 900;
        const { displayW, displayH } = getDisplayDims(natW, natH);
        setPhoto({
            uri: asset.uri,
            naturalWidth: natW,
            naturalHeight: natH,
            displayW,
            displayH,
        });
        setRect(null);
        setResult(null);
        setDebugUri(null);
    }

    // ── przekształć prostokąt na 4 narożniki w naturalnych pikselach ──
    const getCardPoints = useCallback(() => {
        if (!photo || !rect) return null;
        const { x, y, width, height } = rect;
        // punkty w przestrzeni display (lewy-górny, prawy-górny, prawy-dolny, lewy-dolny)
        const displayPoints = [
            { x, y },
            { x: x + width, y },
            { x: x + width, y: y + height },
            { x, y: y + height },
        ];
        const naturalPoints = displayPoints.map(p =>
            toNatural(p, photo.displayW, photo.displayH, photo.naturalWidth, photo.naturalHeight)
        );
        return naturalPoints;
    }, [photo, rect]);

    // ── pomiar ─────────────────────────────────────────
    async function uploadAndMeasure() {
        const cardPoints = getCardPoints();
        if (!photo || !cardPoints) {
            Alert.alert('Zaznacz kartę', 'Narysuj prostokąt wokół karty na zdjęciu.');
            return;
        }

        setLoading(true);
        setResult(null);
        setDebugUri(null);

        const formData = new FormData();
        formData.append('file', {
            uri: photo.uri,
            name: 'fish_photo.jpg',
            type: 'image/jpeg',
        });
        formData.append('card_points', JSON.stringify(cardPoints));
        formData.append('draw_boxes', 'true');

        try {
            const response = await api.post('/api/measure/fish', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                params: { draw_boxes: true },
            });
            
            setMeasureResult(response.data);
            if (response.data.image_base64) {
                setDebugUri(`data:image/jpeg;base64,${response.data.image_base64}`);
            }
        } catch (err) {
            console.error('Pełny błąd:', err);
            console.error('Response data:', err.response?.data);
            const msg = err.response?.data?.detail || err.message || 'Błąd pomiaru. Spróbuj ponownie.';
            Alert.alert('Błąd', msg);
            setLoading(false);
        }
    }

    //  RENDER 
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}> Zmierz Rybę</Text>
            <Text style={styles.subtitle}>Narysuj prostokąt wokół karty</Text>

            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.btn} onPress={takePhoto}>
                    <Text style={styles.btnText}> Aparat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btn} onPress={pickImage}>
                    <Text style={styles.btnText}> Galeria</Text>
                </TouchableOpacity>
            </View>

            {photo ? (
                <View style={styles.imageSection}>
                    <View
                        style={[styles.imageWrap, { width: photo.displayW, height: photo.displayH }]}
                        {...panResponder.panHandlers}
                    >
                        <Image
                            source={{ uri: photo.uri }}
                            style={{ width: photo.displayW, height: photo.displayH, borderRadius: 10 }}
                            resizeMode="contain"
                        />
                        {rect && (
                            <Svg
                                width={photo.displayW}
                                height={photo.displayH}
                                style={StyleSheet.absoluteFill}
                            >
                                <Rect
                                    x={rect.x}
                                    y={rect.y}
                                    width={rect.width}
                                    height={rect.height}
                                    stroke="#00ff88"
                                    strokeWidth={3}
                                    fill="rgba(0,255,136,0.1)"
                                    strokeDasharray="6,4"
                                />
                                {/* małe kółka w rogach */}
                                {[
                                    [rect.x, rect.y],
                                    [rect.x + rect.width, rect.y],
                                    [rect.x + rect.width, rect.y + rect.height],
                                    [rect.x, rect.y + rect.height],
                                ].map(([cx, cy], idx) => (
                                    <Circle key={idx} cx={cx} cy={cy} r={6} fill="#ffcc00" stroke="#000" strokeWidth={1} />
                                ))}
                            </Svg>
                        )}
                    </View>

                    <View style={styles.toolRow}>
                        <TouchableOpacity style={styles.toolBtn} onPress={() => setRect(null)}>
                            <Text style={styles.toolBtnText}>X Wyczyść prostokąt</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.measureBtn, (!rect) && styles.measureBtnDisabled]}
                        onPress={uploadAndMeasure}
                        disabled={!rect || loading}
                    >
                        {loading ? <ActivityIndicator color="#001a0a" /> : <Text style={styles.measureBtnText}> ZMIERZ RYBĘ</Text>}
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderIcon}>🐟</Text>
                    <Text style={styles.placeholderText}>Zrób lub wybierz zdjęcie ryby</Text>
                    <Text style={styles.placeholderSub}>Następnie narysuj prostokąt wokół karty kredytowej</Text>
                </View>
            )}

            {result && !loading && (
                <View style={styles.resultCard}>
                    <Text style={styles.resultTitle}>Wynik pomiaru</Text>
                    <Text style={styles.resultValue}>{result.dlugosc_cm} cm</Text>

                 
                    {result.gatunek && (
                        <View style={styles.speciesContainer}>
                            <Text style={styles.speciesLabel}>Rozpoznany gatunek:</Text>
                            <Text style={styles.speciesName}>{result.gatunek}</Text>
                            <Text style={styles.speciesConfidence}>Ufność: {Math.round((result.ufnosc_gatunku || 0) * 100)}%</Text>
                        </View>
                    )}

                    {/* Pozostałe metryki */}
                    <View style={styles.resultMeta}>
                        <MetaRow label="Ufność pomiaru" value={`${Math.round((result.ufnosc ?? 0) * 100)}%`} />
                        <MetaRow label="Piksele" value={`${result.dlugosc_px} px`} />
                        <MetaRow label="GrabCut" value={result.used_grabcut ? '✅ tak' : '— nie'} />
                        <MetaRow label="Karta" value={result.card_detected ? '✅ zaznaczona' : '—'} />
                    </View>
                </View>
            )}

            {debugUri && (
                <View style={styles.debugSection}>
                    <Text style={styles.debugTitle}>Wynik detekcji</Text>
                    <Text style={styles.debugSub}>Zielony = karta · Czerwony = ryba</Text>
                    <Image source={{ uri: debugUri }} style={[styles.debugImage, { width: photo?.displayW ?? 300, height: photo?.displayH ?? 300 }]} resizeMode="contain" />
                </View>
            )}
            {measureResult && (
                <View style={styles.confirmButtons}>
                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => navigation.replace('CatchScreen', { wynikPomiaru: measureResult })}
                    >
                        <Text style={styles.buttonText}> Zatwierdź i wróć</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => {
                            setMeasureResult(null);
                            setDebugUri(null);
                            setLoading(false);
                        }}
                    >
                        <Text style={styles.buttonText}>X Odrzuć i spróbuj ponownie</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}

function MetaRow({ label, value }) {
    return (
        <View style={meta.row}>
            <Text style={meta.label}>{label}</Text>
            <Text style={meta.value}>{value}</Text>
        </View>
    );
}
const meta = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#eee' },
    label: { fontSize: 13, color: '#666' },
    value: { fontSize: 13, fontWeight: '600', color: '#222' },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f0', marginTop: 20 },
    content: { padding: 20, alignItems: 'center', paddingBottom: 40 },
    title: { fontSize: 26, fontWeight: '800', color: '#1a3a1a', marginBottom: 2 },
    subtitle: { fontSize: 12, color: '#6a8a6a', marginBottom: 20 },
    buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    btn: { backgroundColor: '#1a5c2a', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 10 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    imageSection: { width: '100%', alignItems: 'center', gap: 10 },
    imageWrap: { borderRadius: 10, overflow: 'hidden', alignSelf: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
    toolRow: { flexDirection: 'row', gap: 10, alignSelf: 'center' },
    toolBtn: { borderWidth: 1, borderColor: '#c0cfc0', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#fff' },
    toolBtnText: { fontSize: 12, color: '#3a5a3a', fontWeight: '600' },
    measureBtn: { backgroundColor: '#00cc66', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, alignSelf: 'stretch', alignItems: 'center', elevation: 3 },
    measureBtnDisabled: { backgroundColor: '#aaa', shadowOpacity: 0, elevation: 0 },
    measureBtnText: { color: '#001a0a', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
    placeholder: { alignItems: 'center', padding: 40, backgroundColor: '#fff', borderRadius: 16, width: '100%', borderWidth: 2, borderColor: '#dde8dd', borderStyle: 'dashed' },
    placeholderIcon: { fontSize: 52, marginBottom: 12 },
    placeholderText: { fontSize: 16, fontWeight: '700', color: '#2a4a2a', marginBottom: 6 },
    placeholderSub: { fontSize: 12, color: '#8aaa8a', textAlign: 'center', lineHeight: 18 },
    resultCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '100%', marginTop: 16, elevation: 3, alignItems: 'center' },
    resultTitle: { fontSize: 13, fontWeight: '700', color: '#6a8a6a', textTransform: 'uppercase', marginBottom: 6 },
    resultValue: { fontSize: 56, fontWeight: '800', color: '#00aa44', lineHeight: 62, marginBottom: 12 },
    resultMeta: { width: '100%' },
    debugSection: { width: '100%', alignItems: 'center', marginTop: 20, backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2 },
    debugTitle: { fontSize: 14, fontWeight: '700', color: '#2a4a2a', marginBottom: 2 },
    debugSub: { fontSize: 11, color: '#8aaa8a', marginBottom: 10 },
    debugImage: { borderRadius: 8, alignSelf: 'center' },
    speciesContainer: {
        alignItems: 'center',
        marginVertical: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#e0e0e0',
    },
    speciesLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    speciesName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a5c2a',
    },
    speciesConfidence: {
        fontSize: 12,
        color: '#888',
    },
    confirmButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, width: '100%' },
    acceptButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 8, flex: 1, marginRight: 8 },
    rejectButton: { backgroundColor: '#dc3545', padding: 12, borderRadius: 8, flex: 1, marginLeft: 8 },
});