import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Calendar, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { mockFishingGrounds } from '../data/mockData';
import { toast } from 'sonner';

export function StartSession() {
  const navigate = useNavigate();
  const [selectedGround, setSelectedGround] = useState('');
  const [notes, setNotes] = useState('');
  const [useGPS, setUseGPS] = useState(false);

  const handleStartSession = () => {
    if (!selectedGround) {
      toast.error('Wybierz łowisko');
      return;
    }

    // Mock session start
    toast.success('Sesja połowowa rozpoczęta!');
    setTimeout(() => {
      navigate('/sesje/1'); // Mock session ID
    }, 500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900">Rozpocznij sesję połowową</h1>
        <p className="text-gray-600 mt-2">Zarejestruj nową sesję wędkarską</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="p-6 space-y-6">
          {/* Fishing Ground Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Wybierz łowisko *</span>
              </div>
            </label>
            <select
              value={selectedGround}
              onChange={(e) => setSelectedGround(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Wybierz łowisko --</option>
              {mockFishingGrounds.map(ground => (
                <option key={ground.id} value={ground.id}>
                  {ground.name} ({ground.type === 'lake' ? 'Jezioro' : ground.type === 'river' ? 'Rzeka' : ground.type === 'pond' ? 'Staw' : 'Zalew'})
                </option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Czas rozpoczęcia</span>
              </div>
            </label>
            <input
              type="datetime-local"
              defaultValue={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* GPS */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="useGPS"
              checked={useGPS}
              onChange={(e) => setUseGPS(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="useGPS" className="text-sm font-medium text-gray-700">
              Użyj aktualnej lokalizacji GPS
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Notatki</span>
              </div>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Warunki pogodowe, obserwacje..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleStartSession} className="flex-1">
              Rozpocznij sesję
            </Button>
            <Button variant="outline" onClick={() => navigate('/sesje')} className="flex-1">
              Anuluj
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
