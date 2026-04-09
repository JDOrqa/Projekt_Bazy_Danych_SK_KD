import { useNavigate } from 'react-router';
import { Fish, MapPin, TrendingUp, Calendar, Plus } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { mockStats } from '../data/mockData';
import { motion } from 'motion/react';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    {
      label: 'Sesje wędkarskie',
      value: mockStats.totalSessions,
      icon: Calendar,
      color: 'from-blue-500 to-blue-600'
    },
    {
      label: 'Złowione ryby',
      value: mockStats.totalCatches,
      icon: Fish,
      color: 'from-[#2E7D32] to-[#1B5E20]'
    },
    {
      label: 'Ostatnia aktywność',
      value: new Date(mockStats.lastActivity).toLocaleDateString('pl-PL'),
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      isDate: true
    }
  ];

  const COLORS = ['#2E7D32', '#1976D2', '#FFA726', '#EF5350', '#AB47BC', '#78909C'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Witaj, {user?.firstName}!
        </h1>
        <p className="text-gray-600">Oto przegląd Twojej aktywności wędkarskiej</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                  <p className={`text-3xl font-bold text-gray-900 ${stat.isDate ? 'text-xl' : ''}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Szybkie akcje</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => navigate('/sesje/rozpocznij')}
              className="flex items-center gap-2 bg-gradient-to-r from-[#2E7D32] to-[#1B5E20]"
            >
              <Calendar className="w-4 h-4" />
              Rozpocznij sesję
            </Button>
            <Button
              onClick={() => navigate('/lowiska/dodaj')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Dodaj łowisko
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/lowiska')}
              className="flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Zobacz łowiska
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/weryfikacja')}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Weryfikuj zdjęcia
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Species Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Popularne gatunki</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockStats.popularSpecies}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {mockStats.popularSpecies.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Aktywność w czasie</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockStats.activityByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="sessions" fill="#2E7D32" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
