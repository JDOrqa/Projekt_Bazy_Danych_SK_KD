import { FishingGround } from '../types';

export const mockStats = {
  totalSessions: 42,
  totalCatches: 156,
  lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  popularSpecies: [
    { name: 'Szczupak', count: 45 },
    { name: 'Sandacz', count: 32 },
    { name: 'Okoń', count: 28 },
    { name: 'Leszcz', count: 25 },
    { name: 'Pstrąg', count: 26 }
  ],
  activityByMonth: [
    { month: 'Sty', sessions: 8 },
    { month: 'Lut', sessions: 6 },
    { month: 'Mar', sessions: 9 },
    { month: 'Kwi', sessions: 12 },
    { month: 'Maj', sessions: 11 },
    { month: 'Cze', sessions: 5 }
  ]
};

export const mockFishingGrounds: FishingGround[] = [
  {
    id: '1',
    name: 'Jezioro Czarnowieckie',
    type: 'lake',
    areaHa: 1250,
    maxDepth: 28,
    description: 'Piękne jezioro w pobliżu Gdańska, idealne do wędrowania na szczupaka i sandacza',
    ownerId: '1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Rzeka Narew',
    type: 'river',
    areaHa: 45,
    maxDepth: 12,
    description: 'Wód rzeki Narew, popularna lokalizacja dla miłośników połowów pstrąga',
    ownerId: '1',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10')
  },
  {
    id: '3',
    name: 'Staw Hubala',
    type: 'pond',
    areaHa: 8,
    maxDepth: 5,
    description: 'Mały staw na terenie Puszczy Białowieskiej, idealne dla początkujących',
    ownerId: '1',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05')
  },
  {
    id: '4',
    name: 'Zalew Włocławski',
    type: 'reservoir',
    areaHa: 2200,
    maxDepth: 15,
    description: 'Wielkie zbiornik retencyjny na Wiśle, znane z obfitych połowów leszcza',
    ownerId: '1',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '5',
    name: 'Kanał Wzmacniający',
    type: 'canal',
    areaHa: 15,
    maxDepth: 3,
    description: 'Kanał w delcie Wisły, znakomite miejsce na amura i karpia',
    ownerId: '1',
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-04-01')
  }
];

