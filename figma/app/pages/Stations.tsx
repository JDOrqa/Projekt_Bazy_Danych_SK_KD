import { useState } from 'react';
import { Plus, Wifi, WifiOff, Thermometer, Droplet, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { mockStations, mockFishingGrounds } from '../data/mockData';
import { MonitoringStation, EnvironmentalReading } from '../types';

export function Stations() {
  const [stations] = useState<MonitoringStation[]>(mockStations);
  const [mockReadings] = useState<EnvironmentalReading[]>([
    {
      id: '1',
      stationId: '1',
      readingTime: new Date('2026-04-08T10:00:00'),
      waterTempC: 12.5,
      oxygenMgL: 8.2,
      ph: 7.4,
      turbidityNTU: 3.2,
      createdAt: new Date()
    },
    {
      id: '2',
      stationId: '1',
      readingTime: new Date('2026-04-08T09:00:00'),
      waterTempC: 12.3,
      oxygenMgL: 8.3,
      ph: 7.5,
      turbidityNTU: 3.1,
      createdAt: new Date()
    }
  ]);

  const getGroundName = (groundId: string) => {
    return mockFishingGrounds.find(g => g.id === groundId)?.name || 'Nieznane łowisko';
  };

  const isOnline = (lastSeen?: Date) => {
    if (!lastSeen) return false;
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    return diff < 3600000; // 1 hour
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stacje pomiarowe</h1>
          <p className="text-gray-600 mt-2">Monitoruj parametry środowiskowe łowisk</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Dodaj stację
        </Button>
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stations.map((station, index) => {
          const online = isOnline(station.lastSeen);
          const latestReading = mockReadings[0];

          return (
            <motion.div
              key={station.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{station.name}</h3>
                      <p className="text-sm text-gray-600">{getGroundName(station.groundId)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {online ? (
                        <>
                          <Wifi className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">Online</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-400 font-medium">Offline</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Last seen */}
                  {station.lastSeen && (
                    <div className="text-sm text-gray-600">
                      Ostatni kontakt: {station.lastSeen.toLocaleString('pl-PL', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}

                  {/* Readings */}
                  {online && latestReading && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                          <Thermometer className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Temperatura</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {latestReading.waterTempC}°C
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Droplet className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Tlen</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {latestReading.oxygenMgL} mg/L
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">pH</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {latestReading.ph}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Mętność</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {latestReading.turbidityNTU} NTU
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sensors */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">Czujniki:</p>
                    <div className="flex flex-wrap gap-2">
                      {station.sensorTypes.map((sensor, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {sensor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {stations.length === 0 && (
        <Card className="p-12 text-center">
          <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Brak stacji pomiarowych</h3>
          <p className="text-gray-600 mb-4">Dodaj pierwszą stację monitorującą parametry środowiska</p>
          <Button>Dodaj stację</Button>
        </Card>
      )}
    </div>
  );
}
