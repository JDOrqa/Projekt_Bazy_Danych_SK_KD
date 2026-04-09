import { useState } from 'react';
import { Plus, Edit, Trash2, Fish } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { mockSpecies } from '../data/mockData';
import { FishSpecies } from '../types';
import { toast } from 'sonner';

export function Species() {
  const [species, setSpecies] = useState<FishSpecies[]>(mockSpecies);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSpecies, setEditingSpecies] = useState<FishSpecies | null>(null);
  const [formData, setFormData] = useState({
    polishName: '',
    latinName: '',
    description: ''
  });

  const handleSave = () => {
    if (!formData.polishName || !formData.latinName) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    if (editingSpecies) {
      toast.success('Gatunek zaktualizowany!');
    } else {
      toast.success('Gatunek dodany!');
    }

    setShowAddModal(false);
    setEditingSpecies(null);
    setFormData({ polishName: '', latinName: '', description: '' });
  };

  const handleEdit = (s: FishSpecies) => {
    setEditingSpecies(s);
    setFormData({
      polishName: s.polishName,
      latinName: s.latinName,
      description: s.description || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć ten gatunek?')) {
      setSpecies(species.filter(s => s.id !== id));
      toast.success('Gatunek usunięty!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gatunki ryb</h1>
          <p className="text-gray-600 mt-2">Zarządzaj dostępnymi gatunkami w systemie</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Dodaj gatunek
        </Button>
      </div>

      {/* Species Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {species.map((s, index) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Fish className="w-6 h-6 text-white" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(s)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-lg text-gray-900 mb-1">{s.polishName}</h3>
              <p className="text-sm text-gray-500 italic mb-3">{s.latinName}</p>

              {s.description && (
                <p className="text-sm text-gray-600">{s.description}</p>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingSpecies(null);
          setFormData({ polishName: '', latinName: '', description: '' });
        }}
        title={editingSpecies ? 'Edytuj gatunek' : 'Dodaj gatunek'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nazwa polska *</label>
            <input
              type="text"
              value={formData.polishName}
              onChange={(e) => setFormData({ ...formData, polishName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="np. Szczupak"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nazwa łacińska *</label>
            <input
              type="text"
              value={formData.latinName}
              onChange={(e) => setFormData({ ...formData, latinName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="np. Esox lucius"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Opis</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Dodatkowe informacje o gatunku..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              {editingSpecies ? 'Zapisz zmiany' : 'Dodaj gatunek'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setEditingSpecies(null);
                setFormData({ polishName: '', latinName: '', description: '' });
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
