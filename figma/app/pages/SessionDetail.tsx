import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Fish, Plus, Camera, MapPin, Clock, Edit, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { mockSessions, mockFishingGrounds, mockSpecies, mockMethods, mockBaits } from '../data/mockData';
import { toast } from 'sonner';

export function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(mockSessions.find(s => s.id === id));
  const [showAddFish, setShowAddFish] = useState(false);
  const [newFish, setNewFish] = useState({
    speciesId: '',
    methodId: '',
    baitId: '',
    weight: '',
    length: '',
    released: true
  });

  if (!session) {
    return <div>Sesja nie znaleziona</div>;
  }

  const ground = mockFishingGrounds.find(g => g.id === session.groundId);

  const handleEndSession = () => {
    toast.success('Sesja zakończona!');
    navigate('/sesje');
  };

  const handleAddFish = () => {
    if (!newFish.speciesId || !newFish.methodId || !newFish.baitId) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    toast.success('Ryba dodana do sesji!');
    setShowAddFish(false);
    setNewFish({
      speciesId: '',
      methodId: '',
      baitId: '',
      weight: '',
      length: '',
      released: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{ground?.name}</h1>
          <p className="text-gray-600 mt-2">
            {new Date(session.startTime).toLocaleDateString('pl-PL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <div className="flex gap-3">
          {!session.endTime && (
            <>
              <Button onClick={() => setShowAddFish(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Dodaj rybę
              </Button>
              <Button onClick={handleEndSession} variant="outline" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Zakończ sesję
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Czas trwania</p>
              <p className="text-lg font-semibold text-gray-900">
                {session.endTime ? '6h 30m' : 'W trakcie...'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <Fish className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Złowione ryby</p>
              <p className="text-lg font-semibold text-gray-900">{session.catches.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Lokalizacja</p>
              <p className="text-lg font-semibold text-gray-900">{ground?.type === 'lake' ? 'Jezioro' : 'Rzeka'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Notes */}
      {session.notes && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Notatki</h3>
          <p className="text-gray-600">{session.notes}</p>
        </Card>
      )}

      {/* Catches List */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Złowione ryby</h3>
        {session.catches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Fish className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Brak złowionych ryb</p>
            <p className="text-sm mt-1">Dodaj pierwszą rybę do tej sesji</p>
          </div>
        ) : (
          <div className="space-y-3">
            {session.catches.map((fish, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Fish className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {mockSpecies.find(s => s.id === fish.speciesId)?.polishName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {fish.length ? `${fish.length} cm` : ''} {fish.weight ? `· ${fish.weight} kg` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {fish.released && (
                    <span className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded">
                      Wypuszczona
                    </span>
                  )}
                  <Camera className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Fish Modal */}
      <Modal isOpen={showAddFish} onClose={() => setShowAddFish(false)} title="Dodaj złowioną rybę">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gatunek *</label>
            <select
              value={newFish.speciesId}
              onChange={(e) => setNewFish({ ...newFish, speciesId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">-- Wybierz gatunek --</option>
              {mockSpecies.map(species => (
                <option key={species.id} value={species.id}>{species.polishName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metoda połowu *</label>
            <select
              value={newFish.methodId}
              onChange={(e) => setNewFish({ ...newFish, methodId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">-- Wybierz metodę --</option>
              {mockMethods.map(method => (
                <option key={method.id} value={method.id}>{method.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Przynęta *</label>
            <select
              value={newFish.baitId}
              onChange={(e) => setNewFish({ ...newFish, baitId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">-- Wybierz przynętę --</option>
              {mockBaits.map(bait => (
                <option key={bait.id} value={bait.id}>{bait.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Długość (cm)</label>
              <input
                type="number"
                value={newFish.length}
                onChange={(e) => setNewFish({ ...newFish, length: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="np. 45"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Waga (kg)</label>
              <input
                type="number"
                step="0.01"
                value={newFish.weight}
                onChange={(e) => setNewFish({ ...newFish, weight: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="np. 2.5"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="released"
              checked={newFish.released}
              onChange={(e) => setNewFish({ ...newFish, released: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="released" className="text-sm font-medium text-gray-700">
              Ryba została wypuszczona
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleAddFish} className="flex-1">
              Dodaj rybę
            </Button>
            <Button variant="outline" onClick={() => setShowAddFish(false)} className="flex-1">
              Anuluj
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
