import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Calendar, Fish, MapPin, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { mockSessions, mockFishingGrounds } from '../data/mockData';
import { FishingSession } from '../types';

export function Sessions() {
  const navigate = useNavigate();
  const [sessions] = useState<FishingSession[]>(mockSessions);

  const getGroundName = (groundId: string) => {
    return mockFishingGrounds.find(g => g.id === groundId)?.name || 'Nieznane łowisko';
  };

  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'W trakcie...';
    const hours = Math.floor((end.getTime() - start.getTime()) / 1000 / 60 / 60);
    const minutes = Math.floor(((end.getTime() - start.getTime()) / 1000 / 60) % 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sesje połowowe</h1>
          <p className="text-gray-600 mt-2">Zarządzaj swoimi wyjazdami wędkarskimi</p>
        </div>
        <Button onClick={() => navigate('/sesje/rozpocznij')} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Rozpocznij sesję
        </Button>
      </div>

      {/* Sessions List */}
      <div className="grid grid-cols-1 gap-4">
        {sessions.map((session, index) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/sesje/${session.id}`)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Fish className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{getGroundName(session.groundId)}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(session.startTime).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(session.startTime).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(session.startTime, session.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Fish className="w-4 h-4" />
                      <span>{session.catches.length} ryb</span>
                    </div>
                  </div>

                  {session.notes && (
                    <p className="text-sm text-gray-600 mt-3 italic">{session.notes}</p>
                  )}
                </div>

                {!session.endTime && (
                  <div className="ml-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                      Aktywna
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}

        {sessions.length === 0 && (
          <Card className="p-12 text-center">
            <Fish className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Brak sesji połowowych</h3>
            <p className="text-gray-600 mb-4">Rozpocznij swoją pierwszą sesję wędkarską</p>
            <Button onClick={() => navigate('/sesje/rozpocznij')}>Rozpocznij sesję</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
