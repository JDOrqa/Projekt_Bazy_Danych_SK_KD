import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, CreditCard, Save, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { motion } from 'motion/react';

export function Profile() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    licenseNumber: user?.licenseNumber || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateProfile(formData);
      setEditing(false);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await deleteAccount();
      navigate('/login');
    } catch (err) {
      console.error('Failed to delete account', err);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profil użytkownika</h1>
        <p className="text-gray-600">Zarządzaj swoimi danymi osobowymi</p>
      </motion.div>

      {/* Profile Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#2E7D32] to-[#1B5E20] rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </h2>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            {!editing && (
              <Button onClick={() => setEditing(true)}>
                Edytuj profil
              </Button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                  label="Imię"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Nazwisko"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>

              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <Input
                label="Numer licencji PZW (opcjonalnie)"
                name="licenseNumber"
                placeholder="np. PZW/2024/12345"
                value={formData.licenseNumber}
                onChange={handleChange}
              />

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      firstName: user?.firstName || '',
                      lastName: user?.lastName || '',
                      email: user?.email || '',
                      licenseNumber: user?.licenseNumber || ''
                    });
                  }}
                >
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-gray-900">{user?.email}</p>
                </div>
              </div>

              {user?.licenseNumber && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <CreditCard className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Numer licencji PZW</p>
                    <p className="text-gray-900">{user.licenseNumber}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-8 border-red-200">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">Strefa zagrożenia</h3>
              <p className="text-sm text-gray-700 mb-4">
                Usunięcie konta jest nieodwracalne. Wszystkie Twoje dane zostaną trwale usunięte zgodnie z RODO.
              </p>
              <Button
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Usuń konto
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Potwierdź usunięcie konta"
        confirmText="Usuń konto"
        cancelText="Anuluj"
        onConfirm={handleDeleteAccount}
        confirmVariant="danger"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Czy na pewno chcesz usunąć swoje konto? Ta operacja jest <strong>nieodwracalna</strong>.
          </p>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Zostaną usunięte:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-red-700">
              <li>• Wszystkie Twoje łowiska</li>
              <li>• Historia sesji wędkarskich</li>
              <li>• Dane osobowe</li>
              <li>• Statystyki i wykresy</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}
