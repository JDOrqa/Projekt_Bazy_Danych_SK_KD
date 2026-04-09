import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, MapPin, Waves } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { mockFishingGrounds } from '../data/mockData';
import { FishingGround } from '../types';
import { motion } from 'motion/react';

export function FishingGrounds() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [grounds] = useState<FishingGround[]>(mockFishingGrounds);

  const filteredGrounds = grounds.filter(ground =>
    ground.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ground.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeLabel = (type: FishingGround['type']) => {
    const labels = {
      rzeka: 'Rzeka',
      jezioro: 'Jezioro',
      staw: 'Staw',
      zalew: 'Zalew',
      kanał: 'Kanał'
    };
    return labels[type];
  };

  const getTypeColor = (type: FishingGround['type']) => {
    const colors = {
      rzeka: 'bg-blue-100 text-blue-700',
      jezioro: 'bg-cyan-100 text-cyan-700',
      staw: 'bg-green-100 text-green-700',
      zalew: 'bg-indigo-100 text-indigo-700',
      kanał: 'bg-purple-100 text-purple-700'
    };
    return colors[type];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Łowiska</h1>
          <p className="text-gray-600">Zarządzaj swoimi ulubionymi miejscami połowu</p>
        </div>
        <Button
          onClick={() => navigate('/lowiska/dodaj')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Dodaj łowisko
        </Button>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Szukaj łowiska po nazwie lub typie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent"
            />
          </div>
        </Card>
      </motion.div>

      {/* Grounds List */}
      {filteredGrounds.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-12 text-center">
            <Waves className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Brak łowisk
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? 'Nie znaleziono łowisk pasujących do wyszukiwania' : 'Dodaj swoje pierwsze łowisko'}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/lowiska/dodaj')}>
                Dodaj łowisko
              </Button>
            )}
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGrounds.map((ground, index) => (
            <motion.div
              key={ground.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <Card
                hover
                onClick={() => navigate(`/lowiska/${ground.id}`)}
                className="p-6 h-full flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                      {ground.name}
                    </h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(ground.type)}`}>
                      {getTypeLabel(ground.type)}
                    </span>
                  </div>
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                </div>

                <div className="space-y-2 mb-4 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Powierzchnia:</span>
                    <span className="font-medium text-gray-900">{ground.area} ha</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Maks. głębokość:</span>
                    <span className="font-medium text-gray-900">{ground.maxDepth} m</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {ground.description}
                </p>

                <div className="text-xs text-gray-500">
                  Dodano: {new Date(ground.createdAt).toLocaleDateString('pl-PL')}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
