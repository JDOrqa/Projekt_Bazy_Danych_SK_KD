import { useState } from 'react';
import { Users, Shield, FileText, Activity, Database, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/ui/Card';
import { mockRoles } from '../data/mockData';

export function Admin() {
  const [stats] = useState({
    totalUsers: 156,
    activeUsers: 142,
    totalSessions: 1247,
    totalCatches: 4891,
    pendingVerifications: 23,
    systemLogs: 15634
  });

  const statCards = [
    {
      label: 'Użytkownicy',
      value: stats.totalUsers,
      change: '+12',
      icon: Users,
      color: 'from-blue-500 to-blue-600'
    },
    {
      label: 'Aktywni użytkownicy',
      value: stats.activeUsers,
      change: '+8',
      icon: Activity,
      color: 'from-green-500 to-green-600'
    },
    {
      label: 'Sesje połowowe',
      value: stats.totalSessions,
      change: '+34',
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600'
    },
    {
      label: 'Złowione ryby',
      value: stats.totalCatches,
      change: '+127',
      icon: Database,
      color: 'from-orange-500 to-orange-600'
    },
    {
      label: 'Oczekujące weryfikacje',
      value: stats.pendingVerifications,
      change: '-5',
      icon: Shield,
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      label: 'Logi systemowe',
      value: stats.systemLogs,
      change: '+234',
      icon: FileText,
      color: 'from-red-500 to-red-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Panel administratora</h1>
        <p className="text-gray-600 mt-2">Zarządzaj systemem i użytkownikami</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                  <div className="mt-2">
                    <span className={`text-sm font-medium ${
                      stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change} w tym miesiącu
                    </span>
                  </div>
                </div>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Roles Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Zarządzanie rolami</h2>
          <div className="space-y-3">
            {mockRoles.map((role, index) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{role.name}</p>
                    <p className="text-sm text-gray-600">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {index === 0 ? '98' : index === 1 ? '12' : index === 2 ? '8' : '4'} użytkowników
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ostatnie aktywności</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Nowy użytkownik zarejestrowany</p>
                <p className="text-xs text-gray-600">2 minuty temu</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Sesja połowowa zakończona</p>
                <p className="text-xs text-gray-600">15 minut temu</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Zdjęcie oczekuje na weryfikację</p>
                <p className="text-xs text-gray-600">23 minuty temu</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Nowe łowisko dodane</p>
                <p className="text-xs text-gray-600">1 godzinę temu</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
