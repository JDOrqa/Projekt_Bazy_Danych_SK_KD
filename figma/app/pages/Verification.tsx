import { useState } from 'react';
import { Camera, CheckCircle, XCircle, AlertCircle, Ruler } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { toast } from 'sonner';

interface PendingPhoto {
  id: string;
  fishId: string;
  url: string;
  estimatedLength: number;
  confidence: number;
  uploadedAt: Date;
  sessionInfo: string;
  species: string;
}

export function Verification() {
  const [pendingPhotos] = useState<PendingPhoto[]>([
    {
      id: '1',
      fishId: '1',
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
      estimatedLength: 52,
      confidence: 0.87,
      uploadedAt: new Date('2026-04-08T09:30:00'),
      sessionInfo: 'Jezioro Śniardwy - 08.04.2026',
      species: 'Szczupak'
    },
    {
      id: '2',
      fishId: '2',
      url: 'https://images.unsplash.com/photo-1534043464124-3be32fe000c9?w=400',
      estimatedLength: 35,
      confidence: 0.92,
      uploadedAt: new Date('2026-04-07T14:15:00'),
      sessionInfo: 'Wisła - Warszawa - 07.04.2026',
      species: 'Okoń'
    },
    {
      id: '3',
      fishId: '3',
      url: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=400',
      estimatedLength: 68,
      confidence: 0.74,
      uploadedAt: new Date('2026-04-07T11:45:00'),
      sessionInfo: 'Zalew Zegrzyński - 07.04.2026',
      species: 'Karp'
    }
  ]);

  const handleApprove = (id: string) => {
    toast.success('Analiza zatwierdzona!');
  };

  const handleReject = (id: string) => {
    toast.error('Analiza odrzucona!');
  };

  const handleManualMeasure = (id: string) => {
    toast.info('Otwarto edytor pomiarów ręcznych');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Weryfikacja zdjęć</h1>
        <p className="text-gray-600 mt-2">Sprawdź i zatwierdź automatyczne analizy zdjęć ryb</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Oczekujące</p>
              <p className="text-2xl font-bold text-gray-900">{pendingPhotos.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Zatwierdzone dziś</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Średnia pewność</p>
              <p className="text-2xl font-bold text-gray-900">84%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Photos Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pendingPhotos.map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="space-y-4">
                {/* Image */}
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={photo.url}
                    alt="Fish"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      photo.confidence >= 0.9 ? 'bg-green-500 text-white' :
                      photo.confidence >= 0.75 ? 'bg-yellow-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      Pewność: {(photo.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Gatunek:</span>
                    <span className="font-semibold text-gray-900">{photo.species}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Oszacowana długość:</span>
                    <span className="font-semibold text-gray-900">{photo.estimatedLength} cm</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Sesja:</span>
                    <span className="text-sm text-gray-600">{photo.sessionInfo}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Data przesłania:</span>
                    <span className="text-sm text-gray-600">
                      {photo.uploadedAt.toLocaleString('pl-PL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => handleApprove(photo.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Zatwierdź
                  </Button>
                  <Button
                    onClick={() => handleManualMeasure(photo.id)}
                    variant="outline"
                    className="flex items-center justify-center gap-2"
                  >
                    <Ruler className="w-4 h-4" />
                    Pomiar
                  </Button>
                  <Button
                    onClick={() => handleReject(photo.id)}
                    variant="outline"
                    className="flex items-center justify-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Odrzuć
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {pendingPhotos.length === 0 && (
        <Card className="p-12 text-center">
          <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Brak zdjęć do weryfikacji</h3>
          <p className="text-gray-600">Wszystkie zdjęcia zostały zweryfikowane</p>
        </Card>
      )}
    </div>
  );
}
