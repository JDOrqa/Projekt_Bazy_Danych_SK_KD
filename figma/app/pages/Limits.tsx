import { useState } from 'react';
import { Plus, Edit, Trash2, Shield, Ruler, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { mockLimits, mockFishingGrounds, mockSpecies } from '../data/mockData';
import { CatchLimit } from '../types';
import { toast } from 'sonner';

export function Limits() {
  const [limits, setLimits] = useState<CatchLimit[]>(mockLimits);
  const [showModal, setShowModal] = useState(false);
  const [editingLimit, setEditingLimit] = useState<CatchLimit | null>(null);
  const [formData, setFormData] = useState({
    groundId: '',
    speciesId: '',
    minSizeCm: '',
    dailyLimit: '',
    protectionSeasonStart: '',
    protectionSeasonEnd: ''
  });

  const getGroundName = (id: string) => mockFishingGrounds.find(g => g.id === id)?.name || '-';
  const getSpeciesName = (id: string) => mockSpecies.find(s => s.id === id)?.polishName || '-';

  const handleSave = () => {
    if (!formData.groundId || !formData.speciesId) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    toast.success(editingLimit ? 'Limit zaktualizowany!' : 'Limit dodany!');
    setShowModal(false);
    resetForm();
  };

  const handleEdit = (limit: CatchLimit) => {
    setEditingLimit(limit);
    setFormData({
      groundId: limit.groundId,
      speciesId: limit.speciesId,
      minSizeCm: limit.minSizeCm?.toString() || '',
      dailyLimit: limit.dailyLimit?.toString() || '',
      protectionSeasonStart: limit.protectionSeasonStart ?
        new Date(limit.protectionSeasonStart).toISOString().split('T')[0] : '',
      protectionSeasonEnd: limit.protectionSeasonEnd ?
        new Date(limit.protectionSeasonEnd).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć ten limit?')) {
      setLimits(limits.filter(l => l.id !== id));
      toast.success('Limit usunięty!');
    }
  };

  const resetForm = () => {
    setEditingLimit(null);
    setFormData({
      groundId: '',
      speciesId: '',
      minSizeCm: '',
      dailyLimit: '',
      protectionSeasonStart: '',
      protectionSeasonEnd: ''
    });
  };

  const hasProtectionSeason = (limit: CatchLimit) => {
    return limit.protectionSeasonStart && limit.protectionSeasonEnd;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Limity połowowe</h1>
          <p className="text-gray-600 mt-2">Zarządzaj ograniczeniami i okresami ochronnymi</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Dodaj limit
        </Button>
      </div>

      {/* Limits List */}
      <div className="space-y-4">
        {limits.map((limit, index) => (
          <motion.div
            key={limit.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {getSpeciesName(limit.speciesId)}
                      </h3>
                      <p className="text-sm text-gray-600">{getGroundName(limit.groundId)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {limit.minSizeCm && (
                      <div className="flex items-center gap-2 text-sm">
                        <Ruler className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700">Minimalny wymiar:</span>
                        <span className="font-semibold text-gray-900">{limit.minSizeCm} cm</span>
                      </div>
                    )}

                    {limit.dailyLimit && (
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700">Limit dzienny:</span>
                        <span className="font-semibold text-gray-900">{limit.dailyLimit} szt.</span>
                      </div>
                    )}

                    {hasProtectionSeason(limit) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700">Ochrona:</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(limit.protectionSeasonStart!).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
                          {' - '}
                          {new Date(limit.protectionSeasonEnd!).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {hasProtectionSeason(limit) && (
                    <div className="mt-3">
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                        Sezon ochronny
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(limit)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(limit.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}

        {limits.length === 0 && (
          <Card className="p-12 text-center">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Brak limitów połowowych</h3>
            <p className="text-gray-600 mb-4">Dodaj pierwsze ograniczenia połowowe</p>
            <Button onClick={() => setShowModal(true)}>Dodaj limit</Button>
          </Card>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingLimit ? 'Edytuj limit' : 'Dodaj limit połowowy'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Łowisko *</label>
            <select
              value={formData.groundId}
              onChange={(e) => setFormData({ ...formData, groundId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">-- Wybierz łowisko --</option>
              {mockFishingGrounds.map(ground => (
                <option key={ground.id} value={ground.id}>{ground.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gatunek *</label>
            <select
              value={formData.speciesId}
              onChange={(e) => setFormData({ ...formData, speciesId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">-- Wybierz gatunek --</option>
              {mockSpecies.map(species => (
                <option key={species.id} value={species.id}>{species.polishName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimalny wymiar (cm)</label>
              <input
                type="number"
                value={formData.minSizeCm}
                onChange={(e) => setFormData({ ...formData, minSizeCm: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="np. 50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Limit dzienny (szt.)</label>
              <input
                type="number"
                value={formData.dailyLimit}
                onChange={(e) => setFormData({ ...formData, dailyLimit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="np. 3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Początek ochrony</label>
              <input
                type="date"
                value={formData.protectionSeasonStart}
                onChange={(e) => setFormData({ ...formData, protectionSeasonStart: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Koniec ochrony</label>
              <input
                type="date"
                value={formData.protectionSeasonEnd}
                onChange={(e) => setFormData({ ...formData, protectionSeasonEnd: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              {editingLimit ? 'Zapisz zmiany' : 'Dodaj limit'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              className="flex-1"
            >
              Anuluj
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
